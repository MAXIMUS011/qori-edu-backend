// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    code: { // Usaremos 'code' como identificador de inicio de sesión
        type: String,
        required: [true, 'El código es obligatorio'],
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: [true, 'La contraseña es obligatoria']
    },
    userType: { // 'profesor', 'estudiante', 'administrador'
        type: String,
        enum: ['profesor', 'estudiante', 'administrador'],
        required: [true, 'El tipo de usuario es obligatorio']
    },
    institution: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Institution',
        required: [true, 'La institución es obligatoria']
    },
    name: {
        type: String,
        required: [true, 'El nombre es obligatorio'],
        trim: true
    },
    lastName: {
        type: String,
        required: [true, 'El apellido es obligatorio'],
        trim: true
    },
    phone: {
        type: String,
        trim: true,
        default: ''
    },
    email: { // Campo de email opcional
        type: String,
        trim: true,
        lowercase: true,
        // unique: true, // Si quieres que los emails sean únicos
        // sparse: true // Usar con unique para permitir múltiples documentos sin email
    },
    // Campos específicos para profesor
    course: {
        type: String, // Asumiendo que el curso es un String como "Física", "Matemáticas"
        trim: true,
        required: function() { return this.userType === 'profesor'; } // Solo obligatorio si es profesor
    },
    // Campo para comisiones (para profesores y estudiantes)
    commissions: [{ // Array de ObjectIds que referencian a la colección 'Commission'
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Commission',
    }],
    // NUEVO CAMPO: Asignaciones de tutoría para profesores
    tutoringAssignments: [{ // Array de ObjectIds que referencian a la colección 'Tutoria'
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tutoria',
    }],
    // Campos específicos para estudiante
    grade: {
        type: String, // Ej. "1ro", "2do"
        trim: true,
        required: function() { return this.userType === 'estudiante'; }
    },
    section: {
        type: String, // Ej. "A", "B"
        trim: true,
        required: function() { return this.userType === 'estudiante'; }
    }
}, {
    timestamps: true // Añade createdAt y updatedAt para saber cuándo fue creado/modificado
});

// Hash de la contraseña antes de guardar
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next(); // Usa 'return next()' para asegurar que la función se detenga
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Método para comparar contraseñas
UserSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
