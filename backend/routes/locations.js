// ============================================================
// routes/locations.js — Lieux des événements
// Préfixe : /api/locations
//
// ROUTES :
//   GET  /                  → liste des lieux actifs (connecté)
//   POST /suggerer          → soumettre un nouveau lieu (connecté)
//   GET  /suggestions       → voir les suggestions en attente (orga/admin)
//   PUT  /:id/valider       → valider une suggestion (orga/admin)
//   PUT  /:id/refuser       → refuser une suggestion (orga/admin)
//   POST /                  → créer directement (orga/admin)
// ============================================================

const express      = require('express');
const router       = express.Router();
const { verifyToken, isOrganisateur } = require('../middleware/auth');
const Location     = require('../models/Location');
const Notification = require('../models/Notification');
const Utilisateur  = require('../models/Utilisateur');

// ─────────────────────────────────────────────────────────────
// GET /api/locations
// Retourne les lieux actifs + anciens documents sans statut
// (backward compatible avec les docs créés avant l'ajout du champ).
// ─────────────────────────────────────────────────────────────
router.get('/', verifyToken, async (req, res) => {
    try {
        const locations = await Location
            .find({ statut: { $nin: ['en_attente', 'refusee'] } })
            .sort({ name_location: 1 });
        return res.json({ success: true, locations });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// ─────────────────────────────────────────────────────────────
// POST /api/locations/suggerer
// Tout utilisateur connecté peut proposer un nouveau lieu.
// Body : { name_location, location_capacity?, raison_suggestion? }
// ─────────────────────────────────────────────────────────────
router.post('/suggerer', verifyToken, async (req, res) => {
    try {
        const { name_location, location_capacity, raison_suggestion } = req.body;

        if (!name_location?.trim()) {
            return res.status(400).json({ success: false, message: 'Le nom du lieu est obligatoire' });
        }

        // Vérifier doublon (insensible à la casse)
        const escaped = name_location.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const existe = await Location.findOne({
            name_location: { $regex: new RegExp(`^${escaped}$`, 'i') },
            statut: { $in: ['active', 'en_attente'] },
        });
        if (existe) {
            return res.status(409).json({
                success: false,
                message: 'Ce lieu existe déjà ou est déjà en cours de validation',
            });
        }

        const loc = await Location.create({
            name_location:     name_location.trim(),
            location_capacity: location_capacity ? Number(location_capacity) : 0,
            raison_suggestion: raison_suggestion?.trim() || '',
            suggere_par:       req.utilisateur._id,
            statut:            'en_attente',
        });

        // Notifier tous les admins et organisateurs
        const destinataires = await Utilisateur.find(
            { role: { $in: ['admin', 'organisateur'] } },
            '_id'
        );
        if (destinataires.length > 0) {
            const docs = destinataires.map(u => ({
                utilisateur: u._id,
                type:        'systeme',
                titre:       '📍 Nouveau lieu suggéré',
                message:     `${req.utilisateur.first_name} ${req.utilisateur.last_name} propose d'ajouter le lieu "${loc.name_location}". Rendez-vous dans Lieux & Catégories pour valider ou refuser.`,
            }));
            await Notification.insertMany(docs, { ordered: false }).catch(() => {});
        }

        return res.status(201).json({
            success: true,
            message: 'Suggestion de lieu envoyée ! Elle sera examinée par l\'équipe.',
            location: loc,
        });
    } catch (err) {
        console.error('❌ Erreur POST /locations/suggerer:', err.message);
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// ─────────────────────────────────────────────────────────────
// GET /api/locations/suggestions
// Liste des lieux en attente de validation (orga/admin).
// ─────────────────────────────────────────────────────────────
router.get('/suggestions', verifyToken, isOrganisateur, async (req, res) => {
    try {
        const suggestions = await Location
            .find({ statut: 'en_attente' })
            .populate('suggere_par', 'first_name last_name email')
            .sort({ createdAt: -1 });
        return res.json({ success: true, suggestions });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// ─────────────────────────────────────────────────────────────
// PUT /api/locations/:id/valider
// Passe le lieu en 'active' — visible dans les listes.
// ─────────────────────────────────────────────────────────────
router.put('/:id/valider', verifyToken, isOrganisateur, async (req, res) => {
    try {
        const loc = await Location.findById(req.params.id).populate('suggere_par', '_id first_name');
        if (!loc) return res.status(404).json({ success: false, message: 'Lieu introuvable' });
        if (loc.statut !== 'en_attente') {
            return res.status(400).json({ success: false, message: 'Cette suggestion n\'est plus en attente' });
        }

        loc.statut = 'active';
        await loc.save();

        if (loc.suggere_par?._id) {
            await Notification.create({
                utilisateur: loc.suggere_par._id,
                type:        'systeme',
                titre:       '✅ Votre lieu a été accepté !',
                message:     `Le lieu "${loc.name_location}" a été validé et est maintenant disponible pour tous les événements.`,
            });
        }

        return res.json({ success: true, message: `"${loc.name_location}" ajouté à la liste des lieux`, location: loc });
    } catch (err) {
        console.error('❌ Erreur PUT /locations/:id/valider:', err.message);
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// ─────────────────────────────────────────────────────────────
// PUT /api/locations/:id/refuser
// Passe le lieu en 'refusee' — masqué partout.
// Body : { raison? }
// ─────────────────────────────────────────────────────────────
router.put('/:id/refuser', verifyToken, isOrganisateur, async (req, res) => {
    try {
        const loc = await Location.findById(req.params.id).populate('suggere_par', '_id first_name');
        if (!loc) return res.status(404).json({ success: false, message: 'Lieu introuvable' });

        loc.statut = 'refusee';
        await loc.save();

        if (loc.suggere_par?._id) {
            const raison = req.body.raison?.trim();
            await Notification.create({
                utilisateur: loc.suggere_par._id,
                type:        'systeme',
                titre:       '❌ Suggestion de lieu non retenue',
                message:     `Votre suggestion "${loc.name_location}" n'a pas été retenue.${raison ? ` Raison : ${raison}` : ' N\'hésitez pas à proposer d\'autres lieux !'}`,
            });
        }

        return res.json({ success: true, message: `Suggestion "${loc.name_location}" refusée` });
    } catch (err) {
        console.error('❌ Erreur PUT /locations/:id/refuser:', err.message);
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// ─────────────────────────────────────────────────────────────
// POST /api/locations — Créer directement sans validation
// Réservé aux organisateurs et admins.
// ─────────────────────────────────────────────────────────────
router.post('/', verifyToken, isOrganisateur, async (req, res) => {
    try {
        const { name_location, location_capacity, is_official, gps_coordinates } = req.body;
        if (!name_location) {
            return res.status(400).json({ success: false, message: 'Le nom du lieu est obligatoire' });
        }
        const location = await Location.create({
            name_location,
            location_capacity: location_capacity || 0,
            is_official:       is_official || false,
            gps_coordinates:   gps_coordinates || {},
            statut:            'active',
        });
        return res.status(201).json({ success: true, message: 'Lieu créé', location });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

module.exports = router;
