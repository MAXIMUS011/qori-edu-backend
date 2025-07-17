const express = require('express');
const Institution = require('../models/Institution');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// @route   GET /api/institutions
// @desc    Obtener todas las instituciones
// @access  Public
router.get('/', async (req, res) => {
    try {
        const institutions = await Institution.find({});
        res.json(institutions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   POST /api/institutions
// @desc    Crear una nueva institución (solo administrador)
// @access  Private (Admin only)
router.post('/', protect, authorize('administrador'), async (req, res) => {
    const { name } = req.body;
    try {
        const institution = await Institution.create({ name });
        res.status(201).json(institution);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;