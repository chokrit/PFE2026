// ============================================================
// routes/evenements.js — Routes des événements
// Préfixe : /api/evenements
// ============================================================

const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middleware/auth');
const {
  getEvenements,
  getTousEvenements,
  getMesEvenements,
  getEvenement,
  creerEvenement,
  modifierEvenement,
  supprimerEvenement,
  qrScan,
  getSuggestions,
  noterEvenement,
} = require('../controllers/evenementController');

// GET /api/evenements — Événements publiés (accessible sans connexion)
router.get('/', getEvenements);

// GET /api/evenements/all — Tous les événements (admin seulement)
router.get('/all', verifyToken, isAdmin, getTousEvenements);

// GET /api/evenements/mes-evenements — Mes événements créés (connecté)
router.get('/mes-evenements', verifyToken, getMesEvenements);

// GET /api/evenements/suggestions — Événements recommandés (connecté)
// DOIT être avant /:id sinon Express capterait "suggestions" comme un id
router.get('/suggestions', verifyToken, getSuggestions);

// GET /api/evenements/:id — Détail d'un événement
router.get('/:id', getEvenement);

// POST /api/evenements — Créer un événement (connecté)
router.post('/', verifyToken, creerEvenement);

// PUT /api/evenements/:id — Modifier un événement (créateur ou admin)
router.put('/:id', verifyToken, modifierEvenement);

// DELETE /api/evenements/:id — Supprimer un événement (créateur ou admin)
router.delete('/:id', verifyToken, supprimerEvenement);

// POST /api/evenements/:id/qr-scan — Scanner présence via QR code
router.post('/:id/qr-scan', verifyToken, qrScan);

// POST /api/evenements/:id/noter — Noter un événement (présent)
router.post('/:id/noter', verifyToken, noterEvenement);

module.exports = router;
