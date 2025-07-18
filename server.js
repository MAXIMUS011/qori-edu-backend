// server.js
require('dotenv').config(); // Cargar variables de entorno al inicio
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); // Para permitir peticiones desde el frontend
const bcrypt = require('bcryptjs'); // Necesario para el hashing de contraseñas
const jwt = require('jsonwebtoken'); // Necesario para la autenticación JWT
const connectDB = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000; // Asegúrate de que este puerto coincida con el frontend

// Middleware
app.use(cors()); // Habilitar CORS para todas las rutas
app.use(express.json()); // Para parsear el body de las peticiones en formato JSON

connectDB();
// --- Modelos de Mongoose (Importaciones) ---
const User = require('./models/User');
const Institution = require('./models/Institution');
const Attendance = require('./models/Attendance');
const Announcement = require('./models/Announcement'); // Modelo de avisos generales
const TutoringAnnouncement = require('./models/TutoringAnnouncement'); // NUEVO: Modelo de avisos de tutoría
const Grade = require('./models/Grade');
const Commission = require('./models/Commission');
const CommissionAttendance = require('./models/CommissionAttendance');
const Tutoria = require('./models/Tutoria'); 

// --- Middleware de Autenticación y Autorización ---
const protect = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id)
                .select('-password')
                .populate('institution', 'name')
                .populate('commissions', 'name description')
                .populate('tutoringAssignments', 'gradeLevel section'); 
            next();
        } catch (error) {
            console.error('Error de autenticación (token):', error);
            res.status(401).json({ message: 'No autorizado, token fallido o expirado' });
        }
    }
    if (!token) {
        res.status(401).json({ message: 'No autorizado, no hay token' });
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.userType)) {
            return res.status(403).json({ message: `Usuario tipo ${req.user.userType || 'desconocido'} no autorizado para acceder a esta ruta` });
        }
        next();
    };
};


// --- Rutas de la API ---

app.get('/', (req, res) => {
    res.send('API de Qori-Edu funcionando!');
});

// Rutas de Autenticación
app.post('/api/auth/login', async (req, res) => {
    const { code, password, institutionId } = req.body;

    try {
        const user = await User.findOne({ code, institution: institutionId }).populate('institution', 'name');
        
        if (user && (await user.matchPassword(password))) {
            const token = jwt.sign({ id: user._id, userType: user.userType }, process.env.JWT_SECRET, { expiresIn: '1h' });

            res.json({
                _id: user._id,
                code: user.code,
                userType: user.userType,
                institution: user.institution,
                name: user.name,
                lastName: user.lastName,
                phone: user.phone,
                email: user.email,
                grade: user.grade,
                section: user.section,
                course: user.course,
                token: token
            });
        } else {
            res.status(401).json({ message: 'Código, contraseña o institución inválidos' });
        }
    } catch (error) {
        console.error('Error en el login:', error);
        res.status(500).json({ message: 'Error del servidor al iniciar sesión' });
    }
});

