const express = require('express');
const Grade = require('../models/Grade');
const User = require('../models/User'); // Necesario para popular información del estudiante
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// @route   POST /api/grades
// @desc    Registrar nota (solo profesor)
// @access  Private (Professor only)
router.post('/', protect, authorize('profesor'), async (req, res) => {
    const { studentId, date, course, gradeValue } = req.body;

    try {
        const grade = await Grade.create({
            student: studentId,
            teacher: req.user._id,
            institution: req.user.institution,
            date: new Date(date),
            course,
            grade: gradeValue
        });
        res.status(201).json(grade);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// @route   GET /api/grades/teacher
// @desc    Obtener notas registradas por el profesor (profesor)
// @access  Private (Professor only)
router.get('/teacher', protect, authorize('profesor'), async (req, res) => {
    const { course, grade, section } = req.query; // Puedes filtrar por estos
    try {
        let query = {
            teacher: req.user._id,
            institution: req.user.institution
        };
        if (course) query.course = course;

        // Para filtrar por grado/sección, necesitarías obtener los IDs de los estudiantes
        // que cumplen con esos criterios y luego usar $in para filtrarlos.
        // Esto sería más complejo si no hay una relación directa en Grade.
        // Por ahora, solo se filtra por lo que el profesor registró y su institución.
        const grades = await Grade.find(query)
            .populate('student', 'name lastName code grade section'); // Popula la información del estudiante
        res.json(grades);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


// @route   GET /api/grades/student
// @desc    Obtener notas del estudiante (estudiante)
// @access  Private (Student only)
router.get('/student', protect, authorize('estudiante'), async (req, res) => {
    const { course, date } = req.query; // Filtrar por curso y/o fecha
    try {
        let query = {
            student: req.user._id,
            institution: req.user.institution
        };
        if (course) query.course = course;
        if (date) {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);
            query.date = { $gte: startOfDay, $lte: endOfDay };
        }

        const grades = await Grade.find(query).populate('teacher', 'name lastName');
        res.json(grades);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   GET /api/grades/teacher/students-in-grade-section
// @desc    Obtener lista de estudiantes por grado y sección para el profesor
// @access  Private (Professor only)
router.get('/teacher/students-in-grade-section', protect, authorize('profesor'), async (req, res) => {
    const { grade, section } = req.query;
    if (!grade || !section) {
        return res.status(400).json({ message: 'Se requiere grado y sección.' });
    }
    try {
        const students = await User.find({
            userType: 'estudiante',
            institution: req.user.institution,
            grade: grade,
            section: section
        }).select('name lastName code'); // Solo los campos necesarios
        res.json(students);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;