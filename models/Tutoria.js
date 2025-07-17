// models/Tutoria.js
const mongoose = require('mongoose');

const TutoriaSchema = new mongoose.Schema({
    teacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'El tutor (profesor) es obligatorio.']
    },
    institution: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Institution',
        required: [true, 'La institución es obligatoria.']
    },
    gradeLevel: {
        type: String,
        required: [true, 'El grado es obligatorio para la tutoría.']
    },
    section: {
        type: String,
        required: [true, 'La sección es obligatoria para la tutoría.']
    },
}, {
    timestamps: true // Añade createdAt y updatedAt
});

// Asegurar que solo haya una tutoría por profesor, grado y sección en la misma institución
TutoriaSchema.index({ teacher: 1, institution: 1, gradeLevel: 1, section: 1 }, { unique: true });

module.exports = mongoose.model('Tutoria', TutoriaSchema);