app.get('/api/auth/profile', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .select('-password')
            .populate('institution', 'name')
            .populate('commissions', 'name description')
            .populate('tutoringAssignments', 'gradeLevel section'); 
        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ message: 'Usuario no encontrado' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


// Rutas de Instituciones (CRUD)
app.get('/api/institutions', async (req, res) => {
    try {
        const institutions = await Institution.find({});
        res.json(institutions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/institutions', protect, authorize('administrador'), async (req, res) => {
    const { name, address, phone, email } = req.body;
    try {
        const institution = await Institution.create({ name, address, phone, email });
        res.status(201).json(institution);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

app.put('/api/institutions/:id', protect, authorize('administrador'), async (req, res) => {
    try {
        const updatedInstitution = await Institution.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!updatedInstitution) return res.status(404).json({ message: 'Institución no encontrada.' });
        res.json(updatedInstitution);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

app.delete('/api/institutions/:id', protect, authorize('administrador'), async (req, res) => {
    try {
        const deletedInstitution = await Institution.findByIdAndDelete(req.params.id);
        if (!deletedInstitution) return res.status(404).json({ message: 'Institución no encontrada.' });
        res.json({ message: 'Institución eliminada correctamente.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


// Rutas de Usuarios (CRUD)
app.get('/api/users', protect, authorize('administrador', 'profesor'), async (req, res) => {
    try {
        const { userType, institution, grade, section, commission } = req.query;
        let query = {};

        if (userType) query.userType = userType;
        if (institution) query.institution = institution;
        if (grade) query.grade = grade;
        if (section) query.section = section;
        if (commission) query.commissions = commission;

        if (req.user && req.user.userType !== 'estudiante') {
             query._id = { $ne: req.user._id };
        }
        
        const users = await User.find(query).populate('institution', 'name');
        res.json(users);
    } catch (err) {
        console.error('Error al obtener usuarios:', err);
        res.status(500).json({ message: 'Error interno del servidor al obtener usuarios.' });
    }
});

app.get('/api/users/:id', protect, async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .select('-password')
            .populate('institution', 'name')
            .populate('commissions', 'name description')
            .populate('tutoringAssignments', 'gradeLevel section'); 
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        if (req.user.userType !== 'administrador' && user.institution._id.toString() !== req.user.institution._id.toString()) {
            return res.status(403).json({ message: 'No autorizado para ver este usuario.' });
        }
        res.json(user);
    } catch (error) {
        console.error('Error al obtener usuario por ID:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener usuario.', error: error.message });
    }
});


app.post('/api/users', protect, authorize('administrador'), async (req, res) => {
    const { code, password, userType, institution, name, lastName, phone, email, grade, section, course } = req.body;

    try {
        const userExists = await User.findOne({ code });
        if (userExists) {
            return res.status(400).json({ message: 'El código de usuario ya existe.' });
        }

        if (!password) {
            return res.status(400).json({ message: 'La contraseña es obligatoria para todos los usuarios.' });
        }

        const newUser = new User({
            code,
            password,
            userType,
            institution,
            name,
            lastName,
            phone,
            email,
            grade,
            section,
            course
        });

        const savedUser = await newUser.save();
        const userResponse = savedUser.toObject();
        delete userResponse.password;
        res.status(201).json(userResponse);
    } catch (error) {
        console.error('Error al crear usuario:', error);
        res.status(400).json({ message: error.message });
    }
});

app.put('/api/users/:id', protect, authorize('administrador'), async (req, res) => {
    const { password, ...updateData } = req.body;

    try {
        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        ).populate('institution', 'name');

        if (!updatedUser) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        const userResponse = updatedUser.toObject();
        delete userResponse.password;
        res.json(userResponse);
    } catch (error) {
        console.error('Error al actualizar usuario:', error);
        res.status(400).json({ message: error.message });
    }
});

app.delete('/api/users/:id', protect, authorize('administrador'), async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        await user.deleteOne();
        res.json({ message: 'Usuario eliminado correctamente.' });
    } catch (error) {
        console.error('Error al eliminar usuario:', error);
        res.status(500).json({ message: error.message });
    }
});

app.put('/api/users/:userId/assign-commission', protect, authorize('administrador'), async (req, res) => {
    const { userId } = req.params;
    const { commissionId, action } = req.body; 

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }
        if (user.userType !== 'profesor') {
            return res.status(400).json({ message: 'Solo se pueden asignar comisiones a profesores.' });
        }

        const commission = await Commission.findById(commissionId);
        if (!commission) {
            return res.status(404).json({ message: 'Comisión no encontrada.' });
        }

        if (user.institution.toString() !== req.user.institution._id.toString() ||
            commission.institution.toString() !== req.user.institution._id.toString()) {
            return res.status(403).json({ message: 'No autorizado para asignar comisiones entre diferentes instituciones.' });
        }

        if (action === 'add') {
            if (!user.commissions.includes(commissionId)) {
                user.commissions.push(commissionId);
            }
            if (!commission.teachers.includes(userId)) {
                commission.teachers.push(userId);
            }
        } else if (action === 'remove') {
            user.commissions = user.commissions.filter(c => c.toString() !== commissionId);
            commission.teachers = commission.teachers.filter(t => t.toString() !== userId);
        } else {
            return res.status(400).json({ message: 'Acción inválida. Use "add" o "remove".' });
        }

        await user.save();
        await commission.save();

        console.log('Usuario actualizado con comisiones:', user.commissions);
        console.log('Comisión actualizada con profesores:', commission.teachers);
        res.json({ message: 'Comisiones del profesor actualizadas exitosamente.', user });

    } catch (error) {
        console.error('Error assigning/removing commission from user:', error);
        res.status(500).json({ message: 'Error interno del servidor al asignar/desasignar comisión.' });
    }
});


// --- Rutas de Asistencias ---
app.post('/api/attendances/register', protect, authorize('profesor'), async (req, res) => {
    const { attendancesData, teacherId, course, date, institutionId, gradeLevel, section } = req.body;

    if (!attendancesData || !Array.isArray(attendancesData) || attendancesData.length === 0) {
        return res.status(400).json({ message: 'Datos de asistencia inválidos o vacíos.' });
    }
    if (!teacherId || !course || !date || !institutionId || !gradeLevel || !section) {
        return res.status(400).json({ message: 'Datos de contexto incompletos (profesor, curso, fecha, institución, grado o sección).' });
    }

    try {
        const savedAttendances = [];
        const dateOnly = new Date(date);
        dateOnly.setHours(0, 0, 0, 0);

        for (const attendanceItem of attendancesData) {
            const { studentId, status } = attendanceItem;

            const existingAttendance = await Attendance.findOne({
                student: studentId,
                course: course,
                date: dateOnly,
                institution: institutionId,
                gradeLevel: gradeLevel,
                section: section
            });

            if (existingAttendance) {
                existingAttendance.status = status;
                existingAttendance.teacher = teacherId;
                savedAttendances.push(await existingAttendance.save());
            } else {
                const newAttendance = new Attendance({
                    student: studentId,
                    teacher: teacherId,
                    institution: institutionId,
                    course: course,
                    gradeLevel: gradeLevel,
                    section: section,
                    date: dateOnly,
                    status: status
                });
                savedAttendances.push(await newAttendance.save());
            }
        }
        res.status(200).json({ message: 'Asistencias registradas/actualizadas exitosamente', attendances: savedAttendances });
    } catch (error) {
        console.error('Error al registrar asistencias:', error);
        res.status(500).json({ message: 'Error interno del servidor al registrar asistencias.', error: error.message });
    }
});

app.get('/api/attendances/check-existing', protect, authorize('profesor'), async (req, res) => {
    const { gradeLevel, section, course, date, institutionId, examType } = req.query;

    if (!gradeLevel || !section || !course || !date || !institutionId || !examType) {
        return res.status(400).json({ message: 'Faltan parámetros de consulta para verificar asistencias existentes.' });
    }

    try {
        const dateOnly = new Date(date);
        dateOnly.setHours(0, 0, 0, 0);

        const existingAttendances = await Attendance.find({
            gradeLevel,
            section,
            course,
            date: dateOnly,
            institution: institutionId,
            examType: examType
        }).populate('student', '_id name lastName');

        res.json(existingAttendances);
    } catch (error) {
        console.error('Error al verificar asistencias existentes:', error);
        res.status(500).json({ message: 'Error interno del servidor al verificar asistencias existentes.', error: error.message });
    }
});

app.get('/api/attendances', protect, async (req, res) => {
    const { institutionId, gradeLevel, section, course, teacherId, studentId, startDate, endDate } = req.query;
    let filter = {};

    if (req.user.userType === 'estudiante') {
        filter.student = req.user._id;
        filter.institution = req.user.institution._id;
    } else if (req.user.userType === 'profesor') {
        filter.institution = req.user.institution._id;
        if (req.user.tutoringAssignments && req.user.tutoringAssignments.length > 0) {
            const tutorGradesSections = req.user.tutoringAssignments.map(ta => ({
                gradeLevel: ta.gradeLevel,
                section: ta.section
            }));

            const orConditions = tutorGradesSections.map(gs => ({
                gradeLevel: gs.gradeLevel,
                section: gs.section
            }));

            orConditions.push({ teacher: req.user._id });

            filter.$or = orConditions;

        } else {
            filter.teacher = req.user._id;
        }

    } else if (req.user.userType === 'administrador') {
        filter.institution = req.user.institution._id;
    }

    if (gradeLevel) filter.gradeLevel = gradeLevel;
    if (section) filter.section = section;
    if (course) filter.course = course;
    if (teacherId) filter.teacher = teacherId; 
    if (studentId) filter.student = studentId;

    if (startDate || endDate) {
        filter.date = {};
        if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            filter.date.$gte = start;
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            filter.date.$lte = end;
        }
    }

    try {
        const attendances = await Attendance.find(filter)
            .populate('student', 'name lastName code')
            .populate('teacher', 'name lastName')
            .populate('institution', 'name')
            .sort({ date: -1, createdAt: -1 });

        res.json(attendances);
    } catch (error) {
        console.error('Error al obtener asistencias:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener asistencias.', error: error.message });
    }
});


// --- Rutas de Avisos (Announcements) ---
// Esta ruta es ahora SOLO para avisos GENERALES (NO de tutoría)
app.post('/api/announcements', protect, authorize('administrador', 'profesor'), async (req, res) => {
    const { subject, message, sender, institution, gradeLevel, section, course, student, commission } = req.body;

    if (!subject || !message || !sender || !institution) {
        return res.status(400).json({ message: 'Asunto, mensaje, remitente e ID de institución son obligatorios.' });
    }

    try {
        // Asegurarse de que no se intente crear un aviso de tutoría a través de esta ruta
        if (req.body.isTutoringAnnouncement === true) {
            return res.status(400).json({ message: 'Los avisos de tutoría deben enviarse a través de la ruta /api/tutoring-announcements.' });
        }

        const newAnnouncement = await Announcement.create({
            subject,
            message,
            sender,
            institution,
            gradeLevel: gradeLevel || null,
            section: section || null,
            course: course || null,
            student: student || null,
            commission: commission || null,
            isTutoringAnnouncement: false // Siempre false para esta ruta
        });

        res.status(201).json({ message: 'Aviso general enviado exitosamente.', announcement: newAnnouncement });

    } catch (error) {
        console.error('Error al enviar aviso general:', error);
        res.status(500).json({ message: 'Error interno del servidor al enviar aviso general.', error: error.message });
    }
});

// Esta ruta es ahora SOLO para obtener avisos GENERALES (NO de tutoría)
app.get('/api/announcements', protect, async (req, res) => {
    const { institutionId, gradeLevel, section, course, studentId, senderId, commissionId } = req.query;
    let filter = { institution: req.user.institution._id };

    // Siempre filtrar avisos generales (no de tutoría)
    filter.isTutoringAnnouncement = { $ne: true };

    if (req.user.userType === 'estudiante') {
        const studentGeneralAnnouncementConditions = [];

        // Avisos directos al estudiante
        studentGeneralAnnouncementConditions.push({
            student: req.user._id
        });

        // Avisos de comisiones a las que el estudiante pertenece
        const studentCommissions = await Commission.find({ students: req.user._id }).select('_id');
        const commissionIds = studentCommissions.map(c => c._id);
        if (commissionIds.length > 0) {
            studentGeneralAnnouncementConditions.push({
                commission: { $in: commissionIds }
            });
        }

        // Avisos generales de la institución (todos los campos de segmentación son null)
        studentGeneralAnnouncementConditions.push({
            gradeLevel: null,
            section: null,
            course: null,
            student: null,
            commission: null,
        });

        // Avisos segmentados por grado, sección o curso (no específicos de estudiante/comisión)
        studentGeneralAnnouncementConditions.push({
            $and: [
                { $or: [{ gradeLevel: req.user.grade }, { gradeLevel: null }] },
                { $or: [{ section: req.user.section }, { section: null }] },
                { $or: [{ course: req.user.course }, { course: null }] },
                { student: null },
                { commission: null }
            ]
        });
        filter.$or = studentGeneralAnnouncementConditions;

    } else if (req.user.userType === 'profesor') {
        const professorCommissions = await Commission.find({ teachers: req.user._id }).select('_id');
        const commissionIds = professorCommissions.map(c => c._id);

        filter.$or = [
            { sender: req.user._id }, // Avisos enviados por este profesor
            { course: req.user.course }, // Avisos para cursos que imparte
            // Avisos para grados/secciones que gestiona (si es profesor de aula)
            { gradeLevel: req.user.grade, section: req.user.section },
            { // Avisos generales de la institución
                gradeLevel: null,
                section: null,
                course: null,
                student: null,
                commission: null
            }
        ];
        // Añadir avisos de comisiones a las que el profesor pertenece
        if (commissionIds.length > 0) {
            filter.$or.push({ commission: { $in: commissionIds } });
        }

    } else if (req.user.userType === 'administrador') {
        // Los administradores pueden ver todos los avisos generales de su institución
        // No se necesita añadir más condiciones específicas aquí, ya que el filtro inicial
        // `filter.isTutoringAnnouncement = { $ne: true };` ya se aplica.
    }

    // Aplicar filtros adicionales si están presentes en la query
    if (institutionId) filter.institution = institutionId; 
    if (gradeLevel) filter.gradeLevel = gradeLevel;
    if (section) filter.section = section;
    if (course) filter.course = course;
    if (studentId) filter.student = studentId;
    if (senderId) filter.sender = senderId;
    if (commissionId) filter.commission = commissionId;


    try {
        const announcements = await Announcement.find(filter)
            .populate('sender', 'name lastName userType course')
            .populate('institution', 'name')
            .populate('student', 'name lastName code')
            .populate('commission', 'name')
            .sort({ createdAt: -1 });

        res.json(announcements);
    } catch (error) {
        console.error('Error al obtener avisos generales:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener avisos generales.', error: error.message });
    }
});


// --- Rutas de Avisos de Tutoría (NUEVAS RUTAS) ---
app.post('/api/tutoring-announcements', protect, authorize('profesor'), async (req, res) => {
    const { subject, message, gradeLevel, section } = req.body;
    const sender = req.user._id;
    const institution = req.user.institution._id;

    if (!subject || !message || !gradeLevel || !section) {
        return res.status(400).json({ message: 'Asunto, mensaje, grado y sección son obligatorios para avisos de tutoría.' });
    }

    try {
        // Verificar que el profesor sea tutor de este grado y sección
        const isTutor = await Tutoria.exists({
            teacher: sender,
            institution: institution,
            gradeLevel: gradeLevel,
            section: section
        });

        if (!isTutor) {
            return res.status(403).json({ message: 'No tienes permisos para enviar avisos de tutoría para este grupo.' });
        }

        const newTutoringAnnouncement = await TutoringAnnouncement.create({
            subject,
            message,
            sender,
            institution,
            gradeLevel,
            section,
        });

        res.status(201).json({ message: 'Aviso de tutoría enviado exitosamente.', announcement: newTutoringAnnouncement });

    } catch (error) {
        console.error('Error al enviar aviso de tutoría:', error);
        res.status(500).json({ message: 'Error interno del servidor al enviar aviso de tutoría.', error: error.message });
    }
});

app.get('/api/tutoring-announcements', protect, async (req, res) => {
    const { institutionId, gradeLevel, section, senderId } = req.query;
    let filter = { institution: req.user.institution._id };

    if (req.user.userType === 'estudiante') {
        filter.gradeLevel = req.user.grade;
        filter.section = req.user.section;
        // Para estudiantes, solo ver avisos de su tutor asignado
        const tutorAssignment = await Tutoria.findOne({
            institution: req.user.institution._id,
            gradeLevel: req.user.grade,
            section: req.user.section
        });

        if (tutorAssignment) {
            filter.sender = tutorAssignment.teacher;
        } else {
            // Si no se encuentra un tutor, no hay avisos de tutoría para mostrar
            return res.json([]);
        }
    } else if (req.user.userType === 'profesor') {
        // Un profesor solo ve los avisos de tutoría que él envió o los de sus grupos de tutoría
        const tutoringAssignments = await Tutoria.find({ teacher: req.user._id }).select('gradeLevel section');
        const orConditions = [{ sender: req.user._id }]; // Avisos que él mismo envió

        tutoringAssignments.forEach(assignment => {
            orConditions.push({
                gradeLevel: assignment.gradeLevel,
                section: assignment.section
            });
        });
        filter.$or = orConditions;

        if (gradeLevel) filter.gradeLevel = gradeLevel; // Permite al profesor filtrar sus propios avisos de tutoría
        if (section) filter.section = section;
        if (senderId) filter.sender = senderId; // Si un admin o profesor busca por senderId
        
    } else if (req.user.userType === 'administrador') {
        // Los administradores pueden ver todos los avisos de tutoría de su institución
        if (gradeLevel) filter.gradeLevel = gradeLevel;
        if (section) filter.section = section;
        if (senderId) filter.sender = senderId;
    }

    try {
        const tutoringAnnouncements = await TutoringAnnouncement.find(filter)
            .populate('sender', 'name lastName userType code')
            .populate('institution', 'name')
            .sort({ createdAt: -1 });

        res.json(tutoringAnnouncements);
    } catch (error) {
        console.error('Error al obtener avisos de tutoría:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener avisos de tutoría.', error: error.message });
    }
});


// --- Rutas de Notas (Grades) ---
app.post('/api/grades/register', protect, authorize('profesor'), async (req, res) => {
    try {
        const { gradesData, course, date, institutionId, gradeLevel, section, examType } = req.body;
        const teacherId = req.user._id;

        if (!gradesData || !Array.isArray(gradesData) || gradesData.length === 0) {
            return res.status(400).json({ message: 'Datos de notas inválidos o vacíos.' });
        }

        if (!teacherId || !institutionId || !course || !gradeLevel || !section || !examType) {
            return res.status(400).json({ message: 'Datos de contexto incompletos (profesor, institución, curso, fecha, grado, sección o tipo de examen).' });
        }
        
        const savedGrades = [];
        const dateOnly = new Date(date);
        dateOnly.setHours(0, 0, 0, 0);

        for (const gradeItem of gradesData) {
            const { studentId, score, comment } = gradeItem;

            if (!studentId || score === undefined || score === null || score === '') {
                console.warn(`Skipping invalid or empty grade item: ${JSON.stringify(gradeItem)}`);
                continue;
            }

            const existingGrade = await Grade.findOne({
                student: studentId,
                course: course,
                date: dateOnly,
                institution: institutionId,
                gradeLevel: gradeLevel,
                section: section,
                examType: examType
            });

            if (existingGrade) {
                existingGrade.score = String(score);
                existingGrade.comment = comment || '';
                existingGrade.teacher = teacherId;
                savedGrades.push(await existingGrade.save());
            } else {
                const newGrade = new Grade({
                    student: studentId,
                    teacher: teacherId,
                    institution: institutionId,
                    course: course,
                    gradeLevel: gradeLevel,
                    section: section,
                    date: dateOnly,
                    score: String(score),
                    comment: comment || '',
                    examType: examType
                });
                savedGrades.push(await newGrade.save());
            }
        }

        if (savedGrades.length === 0) {
            return res.status(400).json({ message: 'No se pudieron guardar notas válidas.' });
        }

        res.status(201).json({ message: 'Notas registradas/actualizadas exitosamente', grades: savedGrades });

    } catch (error) {
        console.error('Error al registrar notas:', error);
        if (error.code === 11000) {
            return res.status(409).json({ message: `Ya existe una nota de tipo "${req.body.examType}" para uno de los alumnos en esta fecha y curso. Por favor, edita la nota existente o cambia el tipo de examen.` });
        }
        res.status(500).json({ message: 'Error interno del servidor al registrar notas', error: error.message });
    }
});

app.get('/api/grades/check-existing', protect, authorize('profesor'), async (req, res) => {
    const { gradeLevel, section, course, date, institutionId, examType } = req.query;

    if (!gradeLevel || !section || !course || !date || !institutionId || !examType) {
        return res.status(400).json({ message: 'Faltan parámetros de consulta para verificar notas existentes.' });
    }

    try {
        const dateOnly = new Date(date);
        dateOnly.setHours(0, 0, 0, 0);

        const existingGrades = await Grade.find({
            gradeLevel,
            section,
            course,
            date: dateOnly,
            institution: institutionId,
            examType: examType
        }).populate('student', '_id name lastName');

        res.json(existingGrades);
    } catch (error) {
        console.error('Error al verificar notas existentes:', error);
        res.status(500).json({ message: 'Error interno del servidor al verificar notas existentes.', error: error.message });
    }
});


app.get('/api/grades', protect, async (req, res) => {
    const { institutionId, gradeLevel, section, course, teacherId, studentId, startDate, endDate, examType } = req.query;
    let filter = {};

    if (req.user.userType === 'estudiante') {
        filter.student = req.user._id;
        filter.institution = req.user.institution._id;
    } else if (req.user.userType === 'profesor') {
        filter.institution = req.user.institution._id;
        if (req.user.tutoringAssignments && req.user.tutoringAssignments.length > 0) {
            const tutorGradesSections = req.user.tutoringAssignments.map(ta => ({
                gradeLevel: ta.gradeLevel,
                section: ta.section
            }));

            const orConditions = tutorGradesSections.map(gs => ({
                gradeLevel: gs.gradeLevel,
                section: gs.section
            }));

            orConditions.push({ teacher: req.user._id });
            filter.$or = orConditions;

        } else {
            filter.teacher = req.user._id;
        }

    } else if (req.user.userType === 'administrador') {
        filter.institution = req.user.institution._id;
    }

    if (gradeLevel) filter.gradeLevel = gradeLevel;
    if (section) filter.section = section;
    if (course) filter.course = course;
    if (teacherId) filter.teacher = teacherId;
    if (studentId) filter.student = studentId;
    if (examType) filter.examType = examType;

    if (startDate || endDate) {
        filter.date = {};
        if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            filter.date.$gte = start;
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            filter.date.$lte = end;
        }
    }

    try {
        const grades = await Grade.find(filter)
            .populate('student', 'name lastName code')
            .populate('teacher', 'name lastName')
            .populate('institution', 'name')
            .sort({ date: -1, createdAt: -1 });

        res.json(grades);
    } catch (error) {
        console.error('Error al obtener notas:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener notas.', error: error.message });
    }
});

