// ============================================================
// controllers/evenementController.js — Gestion des événements
// ============================================================

const Evenement = require('../models/Evenement');
const Participation = require('../models/Participation');

// GET /api/evenements — Liste publique des événements publiés
const getEvenements = async (req, res) => {
    try {
        const evenements = await Evenement.find({ stat_event: 'publié' })
            .populate('createur', 'first_name last_name')  // Infos basiques du créateur
            .populate('location', 'name_location gps_coordinates')
            .populate('categories', 'event_categ event_type')
            .sort({ ev_start_time: 1 });  // Du plus proche au plus lointain

        res.json({ success: true, count: evenements.length, evenements });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};

// POST /api/evenements — Créer un événement
const creerEvenement = async (req, res) => {
    try {
        const evenement = await Evenement.create({
            ...req.body,
            createur: req.utilisateur._id,  // L'utilisateur connecté est le créateur
            stat_event: 'brouillon'          // Toujours brouillon à la création
        });

        res.status(201).json({ success: true, message: 'Événement créé', evenement });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};

// GET /api/evenements/:id — Détail d'un événement
const getEvenement = async (req, res) => {
    try {
        const evenement = await Evenement.findById(req.params.id)
            .populate('createur', 'first_name last_name email')
            .populate('location')
            .populate('categories');

        if (!evenement) {
            return res.status(404).json({ success: false, message: 'Événement introuvable' });
        }

        // Compter les participants inscrits
        const nbParticipants = await Participation.countDocuments({ evenement: req.params.id });

        res.json({ success: true, evenement, nbParticipants });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};

// POST /api/evenements/:id/qr-scan — Valider présence par QR
const qrScan = async (req, res) => {
    try {
        const { qr_code_token, utilisateur_id } = req.body;

        // Vérifier l'événement par token QR
        const evenement = await Evenement.findOne({ qr_code_token });
        if (!evenement) {
            return res.status(404).json({ success: false, message: 'QR Code invalide' });
        }

        // Mettre à jour la participation
        const participation = await Participation.findOneAndUpdate(
            { utilisateur: utilisateur_id, evenement: evenement._id },
            { is_present: true, scanner_date: new Date() },
            { new: true }
        );

        if (!participation) {
            return res.status(404).json({
                success: false,
                message: 'Cet utilisateur n\'est pas inscrit à cet événement'
            });
        }

        // TODO: Calculer et ajouter les points à l'utilisateur
        // TODO: Vérifier les règles de récompense et générer des coupons si seuil atteint

        res.json({ success: true, message: 'Présence confirmée ✅', participation });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};

module.exports = { getEvenements, creerEvenement, getEvenement, qrScan };