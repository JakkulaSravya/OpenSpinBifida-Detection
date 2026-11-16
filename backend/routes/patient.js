const express = require('express');
const { verifyToken, requireRole } = require('../middleware/auth');
const Report = require('../models/Report');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const router = express.Router();

// Get patient reports
router.get('/reports', verifyToken, requireRole('patient'), async (req, res) => {
    try {
        const reports = await Report.find({ patientId: req.user.id }).sort({ createdAt: -1 });
        res.json(reports);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get available doctors
router.get('/doctors', verifyToken, requireRole('patient'), async (req, res) => {
    try {
        const doctors = await User.find({ role: 'doctor' })
            .select('-password')
            .sort({ rating: -1, experience: -1 });

        // If no doctors in DB, return seed data
        if (doctors.length === 0) {
            return res.json([
                { _id: 'demo1', name: 'Dr. Sarah Johnson', specialization: 'Fetal Medicine Specialist', hospital: 'City Medical Center', experience: 15, rating: 4.9, consultationFee: 800, email: 'sarah.j@hospital.com' },
                { _id: 'demo2', name: 'Dr. James Chen', specialization: 'Pediatric Neurosurgeon', hospital: 'University Hospital', experience: 12, rating: 4.8, consultationFee: 1000, email: 'james.c@hospital.com' },
                { _id: 'demo3', name: 'Dr. Priya Sharma', specialization: 'Obstetrician & Gynecologist', hospital: 'Women\'s Health Clinic', experience: 10, rating: 4.7, consultationFee: 600, email: 'priya.s@hospital.com' },
                { _id: 'demo4', name: 'Dr. Michael Roberts', specialization: 'Genetic Counselor', hospital: 'Genomics Institute', experience: 8, rating: 4.6, consultationFee: 700, email: 'michael.r@hospital.com' },
                { _id: 'demo5', name: 'Dr. Anika Patel', specialization: 'Fetal Medicine Specialist', hospital: 'Maternal Care Hospital', experience: 18, rating: 4.9, consultationFee: 900, email: 'anika.p@hospital.com' }
            ]);
        }
        res.json(doctors);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get doctor's available slots for booking
router.get('/doctor-slots/:doctorId', verifyToken, requireRole('patient'), async (req, res) => {
    try {
        const doctor = await User.findById(req.params.doctorId);
        if (!doctor || doctor.role !== 'doctor') return res.status(404).json({ error: 'Doctor not found' });

        // Get all active appointments for this doctor to determine booked slots
        const activeAppointments = await Appointment.find({
            doctorId: req.params.doctorId,
            status: { $in: ['pending', 'accepted', 'payment_requested', 'paid', 'confirmed'] }
        });

        const bookedSet = new Set();
        activeAppointments.forEach(a => bookedSet.add(`${a.date}|${a.timeSlot}`));

        // Return only unbooked slots
        const availableSlots = (doctor.availableSlots || [])
            .filter(s => !bookedSet.has(`${s.date}|${s.time}`))
            .map(s => ({ date: s.date, time: s.time }));

        res.json(availableSlots);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Book appointment
router.post('/book-appointment', verifyToken, requireRole('patient'), async (req, res) => {
    try {
        const { doctorId, date, timeSlot, riskLevel, applicationForm } = req.body;

        // Check if the slot is already booked
        const existingBooking = await Appointment.findOne({
            doctorId,
            date,
            timeSlot,
            status: { $in: ['pending', 'accepted', 'payment_requested', 'paid', 'confirmed'] }
        });
        if (existingBooking) {
            return res.status(409).json({ error: 'This time slot is already booked. Please select another slot.' });
        }

        const appointment = new Appointment({
            patientId: req.user.id,
            doctorId,
            date,
            timeSlot,
            riskLevel,
            applicationForm: applicationForm || {},
            status: 'pending'
        });
        await appointment.save();
        res.status(201).json({ success: true, appointment });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get patient appointments
router.get('/appointments', verifyToken, requireRole('patient'), async (req, res) => {
    try {
        const appointments = await Appointment.find({ patientId: req.user.id })
            .populate('doctorId', 'name specialization hospital')
            .sort({ createdAt: -1 });
        res.json(appointments);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update patient settings
router.put('/settings', verifyToken, requireRole('patient'), async (req, res) => {
    try {
        const { name, phone, age, gestationalAge, trimester, notificationPrefs } = req.body;
        const user = await User.findByIdAndUpdate(req.user.id, {
            name, phone, age, gestationalAge, trimester, notificationPrefs
        }, { new: true }).select('-password');
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