// --- RUTAS DE COMISIONES (Commission) ---
app.get('/api/commissions/for-professor', protect, authorize('profesor'), async (req, res) => {
    try {
        const professorId = req.user._id;
        const institutionId = req.user.institution._id;

        const commissions = await Commission.find({
            institution: institutionId,
            teachers: professorId
        })
        .populate('teachers', 'name lastName code')
        .populate('students', 'name lastName code grade section');

        res.json(commissions);
    } catch (error) {
        console.error('Error fetching commissions for professor:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener comisiones del profesor.' });
    }
});

app.get('/api/commissions', protect, async (req, res) => {
    try {
        const institutionId = req.user.institution._id;
        const commissions = await Commission.find({ institution: institutionId });
        res.json(commissions);
    } catch (error) {
        console.error('Error fetching commissions:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener comisiones.' });
    }
});

app.get('/api/commissions/:id', protect, async (req, res) => {
    try {
        const commission = await Commission.findById(req.params.id)
            .populate('teachers', 'name lastName code')
            .populate('students', 'name lastName code grade section');

        if (!commission) {
            return res.status(404).json({ message: 'Comisión no encontrada.' });
        }

        if (commission.institution.toString() !== req.user.institution._id.toString()) {
            return res.status(403).json({ message: 'No autorizado para ver esta comisión.' });
        }

        res.json(commission);
    } catch (error) {
        console.error('Error fetching single commission:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener la comisión.' });
    }
});


