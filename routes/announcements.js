const express = require('express');
const Announcement = require('../models/Announcement');
const User = require('../models/User'); // Necesario para populate si se requiere más info del estudiante
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// @route   POST /api/announcements
// @desc    Crear un nuevo aviso (solo profesor)
// @access  Private (Professor only)
router.post('/', protect, authorize('profesor'), async (req, res) => {
    const { date, name, lastName, phone, grade, section, targetAudience, targetStudent, subject, message } = req.body;

    try {
        const announcement = await Announcement.create({
            teacher: req.user._id, // El profesor que está logueado
            institution: req.user.institution, // La institución del profesor
            date,
            name,
            lastName,
            phone,
            grade,
            section,
            targetAudience,
            targetStudent: targetStudent || null, // Si es para un solo alumno
            subject,
            message
        });
        res.status(201).json(announcement);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// @route   GET /api/announcements/teacher
// @desc    Obtener avisos creados por el profesor (profesor)
// @access  Private (Professor only)
router.get('/teacher', protect, authorize('profesor'), async (req, res) => {
    try {
        const announcements = await Announcement.find({ teacher: req.user._id, institution: req.user.institution })
            .populate('targetStudent', 'name lastName code'); // Cargar info del estudiante si es específico
        res.json(announcements);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   GET /api/announcements/student
// @desc    Obtener avisos para el estudiante (estudiante)
// @access  Private (Student only)
router.get('/student', protect, authorize('estudiante'), async (req, res) => {
    try {
        const announcements = await Announcement.find({
            institution: req.user.institution,
            $or: [
                { targetAudience: 'all_students', grade: req.user.grade, section: req.user.section },
                { targetAudience: 'single_student', targetStudent: req.user._id }
            ]
        }).populate('teacher', 'name lastName'); // Cargar info del profesor
        res.json(announcements);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;