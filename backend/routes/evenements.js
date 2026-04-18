// ============================================================
// routes/evenements.js — Routes des événements sportifs
// Préfixe : /api/evenements
// ============================================================

const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middleware/auth');
const {
    getEvenements,
    creerEvenement,
    getEvenement,
    qrScan
} = require('../controllers/evenementController');

// GET /api/evenements — Liste publique (pas besoin d'être connecté)
router.get('/', getEvenements);

// POST /api/evenements — Créer un événement (connecté)
router.post('/', verifyToken, creerEvenement);

// GET /api/evenements/:id — Détail d'un événement
router.get('/:id', getEvenement);

// POST /api/evenements/:id/qr-scan — Scanner QR pour confirmer présence
router.post('/:id/qr-scan', verifyToken, qrScan);

// TODO: Ajouter les routes suivantes :
// PUT    /api/evenements/:id        → Modifier un événement
// DELETE /api/evenements/:id        → Supprimer (admin)
// GET    /api/evenements/:id/participants → Liste des inscrits
// POST   /api/evenements/:id/inscription → S'inscrire
// Modifier la route GET / pour inclure nb_inscrits et lieu
router.get('/', async (req, res) => {
    try {
        const evenements = await Evenement.find({ stat_event: 'publié' })
            .populate('location', 'name_location gps_coordinates')
            .populate('categories', 'event_type event_categ')
            .sort({ ev_start_time: 1 });
        // Ajouter le compte des inscrits pour chaque événement
        const Participation = require('../models/Participation');
        const resultats = await Promise.all(
            evenements.map(async (ev) => {
                const nb = await Participation.countDocuments({ evenement: ev._id });
                return {
                    ...ev.toObject(),
                    nb_inscrits: nb,
                    lieu: ev.location?.name_location || 'Lieu non défini',
                    description: ev.event_description,
                };
            })
        );

        res.json({ success: true, count: resultats.length, evenements: resultats });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
module.exports = router;