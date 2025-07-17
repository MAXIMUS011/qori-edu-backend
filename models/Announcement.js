// models/Announcement.js
const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
    subject: {
        type: String,
        required: [true, 'El asunto es obligatorio.']
    },
    message: {
        type: String,
        required: [true, 'El mensaje es obligatorio.']
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Asumiendo que los avisos son enviados por un User
        required: true
    },
    institution: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Institution',
        required: true
    },
    gradeLevel: {
        type: String,
        default: null // Puede ser nulo si es para toda la institución o un estudiante específico
    },
    section: {
        type: String,
        default: null
    },
    course: {
        type: String, // O podría ser un ObjectId si tienes un modelo de Curso
        default: null
    },
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Si el aviso es para un estudiante específico
        default: null
    },
    commission: { // ESTE ES EL CAMPO QUE FALTABA Y ES CRUCIAL PARA EL POPULATE
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Commission', // Asegúrate de que 'Commission' es el nombre de tu modelo de comisiones
        default: null // Puede ser nulo si el aviso no está asociado a una comisión
    }
}, {
    timestamps: true // Añade createdAt y updatedAt automáticamente
});

module.exports = mongoose.model('Announcement', announcementSchema);
