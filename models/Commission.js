// models/Commission.js
const mongoose = require('mongoose');

const CommissionSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'El nombre de la comisión es obligatorio'],
        trim: true,
        unique: true // Asegura que no haya comisiones con el mismo nombre en la misma institución
    },
    institution: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Institution',
        required: [true, 'La institución es obligatoria']
    },
    description: {
        type: String,
        trim: true,
        default: ''
    },
    isActive: {
        type: Boolean,
        default: true
    },
    teachers: [{ // Array de IDs de profesores asignados a esta comisión (ya existente)
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    students: [{ // ¡NUEVO CAMPO! Array de IDs de estudiantes asignados a esta comisión
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
}, {
    timestamps: true // Añade createdAt y updatedAt
});

// Asegurar que el nombre de la comisión sea único por institución
CommissionSchema.index({ name: 1, institution: 1 }, { unique: true });

module.exports = mongoose.model('Commission', CommissionSchema);