app.post('/api/commissions', protect, authorize('administrador'), async (req, res) => {
    const { name, description } = req.body;
    const institution = req.user.institution._id;

    if (!name) {
        return res.status(400).json({ message: 'El nombre de la comisión es obligatorio.' });
    }

    try {
        const commissionExists = await Commission.findOne({ name, institution });
        if (commissionExists) {
            return res.status(400).json({ message: 'Ya existe una comisión con este nombre en tu institución.' });
        }

        const newCommission = new Commission({
            name,
            description,
            institution
        });
        await newCommission.save();
        res.status(201).json({ message: 'Comisión creada exitosamente', commission: newCommission });
    } catch (error) {
        console.error('Error creating commission:', error);
        res.status(500).json({ message: 'Error interno del servidor al crear comisión.' });
    }
});

app.put('/api/commissions/:id', protect, authorize('administrador'), async (req, res) => {
    const { id } = req.params;
    const { name, description, isActive } = req.body;

    try {
        const commission = await Commission.findById(id);

        if (!commission) {
            return res.status(404).json({ message: 'Comisión no encontrada.' });
        }

        if (commission.institution.toString() !== req.user.institution._id.toString()) {
            return res.status(403).json({ message: 'No autorizado para modificar esta comisión.' });
        }

        if (name && name !== commission.name) {
            const commissionExists = await Commission.findOne({ name, institution: req.user.institution._id });
            if (commissionExists) {
                return res.status(400).json({ message: 'Ya existe otra comisión con este nombre en tu institución.' });
            }
        }

        commission.name = name || commission.name;
        commission.description = description || commission.description;
        if (typeof isActive === 'boolean') {
            commission.isActive = isActive;
        }

        await commission.save();
        console.log('Comisión actualizada con estudiantes:', commission.students);
        res.json({ message: 'Comisión actualizada exitosamente', commission });
    } catch (error) {
        console.error('Error updating commission:', error);
        res.status(500).json({ message: 'Error interno del servidor al actualizar comisión.' });
    }
});

