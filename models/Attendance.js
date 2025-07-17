// qori-edu-backend/models/Attendance.js
const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    teacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    institution: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Institution',
        required: true
    },
    course: {
        type: String,
        required: true
    },
    gradeLevel: {
        type: String,
        required: true
    },
    section: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        required: true // La fecha se almacenará con la hora de inicio del día
    },
    status: {
        type: String,
        // ESTE ES EL CAMBIO CLAVE PARA EL BACKEND
        enum: ['Presente', 'Tardanza', 'Falta'], // O ['P', 'T', 'F'] si prefieres los códigos
        required: true
    }
}, {
    timestamps: true
});

// Índice único para evitar asistencias duplicadas para el mismo estudiante, curso, fecha
attendanceSchema.index({ student: 1, course: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);