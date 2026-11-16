const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true },
    timeSlot: { type: String, required: true },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected', 'payment_requested', 'paid', 'confirmed', 'completed', 'cancelled'],
        default: 'pending'
    },
    riskLevel: { type: String },
    applicationForm: {
        pregnancyHistory: { type: String, default: '' },
        symptoms: { type: String, default: '' },
        previousReports: { type: String, default: '' },
        consentAI: { type: Boolean, default: false },
        medicalRecords: { type: String, default: '' },
        additionalNotes: { type: String, default: '' }
    },
    doctorNotes: { type: String, default: '' },
    diagnosisNotes: { type: String, default: '' },
    // Payment fields
    paymentAmount: { type: Number },
    paymentStatus: { type: String, enum: ['none', 'requested', 'paid', 'refunded'], default: 'none' },
    paymentRequestedAt: { type: Date },
    paidAt: { type: Date },
    razorpayOrderId: { type: String },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Appointment', appointmentSchema);