app.delete('/api/commissions/:id', protect, authorize('administrador'), async (req, res) => {
    const { id } = req.params;

    try {
        const commission = await Commission.findById(id);

        if (!commission) {
            return res.status(404).json({ message: 'Comisión no encontrada.' });
        }

        if (commission.institution.toString() !== req.user.institution._id.toString()) {
            return res.status(403).json({ message: 'No autorizado para eliminar esta comisión.' });
        }

        await User.updateMany(
            { commissions: commission._id },
            { $pull: { commissions: commission._id } }
        );

        await commission.deleteOne();
        res.json({ message: 'Comisión eliminada correctamente.' });
    } catch (error) {
        console.error('Error deleting commission:', error);
        res.status(500).json({ message: 'Error interno del servidor al eliminar comisión.' });
    }
});

app.put('/api/commissions/:commissionId/assign-students', protect, authorize('administrador'), async (req, res) => {
    const { commissionId } = req.params;
    const { studentId, action } = req.body;

    try {
        const commission = await Commission.findById(commissionId);
        if (!commission) {
            return res.status(404).json({ message: 'Comisión no encontrada.' });
        }
        if (commission.institution.toString() !== req.user.institution._id.toString()) {
            return res.status(403).json({ message: 'No autorizado para modificar esta comisión.' });
        }

        const student = await User.findById(studentId);
        if (!student || student.userType !== 'estudiante') {
            return res.status(400).json({ message: 'Estudiante no encontrado o tipo de usuario inválido.' });
        }
        if (student.institution.toString() !== req.user.institution._id.toString()) {
            return res.status(403).json({ message: 'No autorizado para asignar estudiantes de otras instituciones.' });
        }

        if (action === 'add') {
            if (!commission.students.includes(studentId)) {
                commission.students.push(studentId);
            }
            if (!student.commissions.includes(commissionId)) {
                student.commissions.push(commissionId);
            }
        } else if (action === 'remove') {
            commission.students = commission.students.filter(s => s.toString() !== studentId);
            student.commissions = student.commissions.filter(c => c.toString() !== commissionId);
        } else {
            return res.status(400).json({ message: 'Acción inválida. Use "add" o "remove".' });
        }

        await commission.save();
        await student.save(); 

        console.log('Comisión actualizada con estudiantes:', commission.students);
        console.log('Estudiante actualizado con comisiones:', student.commissions); 
        res.json({ message: 'Estudiantes de la comisión y comisiones del estudiante actualizados exitosamente.', commission });

    } catch (error) {
        console.error('Error assigning/removing student from commission:', error);
        res.status(500).json({ message: 'Error interno del servidor al asignar/desasignar estudiante a comisión.', error: error.message });
    }
});

