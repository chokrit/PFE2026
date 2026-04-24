// ============================================================
// routes/categories.js  — NOUVEAU FICHIER
// Fournir la liste des catégories sportives pour les formulaires
// ============================================================

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const Categorie = require('../models/Categorie');

// GET /api/categories — Liste de toutes les catégories
router.get('/', async (req, res) => {
  try {
    const categories = await Categorie.find().sort({ event_categ: 1, event_type: 1 });
    return res.json({ success: true, categories });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

module.exports = router;
