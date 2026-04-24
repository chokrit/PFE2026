// ============================================================
// routes/participations.js  — NOUVEAU FICHIER
// Gérer les inscriptions et présences des utilisateurs
// ============================================================

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const Participation = require('../models/Participation');
const Evenement = require('../models/Evenement');
const Utilisateur = require('../models/Utilisateur');

// ─────────────────────────────────────────────────────────────
// GET /api/participations/mes-inscriptions
// Retourne les événements de l'utilisateur connecté
// ─────────────────────────────────────────────────────────────
router.get('/mes-inscriptions', verifyToken, async (req, res) => {
  try {
    const participations = await Participation.find({
      utilisateur: req.utilisateur._id,
    }).populate({
      path: 'evenement',
      populate: [
        { path: 'location', select: 'name_location' },
        { path: 'categories', select: 'event_type' },
      ],
    });

    const inscriptions = participations.map((p) => ({
      id: p._id,
      eventId: p.evenement?._id,
      titre: p.evenement?.title_event || 'Événement inconnu',
      date: p.evenement?.ev_start_time,
      lieu: p.evenement?.location?.name_location || 'Lieu non défini',
      categorie: p.evenement?.categories?.[0]?.event_type || 'Sport',
      stat_event: p.evenement?.stat_event,
      is_present: p.is_present,
      qr_token: p.evenement?.qr_code_token,
      max_participants: p.evenement?.max_participants || 0,
      nb_inscrits: 0,
      registered_at: p.registered_at,
    }));

    return res.json({ success: true, participations: inscriptions });
  } catch (error) {
    console.error('Erreur mes-inscriptions:', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/participations/:eventId/inscription
// S'inscrire à un événement
// ─────────────────────────────────────────────────────────────
router.post('/:eventId/inscription', verifyToken, async (req, res) => {
  try {
    const { eventId } = req.params;

    // Vérifier que l'événement existe et est publié
    const evenement = await Evenement.findById(eventId);
    if (!evenement) {
      return res.status(404).json({ success: false, message: 'Événement introuvable' });
    }
    if (evenement.stat_event !== 'publié') {
      return res.status(400).json({
        success: false,
        message: "Cet événement n'est pas ouvert aux inscriptions",
      });
    }

    // Vérifier les places disponibles
    const nbInscrits = await Participation.countDocuments({ evenement: eventId });
    if (nbInscrits >= evenement.max_participants) {
      return res.status(400).json({ success: false, message: 'Événement complet' });
    }

    // Vérifier si déjà inscrit
    const dejaInscrit = await Participation.findOne({
      utilisateur: req.utilisateur._id,
      evenement: eventId,
    });
    if (dejaInscrit) {
      return res.status(409).json({
        success: false,
        message: 'Vous êtes déjà inscrit à cet événement',
      });
    }

    // Créer l'inscription
    const participation = await Participation.create({
      utilisateur: req.utilisateur._id,
      evenement: eventId,
      is_present: false,
      registered_at: new Date(),
    });

    console.log('✅ Inscription:', req.utilisateur.email, '→', evenement.title_event);

    return res.status(201).json({
      success: true,
      message: 'Inscription confirmée !',
      participation,
    });
  } catch (error) {
    console.error('Erreur inscription:', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/participations/evenement/:eventId
// Liste des participants d'un événement (admin/organisateur)
// ─────────────────────────────────────────────────────────────
router.get('/evenement/:eventId', verifyToken, async (req, res) => {
  try {
    const participants = await Participation.find({
      evenement: req.params.eventId,
    }).populate('utilisateur', 'first_name last_name email telephone');

    return res.json({ success: true, count: participants.length, participants });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ─────────────────────────────────────────────────────────────
// DELETE /api/participations/:eventId/annuler
// Annuler son inscription
// ─────────────────────────────────────────────────────────────
router.delete('/:eventId/annuler', verifyToken, async (req, res) => {
  try {
    const participation = await Participation.findOneAndDelete({
      utilisateur: req.utilisateur._id,
      evenement: req.params.eventId,
    });

    if (!participation) {
      return res.status(404).json({ success: false, message: 'Inscription introuvable' });
    }

    return res.json({ success: true, message: 'Inscription annulée' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/participations/marquer-present/:participationId
// Marquer manuellement un participant comme présent (organisateur/admin)
// ─────────────────────────────────────────────────────────────
router.post('/marquer-present/:participationId', verifyToken, async (req, res) => {
  try {
    const participation = await Participation.findById(req.params.participationId)
      .populate('evenement', 'createur title_event');

    if (!participation) {
      return res.status(404).json({ success: false, message: 'Participation introuvable' });
    }

    const estCreateur = participation.evenement?.createur?.toString() === req.utilisateur._id.toString();
    const estAdmin = req.utilisateur.role === 'admin';

    if (!estCreateur && !estAdmin) {
      return res.status(403).json({ success: false, message: 'Non autorisé — vous n\'êtes pas le créateur de cet événement' });
    }

    participation.is_present = true;
    participation.scanner_date = new Date();
    await participation.save();

    return res.json({ success: true, message: 'Présence confirmée', participation });
  } catch (error) {
    console.error('Erreur marquer-present:', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

module.exports = router;