// --- NUEVAS RUTAS PARA ASISTENCIA DE COMISIONES ---

app.post('/api/commission-attendances/register', protect, authorize('profesor'), async (req, res) => {
    const { commissionId, attendancesData, date } = req.body;
    const teacherId = req.user._id;
    const institutionId = req.user.institution._id;

    if (!commissionId || !attendancesData || !Array.isArray(attendancesData) || attendancesData.length === 0 || !date) {
        return res.status(400).json({ message: 'Datos de asistencia de comisión incompletos o inválidos.' });
    }

    try {
        const savedAttendances = [];
        const dateOnly = new Date(date);
        dateOnly.setHours(0, 0, 0, 0);

        for (const attendanceItem of attendancesData) {
            const { studentId, status } = attendanceItem;

            const existingCommissionAttendance = await CommissionAttendance.findOne({
                student: studentId,
                commission: commissionId,
                date: dateOnly,
                institution: institutionId
            });

            if (existingCommissionAttendance) {
                existingCommissionAttendance.status = status;
                existingCommissionAttendance.teacher = teacherId;
                savedAttendances.push(await existingCommissionAttendance.save());
            } else {
                const newCommissionAttendance = new CommissionAttendance({
                    commission: commissionId,
                    student: studentId,
                    teacher: teacherId,
                    institution: institutionId,
                    date: dateOnly,
                    status: status
                });
                savedAttendances.push(await newCommissionAttendance.save());
            }
        }
        res.status(200).json({ message: 'Asistencias de comisión registradas/actualizadas exitosamente', attendances: savedAttendances });
    } catch (error) {
        console.error('Error al registrar asistencias de comisión:', error);
        if (error.code === 11000) {
            return res.status(409).json({ message: `Ya existe un registro de asistencia para uno de los alumnos en esta comisión y fecha.` });
        }
        res.status(500).json({ message: 'Error interno del servidor al registrar asistencias de comisión.', error: error.message });
    }
});

