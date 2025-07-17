const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Institution = require('../models/Institution');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1h' });
};

// @route   POST /api/auth/register
// @desc    Registrar un nuevo usuario (solo administrador)
// @access  Private (Admin only)
router.post('/register', protect, authorize('administrador'), async (req, res) => {
    const { code, password, userType, institutionId, name, lastName, phone, grade, section, course } = req.body;

    try {
        const userExists = await User.findOne({ code });
        if (userExists) {
            return res.status(400).json({ message: 'El código de usuario ya existe' });
        }

        const institution = await Institution.findById(institutionId);
        if (!institution) {
            return res.status(404).json({ message: 'Institución no encontrada' });
        }

        const user = await User.create({
            code,
            password,
            userType,
            institution: institutionId,
            name,
            lastName,
            phone,
            grade,
            section,
            course
        });

        if (user) {
            res.status(201).json({
                _id: user._id,
                code: user.code,
                userType: user.userType,
                institution: user.institution,
                name: user.name,
                lastName: user.lastName,
                phone: user.phone,
                grade: user.grade,
                section: user.section,
                course: user.course
            });
        } else {
            res.status(400).json({ message: 'Datos de usuario inválidos' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   POST /api/auth/login
// @desc    Autenticar usuario y obtener token
// @access  Public
router.post('/login', async (req, res) => {
    const { code, password, institutionId } = req.body;

    try {
        const user = await User.findOne({ code, institution: institutionId });

        if (user && (await user.matchPassword(password))) {
            res.json({
                _id: user._id,
                code: user.code,
                userType: user.userType,
                institution: user.institution,
                name: user.name,
                lastName: user.lastName,
                phone: user.phone,
                grade: user.grade,
                section: user.section,
                course: user.course,
                token: generateToken(user._id)
            });
        } else {
            res.status(401).json({ message: 'Código, contraseña o institución inválidos' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   GET /api/auth/profile
// @desc    Obtener perfil de usuario
// @access  Private
router.get('/profile', protect, async (req, res) => {
    const user = await User.findById(req.user._id).select('-password');
    if (user) {
        res.json(user);
    } else {
        res.status(404).json({ message: 'Usuario no encontrado' });
    }
});

module.exports = router;