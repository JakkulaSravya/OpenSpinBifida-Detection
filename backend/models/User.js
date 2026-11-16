const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['patient', 'doctor'], required: true },
  phone: { type: String, default: '' },
  age: { type: Number },
  // Patient-specific
  gestationalAge: { type: Number },
  trimester: { type: String, enum: ['first', 'second', 'third', ''] },
  // Doctor-specific
  specialization: { type: String, default: '' },
  licenseNumber: { type: String, default: '' },
  hospital: { type: String, default: '' },
  experience: { type: Number, default: 0 },
  rating: { type: Number, default: 4.5 },
  consultationFee: { type: Number, default: 500 },
  verified: { type: Boolean, default: false },
  availableSlots: [{ date: String, time: String, booked: { type: Boolean, default: false } }],
  profileImage: { type: String, default: '' },
  notificationPrefs: {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    inApp: { type: Boolean, default: true }
  },
  createdAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);
