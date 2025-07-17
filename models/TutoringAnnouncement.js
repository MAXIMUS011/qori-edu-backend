// models/TutoringAnnouncement.js
const mongoose = require('mongoose');

const tutoringAnnouncementSchema = new mongoose.Schema({
    subject: {
        type: String,
        required: true,
        trim: true,
    },
    message: {
        type: String,
        required: true,
        trim: true,
    },
    sender: { // El profesor que es tutor y envía el aviso
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    institution: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Institution',
        required: true,
    },
    gradeLevel: { // Grado al que está asignada la tutoría
        type: String,
        required: true, // Obligatorio para avisos de tutoría
        trim: true,
    },
    section: { // Sección a la que está asignada la tutoría
        type: String,
        required: true, // Obligatorio para avisos de tutoría
        trim: true,
    },
}, {
    timestamps: true // Añade createdAt y updatedAt
});

// Índice para búsquedas eficientes por institución, grado, sección y remitente
tutoringAnnouncementSchema.index({ institution: 1, gradeLevel: 1, section: 1, sender: 1 });

module.exports = mongoose.model('TutoringAnnouncement', tutoringAnnouncementSchema);
