// models/CommissionAttendance.js
const mongoose = require('mongoose');

const CommissionAttendanceSchema = new mongoose.Schema({
    commission: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Commission',
        required: [true, 'La comisión es obligatoria.']
    },
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'El estudiante es obligatorio.']
    },
    teacher: { // El profesor que registra la asistencia de la comisión
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'El profesor que registra la asistencia es obligatorio.']
    },
    institution: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Institution',
        required: [true, 'La institución es obligatoria.']
    },
    date: {
        type: Date,
        required: [true, 'La fecha de asistencia es obligatoria.']
    },
    status: { // 'Presente', 'Ausente', 'Tardanza', 'Justificado'
        type: String,
        enum: ['Presente', 'Ausente', 'Tardanza', 'Justificado'],
        required: [true, 'El estado de asistencia es obligatorio.']
    }
}, {
    timestamps: true // Añade createdAt y updatedAt
});

// Índice único para asegurar que solo haya una entrada de asistencia por estudiante, comisión y fecha
CommissionAttendanceSchema.index({ student: 1, commission: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('CommissionAttendance', CommissionAttendanceSchema);
