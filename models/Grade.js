const mongoose = require('mongoose');

const gradeSchema = new mongoose.Schema({
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
        required: true
    },
    score: {
        type: String, // ¡Ahora es String!
        required: true,
        // Eliminamos min y max ya que no aplican a un String
        // Puedes añadir validaciones personalizadas si quieres limitar los valores de String
    },
    comment: {
        type: String,
        default: ''
    },
    // --- NUEVO CAMPO ---
    examType: {
        type: String,
        enum: ['Examen Parcial', 'Examen Final', 'Prueba Corta', 'Trabajo Práctico', 'Participación', 'Otro'],
        default: 'Prueba Corta', // Puedes establecer un valor por defecto
        required: true // Considera si siempre debe ser requerido
    }
}, {
    timestamps: true // Esto añade createdAt y updatedAt automáticamente
});

// Índice único para evitar notas duplicadas para el mismo estudiante, curso, fecha y tipo de examen
// **IMPORTANTE:** Si registras varias notas para el mismo alumno en la misma fecha (ej. "Examen Parcial" y "Participación"),
// podrías necesitar ajustar este índice único. Si solo se registra UN tipo de evaluación por alumno/fecha/curso, está bien.
gradeSchema.index({ student: 1, course: 1, date: 1, examType: 1 }, { unique: true });


module.exports = mongoose.model('Grade', gradeSchema);