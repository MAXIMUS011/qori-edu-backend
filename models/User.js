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
    // --- CAMBIOS IMPORTANTES AQUÍ ---
    // Ahora 'course', 'grade' y 'section' son siempre arrays de Strings
    course: {
        type: [String], // Cambiado a array de Strings
        default: [],    // Valor por defecto como array vacío
    },
    grade: {
        type: [String], // Cambiado a array de Strings
        default: [],    // Valor por defecto como array vacío
    },
    section: {
        type: [String], // Cambiado a array de Strings
        default: [],    // Valor por defecto como array vacío
    },
    // --- FIN DE CAMBIOS IMPORTANTES ---
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
}, {
    timestamps: true // Añade createdAt y updatedAt para saber cuándo fue creado/modificado
});

// Hash de la contraseña antes de guardar
UserSchema.pre('save', async function (next) {
    // Solo hashear si la contraseña ha sido modificada o es nueva
    if (!this.isModified('password')) {
        return next();
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

