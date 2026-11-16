/**
 * routes/ai.js  —  Real ML Analysis via predict.py
 * Calls predict.py — same pipeline as the Colab notebook (BSoBNet + U-Net + PDF report).
 * Returns the same JSON shape the frontend already reads.
 */

const express    = require('express');
const multer     = require('multer');
const path       = require('path');
const fs         = require('fs');
const { spawn }  = require('child_process');
const { v4: uuidv4 } = require('uuid');
const { verifyToken } = require('../middleware/auth');
const Report     = require('../models/Report');
const User       = require('../models/User');
const router     = express.Router();

/** Ratio/CNN agreement text from predict.py → boolean for DB (note kept in agreementNote). */
function agreementTextToBoolean(note) {
    if (!note || typeof note !== 'string') return true;
    if (note.includes('disagreement') || note.toLowerCase().includes('clinical review advised')) {
        return false;
    }
    return true;
}

// ── Multer ────────────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '..', 'uploads');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

// ── Run predict.py and return parsed JSON ─────────────────────────────────────
function runPrediction(imagePath, patientInfo, pdfFilename) {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(__dirname, '..', 'predict.py');
        const patientJson = JSON.stringify(patientInfo);

        const py = spawn('python3', [scriptPath, imagePath, patientJson, pdfFilename]);

        let stdout = '';
        let stderr = '';

        py.stdout.on('data', d => { stdout += d.toString(); });
        py.stderr.on('data', d => { stderr += d.toString(); });

        py.on('close', code => {
            if (code !== 0) {
                console.error('predict.py stderr:', stderr);
                return reject(new Error(stderr || 'predict.py exited with code ' + code));
            }
            try {
                const result = JSON.parse(stdout.trim());
                if (result.error) return reject(new Error(result.error));
                resolve(result);
            } catch (e) {
                reject(new Error('Failed to parse predict.py output: ' + stdout));
            }
        });

        py.on('error', err => reject(new Error('Could not start predict.py: ' + err.message)));
    });
}