app.get('/api/commission-attendances', protect, async (req, res) => {
    const { commissionId, studentId, startDate, endDate } = req.query;
    let filter = { institution: req.user.institution._id };

    if (req.user.userType === 'estudiante') {
        filter.student = req.user._id;
        if (commissionId) { 
            filter.commission = commissionId;
        } else { 
        }
    } else if (req.user.userType === 'profesor') {
        const professorCommissions = await Commission.find({ teachers: req.user._id }).select('_id');
        const professorCommissionIds = professorCommissions.map(c => c._id);
        filter.commission = { $in: professorCommissionIds }; 
        if (commissionId) filter.commission = commissionId; 
        if (studentId) filter.student = studentId;
    } else if (req.user.userType === 'administrador') {
        if (commissionId) filter.commission = commissionId;
        if (studentId) filter.student = studentId;
    }

    if (startDate || endDate) {
        filter.date = {};
        if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            filter.date.$gte = start;
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            filter.date.$lte = end;
        }
    }

    try {
        const attendances = await CommissionAttendance.find(filter)
            .populate('commission', 'name')
            .populate('student', 'name lastName code')
            .populate('teacher', 'name lastName')
            .sort({ date: -1, createdAt: -1 });

        res.json(attendances);
    } catch (error) {
        console.error('Error al obtener historial de asistencias de comisión:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener historial de asistencias de comisión.', error: error.message });
    }
});


