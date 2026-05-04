// ============================================================
// routes/categories.js — Catégories sportives
// Préfixe : /api/categories
//
// ROUTES :
//   GET  /                  → liste des catégories actives (public)
//   POST /suggerer          → soumettre une nouvelle catégorie (connecté)
//   GET  /suggestions       → voir les suggestions en attente (orga/admin)
//   PUT  /:id/valider       → valider une suggestion (orga/admin)
//   PUT  /:id/refuser       → refuser une suggestion (orga/admin)
// ============================================================

const express  = require('express');
const router   = express.Router();
const { verifyToken, isOrganisateur } = require('../middleware/auth');
const Categorie  = require('../models/Categorie');
const Notification = require('../models/Notification');
const Utilisateur  = require('../models/Utilisateur');

// ─────────────────────────────────────────────────────────────
// GET /api/categories
// Retourne uniquement les catégories actives (statut:'active').
// Accessible sans connexion — utilisé dans les formulaires
// d'événements et dans les préférences sportives.
// ─────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const categories = await Categorie
            .find({ statut: 'active' })
            .sort({ event_categ: 1, event_type: 1 });
        return res.json({ success: true, categories });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// ─────────────────────────────────────────────────────────────
// POST /api/categories/suggerer
// Tout utilisateur connecté peut proposer un nouveau sport.
// La suggestion part en statut 'en_attente' et une notification
// est envoyée à tous les admins et organisateurs.
//
// Body : { event_categ, event_type, raison_suggestion? }
// ─────────────────────────────────────────────────────────────
router.post('/suggerer', verifyToken, async (req, res) => {
    try {
        const { event_categ, event_type, raison_suggestion } = req.body;

        if (!event_categ?.trim() || !event_type?.trim()) {
            return res.status(400).json({ success: false, message: 'Groupe et sport obligatoires' });
        }

        // Vérifier qu'une catégorie identique n'existe pas déjà
        const existe = await Categorie.findOne({
            event_categ: { $regex: new RegExp(`^${event_categ.trim()}$`, 'i') },
            event_type:  { $regex: new RegExp(`^${event_type.trim()}$`, 'i') },
            statut: { $in: ['active', 'en_attente'] },
        });
        if (existe) {
            return res.status(409).json({
                success: false,
                message: 'Ce sport existe déjà ou est déjà en cours de validation',
            });
        }

        const cat = await Categorie.create({
            event_categ:       event_categ.trim(),
            event_type:        event_type.trim(),
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
                titre:       '💡 Nouvelle suggestion de sport',
                message:     `${req.utilisateur.first_name} ${req.utilisateur.last_name} propose d'ajouter "${event_type}" dans "${event_categ}". Rendez-vous dans la section Catégories pour valider ou refuser.`,
            }));
            await Notification.insertMany(docs, { ordered: false }).catch(() => {});
        }

        return res.status(201).json({
            success: true,
            message: 'Suggestion envoyée ! Elle sera examinée par l\'équipe.',
            categorie: cat,
        });
    } catch (err) {
        console.error('❌ Erreur POST /suggerer:', err.message);
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// ─────────────────────────────────────────────────────────────
// GET /api/categories/suggestions
// Liste des catégories en attente de validation.
// Réservé aux organisateurs et admins.
// ─────────────────────────────────────────────────────────────
router.get('/suggestions', verifyToken, isOrganisateur, async (req, res) => {
    try {
        const suggestions = await Categorie
            .find({ statut: 'en_attente' })
            .populate('suggere_par', 'first_name last_name email')
            .sort({ createdAt: -1 });
        return res.json({ success: true, suggestions });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// ─────────────────────────────────────────────────────────────
// PUT /api/categories/:id/valider
// Passe la catégorie en 'active' → elle devient visible partout.
// Envoie une notification de confirmation au suggéreur.
// ─────────────────────────────────────────────────────────────
router.put('/:id/valider', verifyToken, isOrganisateur, async (req, res) => {
    try {
        const cat = await Categorie.findById(req.params.id).populate('suggere_par', '_id first_name');
        if (!cat) return res.status(404).json({ success: false, message: 'Catégorie introuvable' });
        if (cat.statut !== 'en_attente') {
            return res.status(400).json({ success: false, message: 'Cette suggestion n\'est plus en attente' });
        }

        cat.statut = 'active';
        await cat.save();

        // Notifier le suggéreur si disponible
        if (cat.suggere_par?._id) {
            await Notification.create({
                utilisateur: cat.suggere_par._id,
                type:        'systeme',
                titre:       '✅ Votre suggestion a été acceptée !',
                message:     `Super nouvelle ! Le sport "${cat.event_type}" dans "${cat.event_categ}" a été validé et est maintenant disponible pour tous.`,
            });
        }

        return res.json({ success: true, message: `"${cat.event_type}" ajouté à la liste des sports`, categorie: cat });
    } catch (err) {
        console.error('❌ Erreur PUT /valider:', err.message);
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// ─────────────────────────────────────────────────────────────
// PUT /api/categories/:id/refuser
// Passe la catégorie en 'refusee' — masquée partout.
// Body : { raison? }  — raison optionnelle envoyée dans la notif.
// ─────────────────────────────────────────────────────────────
router.put('/:id/refuser', verifyToken, isOrganisateur, async (req, res) => {
    try {
        const cat = await Categorie.findById(req.params.id).populate('suggere_par', '_id first_name');
        if (!cat) return res.status(404).json({ success: false, message: 'Catégorie introuvable' });

        cat.statut = 'refusee';
        await cat.save();

        // Notifier le suggéreur si disponible
        if (cat.suggere_par?._id) {
            const raison = req.body.raison?.trim();
            await Notification.create({
                utilisateur: cat.suggere_par._id,
                type:        'systeme',
                titre:       '❌ Suggestion non retenue',
                message:     `Votre suggestion "${cat.event_type}" n'a pas été retenue.${raison ? ` Raison : ${raison}` : ' N\'hésitez pas à proposer d\'autres sports !'}`,
            });
        }

        return res.json({ success: true, message: `Suggestion "${cat.event_type}" refusée` });
    } catch (err) {
        console.error('❌ Erreur PUT /refuser:', err.message);
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

module.exports = router;