// ── POST /ai/upload-analysis ──────────────────────────────────────────────────
router.post('/upload-analysis', verifyToken, upload.fields([
    { name: 'ultrasoundImage', maxCount: 1 }
]), async (req, res) => {
    try {
        // ── Get uploaded image ────────────────────────────────────────────────
        if (!req.files?.ultrasoundImage?.[0]) {
            return res.status(400).json({ error: 'No image uploaded.' });
        }
        const imgFile    = req.files.ultrasoundImage[0];
        const imagePath  = imgFile.path;
        const imageUrl   = `/uploads/${imgFile.filename}`;

        // ── Get patient info: signup/profile first, optional form overrides ─────
        const patient = await User.findById(req.user.id);
        const trimesterLabel = (t) => {
            const m = { first: '1st Trimester', second: '2nd Trimester', third: '3rd Trimester' };
            return m[String(t || '').toLowerCase()] || (t ? String(t) : '');
        };
        const patientInfo = {
            name         : patient?.name || req.body.patientName || 'Anonymous',
            id           : patient?._id ? String(patient._id) : 'N/A',
            age          : req.body.age != null && req.body.age !== ''
                ? String(req.body.age)
                : (patient?.age != null ? String(patient.age) : 'Not Provided'),
            gestAge      : req.body.gestAge != null && req.body.gestAge !== ''
                ? String(req.body.gestAge)
                : (patient?.gestationalAge != null ? String(patient.gestationalAge) : 'Not Provided'),
            trimester    : req.body.trimester && String(req.body.trimester).length
                ? String(req.body.trimester)
                : (trimesterLabel(patient?.trimester) || 'Not Provided'),
            referringDoc : req.body.referringDoc || 'Not Provided',
            hospital     : req.body.hospital || patient?.hospital || 'Not Provided',
            scanDate     : req.body.scanDate || new Date().toLocaleDateString('en-GB'),
            phone        : patient?.phone || '',
        };

        // ── PDF filename ──────────────────────────────────────────────────────
        const stamp      = new Date().toISOString().replace(/[:.]/g, '-');
        const pdfFilename= `report-${patient?._id || uuidv4()}-${stamp}.pdf`;

        // ── Run real ML prediction ────────────────────────────────────────────
        console.log(`[AI] Running predict.py on ${imagePath}`);
        const ml = await runPrediction(imagePath, patientInfo, pdfFilename);
        console.log(`[AI] predict.py done — label: ${ml.label}`);

        // ── Map ml output → legacy field names the frontend reads ─────────────
        // The existing AIProcessing.jsx reads:
        //   result.classification, result.riskLevel, result.riskScore,
        //   result.bsValue, result.bsobValue, result.bsRatio,
        //   result.cnnPrediction, result.confidence, result.cnnProbabilities,
        //   result.ratioClassification, result.agreement, result.agreementNote,
        //   result.clinicalFinding, result.recommendations, result.futureOutcomes,
        //   result.processingSteps, result.pdfUrl
        // Must match Report schema enum: 'Normal' | 'Open Spina Bifida Detected'
        const classification = ml.isNormal ? 'Normal' : 'Open Spina Bifida Detected';
        const riskLevel      = ml.isNormal ? 'Low'
                             : ml.severity === 'Severe'   ? 'High'
                             : ml.severity === 'Moderate' ? 'Moderate' : 'Low';
        // Deterministic score from model outputs (no random values)
        const riskScore = ml.isNormal
            ? Math.max(0, Math.min(25, Math.round((1 - Math.min(ml.ratio, 1)) * 25)))
            : Math.max(
                30,
                Math.min(99, Math.round((ml.confidence != null ? ml.confidence : 50) + (ml.ratio - 1) * 35))
              );

        const pdfUrl         = `/uploads/${pdfFilename}`;

        const cnnPredictionDb = ml.isNormal || !ml.cnnPrediction
            ? 'N/A'
            : ml.cnnPrediction;
        const agreementBool = agreementTextToBoolean(ml.agreement);

        // ── Save to DB ────────────────────────────────────────────────────────
        const report = new Report({
            patientId        : req.user.id,
            patientName      : patientInfo.name,
            imageUrl,
            bsValue          : ml.BS_px    || 0,
            bsobValue        : ml.BSOB_px  || 0,
            bsRatio          : ml.ratio,
            riskScore,
            riskLevel,
            classification,
            cnnPrediction    : cnnPredictionDb,
            confidence       : ml.confidence != null ? ml.confidence : 0,
            cnnProbabilities : ml.cnnProbabilities || {},
            ratioClassification: ml.isNormal ? 'Normal' : (ml.ratio < 1.3 ? 'Mild OSB' : ml.ratio < 1.6 ? 'Moderate OSB' : 'Severe OSB'),
            agreement        : agreementBool,
            agreementNote    : ml.agreement || '',
            clinicalFinding  : ml.clinicalFinding,
            recommendations  : ml.actions  || [],
            futureOutcomes   : ml.consequences || [],
            processingSteps  : [
                { step: 'Image Upload & Validation',    status: 'completed', detail: 'Fetal ultrasound image verified' },
                { step: 'Preprocessing (CLAHE + Denoise)', status: 'completed', detail: 'Contrast enhancement + noise reduction applied' },
                { step: 'U-Net Landmark Detection',     status: 'completed', detail: ml.landmarkDetected
                    ? `Midbrain conf ${(ml.mb_conf*100).toFixed(0)}%, CM conf ${(ml.cm_conf*100).toFixed(0)}%`
                    : 'Low confidence — fallback ratio used' },
                { step: 'BS/BSOB Ratio',                status: 'completed', detail: `Ratio: ${ml.ratio} → ${ml.isNormal ? 'Normal' : ml.severity + ' OSB'}`, value: ml.ratio },
                { step: 'Grad-CAM Attention Map',       status: 'completed', detail: 'Attention overlay generated for clinician review' },
                { step: 'CNN Classification',           status: 'completed', detail: ml.cnnPrediction ? `${ml.cnnPrediction} (${ml.confidence}% confidence)` : 'N/A — Normal by ratio' },
                { step: 'PDF Report Generation',        status: 'completed', detail: 'Clinical report generated with all visualisations' },
            ],
            pdfUrl,
        });
        await report.save();

        // ── Respond ───────────────────────────────────────────────────────────
        res.json({
            success: true,
            report: {
                id               : report._id,
                // Real model outputs
                label            : ml.label,
                severity         : ml.severity,
                isNormal         : ml.isNormal,
                ratio            : ml.ratio,
                BS_px            : ml.BS_px,
                BSOB_px          : ml.BSOB_px,
                mb_conf          : ml.mb_conf,
                cm_conf          : ml.cm_conf,
                landmarkDetected : ml.landmarkDetected,
                color            : ml.color,
                causes           : ml.causes,
                consequences     : ml.consequences,
                prognosis        : ml.prognosis,
                // Legacy field names (AIProcessing.jsx uses these)
                classification,
                riskLevel,
                riskScore,
                bsValue          : ml.BS_px    || 0,
                bsobValue        : ml.BSOB_px  || 0,
                bsRatio          : ml.ratio,
                cnnPrediction    : ml.cnnPrediction,
                confidence       : ml.confidence,
                cnnProbabilities : ml.cnnProbabilities,
                ratioClassification: ml.isNormal ? 'Normal' : (ml.ratio < 1.3 ? 'Mild OSB' : ml.ratio < 1.6 ? 'Moderate OSB' : 'Severe OSB'),
                agreement        : ml.agreement,
                agreementNote    : ml.agreement,
                clinicalFinding  : ml.clinicalFinding,
                recommendations  : ml.actions  || [],
                futureOutcomes   : ml.consequences || [],
                processingSteps  : report.processingSteps,
                pdfUrl,
            }
        });

    } catch (err) {
        console.error('[AI] Error:', err);
        res.status(500).json({ error: 'Analysis failed: ' + err.message });
    }
});

module.exports = router;