// --- NUEVAS RUTAS DE TUTORÍA ---

app.post('/api/tutorias', protect, authorize('administrador'), async (req, res) => {
    const { teacherId, gradeLevel, section } = req.body;
    const institution = req.user.institution._id;

    if (!teacherId || !gradeLevel || !section) {
        return res.status(400).json({ message: 'Profesor, grado y sección son obligatorios para la asignación de tutoría.' });
    }

    try {
        const teacher = await User.findById(teacherId);
        if (!teacher || teacher.userType !== 'profesor') {
            return res.status(400).json({ message: 'El ID proporcionado no corresponde a un profesor válido.' });
        }

        const existingTutoria = await Tutoria.findOne({ teacher: teacherId, institution, gradeLevel, section });
        if (existingTutoria) {
            return res.status(400).json({ message: 'Este profesor ya está asignado como tutor para este grado y sección.' });
        }

        const newTutoria = new Tutoria({
            teacher: teacherId,
            institution,
            gradeLevel,
            section
        });
        await newTutoria.save();

        teacher.tutoringAssignments.push(newTutoria._id);
        await teacher.save();

        res.status(201).json({ message: 'Asignación de tutoría creada exitosamente.', tutoria: newTutoria });

    } catch (error) {
        console.error('Error al crear asignación de tutoría:', error);
        res.status(500).json({ message: 'Error interno del servidor al crear asignación de tutoría.', error: error.message });
    }
});

app.get('/api/tutorias', protect, authorize('administrador', 'profesor', 'estudiante'), async (req, res) => {
    try {
        const institutionId = req.user.institution._id;
        let query = { institution: institutionId };

        if (req.user.userType === 'estudiante') {
            query.gradeLevel = req.user.grade;
            query.section = req.user.section;
        }
        else if (req.user.userType === 'profesor') {
            query.teacher = req.user._id;
        }

        const tutorias = await Tutoria.find(query)
            .populate('teacher', 'name lastName code email phone'); 

        res.json(tutorias);
    } catch (error) {
        console.error('Error al obtener asignaciones de tutoría:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener asignaciones de tutoría.', error: error.message });
    }
});

app.delete('/api/tutorias/:id', protect, authorize('administrador'), async (req, res) => {
    const { id } = req.params;
    try {
        const tutoria = await Tutoria.findById(id);
        if (!tutoria) {
            return res.status(404).json({ message: 'Asignación de tutoría no encontrada.' });
        }
        if (tutoria.institution.toString() !== req.user.institution._id.toString()) {
            return res.status(403).json({ message: 'No autorizado para eliminar esta asignación de tutoría.' });
        }

        await User.findByIdAndUpdate(tutoria.teacher, { $pull: { tutoringAssignments: tutoria._id } });

        await tutoria.deleteOne();
        res.json({ message: 'Asignación de tutoría eliminada correctamente.' });
    } catch (error) {
        console.error('Error al eliminar asignación de tutoría:', error);
        res.status(500).json({ message: 'Error interno del servidor al eliminar asignación de tutoría.', error: error.message });
    }
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
