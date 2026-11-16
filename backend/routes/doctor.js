const express = require('express');
const { verifyToken, requireRole } = require('../middleware/auth');
const Appointment = require('../models/Appointment');
const Report = require('../models/Report');
const User = require('../models/User');
const router = express.Router();

// Get consultation requests (with patient reports for confirmed appointments)
router.get('/consultations', verifyToken, requireRole('doctor'), async (req, res) => {
    try {
        const appointments = await Appointment.find({ doctorId: req.user.id })
            .populate('patientId', 'name email age gestationalAge trimester')
            .sort({ createdAt: -1 });

        // For confirmed/paid/completed appointments, attach the patient's latest report
        const confirmedStatuses = ['confirmed', 'paid', 'completed'];
        const confirmedAppts = appointments.filter(a => confirmedStatuses.includes(a.status));
        const patientIds = [...new Set(confirmedAppts.map(a => a.patientId?._id?.toString()).filter(Boolean))];

        let reportMap = {};
        if (patientIds.length > 0) {
            const reports = await Report.find({ patientId: { $in: patientIds } })
                .sort({ createdAt: -1 });
            // Keep latest report per patient
            reports.forEach(r => {
                const pid = r.patientId.toString();
                if (!reportMap[pid]) reportMap[pid] = r;
            });
        }

        // Attach report to each appointment as JSON
        const result = appointments.map(a => {
            const obj = a.toObject();
            const pid = a.patientId?._id?.toString();
            if (pid && confirmedStatuses.includes(a.status) && reportMap[pid]) {
                obj.patientReport = reportMap[pid];
            }
            return obj;
        });

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update consultation status (accept/reject)
router.put('/consultation/:id', verifyToken, requireRole('doctor'), async (req, res) => {
    try {
        const { status, doctorNotes, diagnosisNotes } = req.body;
        const appointment = await Appointment.findOneAndUpdate(
            { _id: req.params.id, doctorId: req.user.id },
            { status, doctorNotes, diagnosisNotes },
            { new: true }
        ).populate('patientId', 'name email');
        if (!appointment) return res.status(404).json({ error: 'Consultation not found.' });
        res.json(appointment);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add/update schedule slots
router.post('/schedule', verifyToken, requireRole('doctor'), async (req, res) => {
    try {
        const { slots } = req.body; // [{ date, time }]
        const doctor = await User.findById(req.user.id);
        if (slots && Array.isArray(slots)) {
            slots.forEach(slot => {
                const exists = doctor.availableSlots.find(s => s.date === slot.date && s.time === slot.time);
                if (!exists) {
                    doctor.availableSlots.push({ date: slot.date, time: slot.time, booked: false });
                }
            });
            await doctor.save();
        }
        res.json({ success: true, slots: doctor.availableSlots });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get schedule
router.get('/schedule', verifyToken, requireRole('doctor'), async (req, res) => {
    try {
        const doctor = await User.findById(req.user.id);
        const appointments = await Appointment.find({
            doctorId: req.user.id,
            status: { $in: ['pending', 'accepted', 'payment_requested', 'paid', 'confirmed', 'completed'] }
        }).populate('patientId', 'name');

        // Cross-reference: mark slots as booked if there's an active appointment for that date+time
        const bookedSet = new Set();
        appointments.forEach(a => {
            if (['accepted', 'payment_requested', 'paid', 'confirmed', 'completed'].includes(a.status)) {
                bookedSet.add(`${a.date}|${a.timeSlot}`);
            }
        });

        const slotsWithStatus = (doctor.availableSlots || []).map(s => ({
            date: s.date,
            time: s.time,
            booked: bookedSet.has(`${s.date}|${s.time}`)
        }));

        res.json({ slots: slotsWithStatus, appointments });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Remove schedule slot
router.delete('/schedule/:date/:time', verifyToken, requireRole('doctor'), async (req, res) => {
    try {
        const doctor = await User.findById(req.user.id);
        doctor.availableSlots = doctor.availableSlots.filter(
            s => !(s.date === req.params.date && s.time === req.params.time)
        );
        await doctor.save();
        res.json({ success: true, slots: doctor.availableSlots });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get case history (all completed or accepted)
router.get('/cases', verifyToken, requireRole('doctor'), async (req, res) => {
    try {
        const appointments = await Appointment.find({
            doctorId: req.user.id,
            status: { $in: ['accepted', 'completed'] }
        }).populate('patientId', 'name email age gestationalAge trimester');

        // Also get reports for these patients
        const patientIds = [...new Set(appointments.map(a => a.patientId?._id?.toString()))];
        const reports = await Report.find({ patientId: { $in: patientIds } }).sort({ createdAt: -1 });

        res.json({ cases: appointments, reports });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add case notes
router.post('/case-notes/:id', verifyToken, requireRole('doctor'), async (req, res) => {
    try {
        const { diagnosisNotes } = req.body;
        const appointment = await Appointment.findOneAndUpdate(
            { _id: req.params.id, doctorId: req.user.id },
            { diagnosisNotes, status: 'completed' },
            { new: true }
        );
        res.json(appointment);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update doctor settings
router.put('/settings', verifyToken, requireRole('doctor'), async (req, res) => {
    try {
        const { name, phone, specialization, hospital, experience, consultationFee, notificationPrefs } = req.body;
        const user = await User.findByIdAndUpdate(req.user.id, {
            name, phone, specialization, hospital, experience, consultationFee, notificationPrefs
        }, { new: true }).select('-password');
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Doctor: Confirm appointment after payment is done
router.put('/confirm-appointment/:id', verifyToken, requireRole('doctor'), async (req, res) => {
    try {
        const appointment = await Appointment.findOneAndUpdate(
            { _id: req.params.id, doctorId: req.user.id, status: 'paid' },
            { status: 'confirmed' },
            { new: true }
        ).populate('patientId', 'name email');

        if (!appointment) {
            return res.status(404).json({ error: 'Appointment not found or payment not completed yet.' });
        }
        res.json({ success: true, appointment });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
