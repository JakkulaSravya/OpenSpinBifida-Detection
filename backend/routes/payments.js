const express = require('express');
const { verifyToken, requireRole } = require('../middleware/auth');
const Appointment = require('../models/Appointment');
const Payment = require('../models/Payment');
const User = require('../models/User');
const router = express.Router();

// Doctor: Request payment from patient
router.post('/request-payment/:appointmentId', verifyToken, requireRole('doctor'), async (req, res) => {
    try {
        const { amount } = req.body;
        const appointment = await Appointment.findOne({
            _id: req.params.appointmentId,
            doctorId: req.user.id,
            status: 'accepted'
        });

        if (!appointment) {
            return res.status(404).json({ error: 'Appointment not found or not in accepted status.' });
        }

        const paymentAmount = amount || (await User.findById(req.user.id))?.consultationFee || 500;

        appointment.status = 'payment_requested';
        appointment.paymentAmount = paymentAmount;
        appointment.paymentStatus = 'requested';
        appointment.paymentRequestedAt = new Date();
        await appointment.save();

        await Payment.create({
            appointmentId: appointment._id,
            patientId: appointment.patientId,
            doctorId: req.user.id,
            amount: paymentAmount,
            status: 'pending'
        });

        const updated = await Appointment.findById(appointment._id)
            .populate('patientId', 'name email');

        res.json({ success: true, appointment: updated });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Patient: Get payment details for an appointment
router.get('/details/:appointmentId', verifyToken, async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.appointmentId)
            .populate('doctorId', 'name specialization hospital consultationFee')
            .populate('patientId', 'name email');

        if (!appointment) {
            return res.status(404).json({ error: 'Appointment not found.' });
        }

        if (appointment.patientId._id.toString() !== req.user.id &&
            appointment.doctorId._id.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized.' });
        }

        const payment = await Payment.findOne({ appointmentId: appointment._id })
            .sort({ createdAt: -1 });

        res.json({ appointment, payment });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Patient: Confirm payment (after scanning QR and paying)
router.post('/confirm-payment/:appointmentId', verifyToken, requireRole('patient'), async (req, res) => {
    try {
        const { transactionId } = req.body;

        const appointment = await Appointment.findOne({
            _id: req.params.appointmentId,
            patientId: req.user.id,
            status: 'payment_requested'
        });

        if (!appointment) {
            return res.status(404).json({ error: 'Appointment not found or payment not requested.' });
        }

        const paymentId = transactionId || ('TXN_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8).toUpperCase());

        appointment.status = 'paid';
        appointment.paymentStatus = 'paid';
        appointment.paidAt = new Date();
        await appointment.save();

        await Payment.findOneAndUpdate(
            { appointmentId: appointment._id, status: 'pending' },
            {
                status: 'completed',
                razorpayPaymentId: paymentId,
                paidAt: new Date()
            }
        );

        res.json({
            success: true,
            message: 'Payment confirmed successfully.',
            transactionId: paymentId
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Patient: Request refund
router.post('/refund/:appointmentId', verifyToken, requireRole('patient'), async (req, res) => {
    try {
        const appointment = await Appointment.findOne({
            _id: req.params.appointmentId,
            patientId: req.user.id,
            status: 'paid'
        });

        if (!appointment) {
            return res.status(404).json({ error: 'Appointment not found or not eligible for refund.' });
        }

        const appointmentDateTime = new Date(`${appointment.date}T00:00:00`);
        const now = new Date();
        const hoursUntilAppointment = (appointmentDateTime - now) / (1000 * 60 * 60);

        if (hoursUntilAppointment < 24) {
            return res.status(400).json({
                error: 'Refund not available. Cancellations must be made at least 24 hours before the appointment.',
                refundEligible: false
            });
        }

        const payment = await Payment.findOne({
            appointmentId: appointment._id,
            status: 'completed'
        });

        if (payment) {
            payment.status = 'refunded';
            payment.refundReason = 'Cancelled by patient (>24 hours before appointment)';
            payment.refundedAt = new Date();
            await payment.save();
        }

        appointment.status = 'cancelled';
        appointment.paymentStatus = 'refunded';
        await appointment.save();

        res.json({ success: true, message: 'Full refund processed. Appointment cancelled.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
