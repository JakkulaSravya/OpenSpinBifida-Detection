const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

// Register
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role, phone, age, gestationalAge, trimester,
            specialization, licenseNumber, hospital, experience, consultationFee } = req.body;

        const existing = await User.findOne({ email });
        if (existing) return res.status(400).json({ error: 'Email already registered.' });

        const user = new User({
            name, email, password, role,
            phone: phone || '',
            age: age || null,
            gestationalAge: role === 'patient' ? gestationalAge : undefined,
            trimester: role === 'patient' ? trimester : undefined,
            specialization: role === 'doctor' ? specialization : undefined,
            licenseNumber: role === 'doctor' ? licenseNumber : undefined,
            hospital: role === 'doctor' ? hospital : undefined,
            experience: role === 'doctor' ? (experience || 0) : undefined,
            consultationFee: role === 'doctor' ? (consultationFee || 500) : undefined,
            verified: role === 'doctor' ? false : true
        });

        await user.save();

        const token = jwt.sign(
            { id: user._id, email: user.email, role: user.role, name: user.name },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            token,
            user: {
                id: user._id, name: user.name, email: user.email,
                role: user.role, phone: user.phone, age: user.age,
                gestationalAge: user.gestationalAge, trimester: user.trimester,
                specialization: user.specialization, hospital: user.hospital,
                experience: user.experience
            }
        });
    } catch (err) {
        res.status(500).json({ error: 'Registration failed: ' + err.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password, role } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: 'Invalid credentials.' });
        if (user.role !== role) return res.status(400).json({ error: `This account is registered as a ${user.role}.` });

        const valid = await user.comparePassword(password);
        if (!valid) return res.status(400).json({ error: 'Invalid credentials.' });

        const token = jwt.sign(
            { id: user._id, email: user.email, role: user.role, name: user.name },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: {
                id: user._id, name: user.name, email: user.email,
                role: user.role, phone: user.phone, age: user.age,
                gestationalAge: user.gestationalAge, trimester: user.trimester,
                specialization: user.specialization, hospital: user.hospital,
                experience: user.experience, rating: user.rating
            }
        });
    } catch (err) {
        res.status(500).json({ error: 'Login failed: ' + err.message });
    }
});

module.exports = router;
