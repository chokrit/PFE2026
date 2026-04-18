const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const Participation = require('../models/Participation');
const Evenement = require('../models/Evenement');

// GET /api/participations/mes-inscriptions
// Retourne les événements auxquels l'utilisateur connecté est inscrit
router.get('/mes-inscriptions', verifyToken, async (req, res) => {
    try {
        const participations = await Participation.find({
            utilisateur: req.utilisateur._id
        }).populate({
            path: 'evenement',
            populate: { path: 'location', select: 'name_location' }
        });

        // Formater pour le frontend
        const inscriptions = participations.map(p => ({
            id: p._id,
            titre: p.evenement?.title_event,
            date: p.evenement?.ev_start_time,
            lieu: p.evenement?.location?.name_location || 'Lieu non défini',
            categorie: p.evenement?.categories?.[0] || 'Sport',
            stat_event: p.evenement?.stat_event,
            is_present: p.is_present,
            qr_token: p.evenement?.qr_code_token,
            max_participants: p.evenement?.max_participants,
            nb_inscrits: 0, // TODO: compter depuis Participation
        }));

        res.json({ success: true, participations: inscriptions });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// POST /api/participations/:eventId/inscription
// S'inscrire à un événement
router.post('/:eventId/inscription', verifyToken, async (req, res) => {
    try {
        const { eventId } = req.params;

        // Vérifier que l'événement existe et est publié
        const evenement = await Evenement.findById(eventId);
        if (!evenement) {
            return res.status(404).json({ success: false, message: 'Événement introuvable' });
        }
        if (evenement.stat_event !== 'publié') {
            return res.status(400).json({ success: false, message: 'Cet événement n\'est pas ouvert aux inscriptions' });
        }

        // Vérifier places disponibles
        const nbInscrits = await Participation.countDocuments({ evenement: eventId });
        if (nbInscrits >= evenement.max_participants) {
            return res.status(400).json({ success: false, message: 'Événement complet' });
        }

        // Vérifier non déjà inscrit
        const dejaInscrit = await Participation.findOne({
            utilisateur: req.utilisateur._id,
            evenement: eventId,
        });
        if (dejaInscrit) {
            return res.status(409).json({ success: false, message: 'Vous êtes déjà inscrit à cet événement' });
        }

        // Créer l'inscription
        const participation = await Participation.create({
            utilisateur: req.utilisateur._id,
            evenement: eventId,
            is_present: false,
            registered_at: new Date(),
        });

        res.status(201).json({ success: true, message: 'Inscription confirmée !', participation });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

module.exports = router;