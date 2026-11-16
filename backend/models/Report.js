const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    patientName: { type: String, default: '' },
    imageUrl: { type: String },
    // ML Analysis Results
    bsValue: { type: Number },
    bsobValue: { type: Number },
    bsRatio: { type: Number },
    riskScore: { type: Number },
    riskLevel: { type: String, enum: ['Low', 'Moderate', 'High'] },
    classification: { type: String, enum: ['Normal', 'Open Spina Bifida Detected'] },
    // CNN Prediction
    cnnPrediction: { type: String, enum: ['Mild OSB', 'Moderate OSB', 'Severe OSB', 'N/A'] },
    confidence: { type: Number },
    cnnProbabilities: {
        'Mild OSB': { type: Number },
        'Moderate OSB': { type: Number },
        'Severe OSB': { type: Number }
    },
    // Ratio vs CNN agreement
    ratioClassification: { type: String },
    agreement: { type: Boolean },
    agreementNote: { type: String },
    clinicalFinding: { type: String },
    // Actions
    recommendations: [String],
    futureOutcomes: [String],
    pdfUrl: { type: String },
    processingSteps: [{
        step: String,
        status: String,
        detail: String,
        value: mongoose.Schema.Types.Mixed
    }],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Report', reportSchema);
