// ============================================================
// routes/locations.js  — NOUVEAU FICHIER
// Fournir la liste des lieux pour les formulaires de création
// ============================================================

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const Location = require('../models/Location');

// GET /api/locations — Liste de tous les lieux (pour les selects)
router.get('/', verifyToken, async (req, res) => {
  try {
    const locations = await Location.find().sort({ name_location: 1 });
    return res.json({ success: true, locations });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/locations — Créer un lieu (admin)
router.post('/', verifyToken, async (req, res) => {
  try {
    const { name_location, location_capacity, is_official, gps_coordinates } = req.body;
    if (!name_location) {
      return res.status(400).json({ success: false, message: 'Le nom du lieu est obligatoire' });
    }
    const location = await Location.create({
      name_location,
      location_capacity: location_capacity || 0,
      is_official: is_official || false,
      gps_coordinates: gps_coordinates || {},
    });
    return res.status(201).json({ success: true, message: 'Lieu créé', location });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

module.exports = router;
