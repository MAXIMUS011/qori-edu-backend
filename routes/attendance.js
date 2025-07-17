const express = require('express');
const Attendance = require('../models/Attendance');
const User = require('../models/User'); // Necesario para popular la información del estudiante
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// @route   POST /api/attendance
// @desc    Registrar asistencia (solo profesor)
// @access  Private (Professor only)
router.post('/', protect, authorize('profesor'), async (req, res) => {
    const { studentsAttendance, date, course } = req.body; // studentsAttendance es un array de { studentId, status }

    try {
        const attendanceRecords = studentsAttendance.map(sa => ({
            student: sa.studentId,
            teacher: req.user._id,
            institution: req.user.institution,
            date: new Date(date),
            course,
            // Aquí puedes añadir grade y section si los pasas desde el frontend,
            // pero el modelo de Attendance no los tiene directamente como required
            // para evitar redundancia si ya están en el modelo User del estudiante.
            status: sa.status
        }));

        // Usar insertMany para guardar múltiples registros de asistencia de una vez
        const result = await Attendance.insertMany(attendanceRecords);
        res.status(201).json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// @route   GET /api/attendance/teacher
// @desc    Obtener asistencia registrada por el profesor (profesor)
// @access  Private (Professor only)
router.get('/teacher', protect, authorize('profesor'), async (req, res) => {
    const { date, course, grade, section } = req.query;
    try {
        let query = {
            teacher: req.user._id,
            institution: req.user.institution,
        };
        if (date) query.date = new Date(date);
        if (course) query.course = course;

        // Para filtrar por grado/sección aquí, deberías obtener los IDs de los estudiantes
        // que cumplen con esos criterios y luego usar $in para filtrarlos.
        // Esto puede ser más complejo si no hay una relación directa en Attendance.
        // Por ahora, solo se filtra por lo que el profesor registró y su institución.
        const attendance = await Attendance.find(query)
            .populate('student', 'name lastName code grade section'); // Popula la información del estudiante
        res.json(attendance);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


// @route   GET /api/attendance/student
// @desc    Obtener registro de asistencia del estudiante (estudiante)
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
            // Para asegurar que la fecha sea exactamente la del día
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);
            query.date = { $gte: startOfDay, $lte: endOfDay };
        }

        const attendance = await Attendance.find(query).populate('teacher', 'name lastName');
        res.json(attendance);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;