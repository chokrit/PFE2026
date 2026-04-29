// ============================================================
// routes/connexions.js — Système social (likes & partenaires)
// Préfixe : /api/connexions
// ============================================================

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const Connexion = require('../models/Connexion');
const Utilisateur = require('../models/Utilisateur');
const Participation = require('../models/Participation');
const Media = require('../models/Media');

// ── Helper : calculer niveau depuis cumul_points ──
const niveauDepuisPoints = (pts) => {
    if (pts >= 500) return 'Champion';
    if (pts >= 200) return 'Avancé';
    if (pts >= 50)  return 'Actif';
    return 'Débutant';
};

// ─────────────────────────────────────────────────────────────
// GET /api/connexions/participants/:eventId
// Liste des participants visibles avec statut connexion
// ─────────────────────────────────────────────────────────────
router.get('/participants/:eventId', verifyToken, async (req, res) => {
    try {
        const moi = req.utilisateur._id;
        const { eventId } = req.params;

        // Récupérer tous les participants inscrits
        const participations = await Participation.find({ evenement: eventId })
            .populate({
                path: 'utilisateur',
                select: 'first_name last_name cumul_points reliabilite_score sports_preferes bio_sportive score_social visibilite_profil',
                populate: { path: 'sports_preferes', select: 'event_type event_categ' },
            });

        // Récupérer mes connexions pour cet événement
        const mesConnexions = await Connexion.find({
            $or: [{ demandeur: moi }, { receveur: moi }],
            evenement: eventId,
        });

        const resultats = await Promise.all(
            participations
                .filter(p => p.utilisateur && p.utilisateur.visibilite_profil !== 'masque')
                .filter(p => p.utilisateur._id.toString() !== moi.toString())
                .map(async (p) => {
                    const u = p.utilisateur;

                    // Photo profil
                    const photoMedia = await Media.findOne({
                        utilisateur: u._id,
                        type_media: 'photo_profil',
                        statut: 'approuve',
                    }).sort({ uploaded_at: -1 });

                    // Statut connexion avec cet utilisateur
                    const cx = mesConnexions.find(c => {
                        const d = c.demandeur.toString();
                        const r = c.receveur.toString();
                        const uid = u._id.toString();
                        return (d === moi.toString() && r === uid) || (r === moi.toString() && d === uid);
                    });

                    let connexion_statut = null;
                    if (cx) {
                        if (cx.type === 'like') connexion_statut = 'like';
                        else if (cx.statut === 'en_attente') connexion_statut = 'partenaire_en_attente';
                        else if (cx.statut === 'accepte') connexion_statut = 'partenaire_accepte';
                        else connexion_statut = 'partenaire_refuse';
                    }

                    const nbPresences = await Participation.countDocuments({ utilisateur: u._id, is_present: true });

                    return {
                        _id:               u._id,
                        first_name:        u.first_name,
                        last_name:         u.last_name,
                        thumbnail_url:     photoMedia?.thumbnail_url || null,
                        file_url:          photoMedia?.file_url || null,
                        cumul_points:      u.cumul_points,
                        reliabilite_score: u.reliabilite_score,
                        sports_preferes:   u.sports_preferes,
                        bio_sportive:      u.bio_sportive,
                        score_social:      u.score_social,
                        niveau:            niveauDepuisPoints(u.cumul_points),
                        nb_evenements:     nbPresences,
                        connexion_statut,
                        connexion_id:      cx?._id || null,
                    };
                })
        );

        return res.json({ success: true, participants: resultats });
    } catch (error) {
        console.error('❌ Erreur participants:', error.message);
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// ─────────────────────────────────────────────────────────────
// POST /api/connexions/like — Toggle like
// Body: { evenement_id, receveur_id }
// ─────────────────────────────────────────────────────────────
router.post('/like', verifyToken, async (req, res) => {
    try {
        const { evenement_id, receveur_id } = req.body;
        const moi = req.utilisateur._id;

        const existant = await Connexion.findOne({
            demandeur: moi, receveur: receveur_id, evenement: evenement_id, type: 'like',
        });

        if (existant) {
            await Connexion.findByIdAndDelete(existant._id);
            await Utilisateur.findByIdAndUpdate(receveur_id, { $inc: { score_social: -1 } });
            return res.json({ success: true, action: 'unlike' });
        }

        await Connexion.create({ demandeur: moi, receveur: receveur_id, evenement: evenement_id, type: 'like' });
        await Utilisateur.findByIdAndUpdate(receveur_id, { $inc: { score_social: 1 } });
        return res.json({ success: true, action: 'like' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// ─────────────────────────────────────────────────────────────
// POST /api/connexions/partenaire — Demande partenariat
// Body: { evenement_id, receveur_id }
// ─────────────────────────────────────────────────────────────
router.post('/partenaire', verifyToken, async (req, res) => {
    try {
        const { evenement_id, receveur_id } = req.body;
        const moi = req.utilisateur._id;

        const existant = await Connexion.findOne({
            demandeur: moi, receveur: receveur_id, evenement: evenement_id, type: 'partenaire',
        });
        if (existant) {
            return res.status(409).json({ success: false, message: 'Demande déjà envoyée' });
        }

        const cx = await Connexion.create({
            demandeur: moi, receveur: receveur_id, evenement: evenement_id, type: 'partenaire',
        });
        return res.status(201).json({ success: true, connexion: cx });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// ─────────────────────────────────────────────────────────────
// PUT /api/connexions/partenaire/:connexionId
// Body: { statut: 'accepte' | 'refuse' }
// ─────────────────────────────────────────────────────────────
router.put('/partenaire/:connexionId', verifyToken, async (req, res) => {
    try {
        const { statut } = req.body;
        const moi = req.utilisateur._id;

        const cx = await Connexion.findById(req.params.connexionId);
        if (!cx) return res.status(404).json({ success: false, message: 'Connexion introuvable' });
        if (cx.receveur.toString() !== moi.toString()) {
            return res.status(403).json({ success: false, message: 'Non autorisé' });
        }

        cx.statut = statut;
        await cx.save();

        if (statut === 'accepte') {
            await Utilisateur.findByIdAndUpdate(cx.demandeur, { $inc: { score_social: 2 } });
            await Utilisateur.findByIdAndUpdate(cx.receveur,  { $inc: { score_social: 2 } });
        }

        return res.json({ success: true, connexion: cx });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// ─────────────────────────────────────────────────────────────
// POST /api/connexions/noter-collaboration
// Body: { connexionId, note (1-5) }
// ─────────────────────────────────────────────────────────────
router.post('/noter-collaboration', verifyToken, async (req, res) => {
    try {
        const { connexionId, note } = req.body;
        if (!note || note < 1 || note > 5) {
            return res.status(400).json({ success: false, message: 'Note entre 1 et 5' });
        }

        const cx = await Connexion.findById(connexionId);
        if (!cx) return res.status(404).json({ success: false, message: 'Connexion introuvable' });
        if (cx.statut !== 'accepte') {
            return res.status(400).json({ success: false, message: 'Connexion non acceptée' });
        }

        cx.note_collab = note;
        await cx.save();

        // Recalculer score_social du partenaire
        const partenaire = cx.demandeur.toString() === req.utilisateur._id.toString()
            ? cx.receveur : cx.demandeur;
        await Utilisateur.findByIdAndUpdate(partenaire, { $inc: { score_social: Math.round((note - 3) * 0.5) } });

        return res.json({ success: true, message: 'Note enregistrée' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// ─────────────────────────────────────────────────────────────
// GET /api/connexions/mes-connexions
// ─────────────────────────────────────────────────────────────
router.get('/mes-connexions', verifyToken, async (req, res) => {
    try {
        const moi = req.utilisateur._id;
        const connexions = await Connexion.find({
            $or: [{ demandeur: moi }, { receveur: moi }],
        })
            .populate('demandeur', 'first_name last_name photo')
            .populate('receveur',  'first_name last_name photo')
            .populate('evenement', 'title_event')
            .sort({ created_at: -1 });

        const groupes = {
            demandes_recues:    connexions.filter(c => c.type === 'partenaire' && c.statut === 'en_attente' && c.receveur._id.toString() === moi.toString()),
            partenaires:        connexions.filter(c => c.type === 'partenaire' && c.statut === 'accepte'),
            likes_donnes:       connexions.filter(c => c.type === 'like' && c.demandeur._id.toString() === moi.toString()),
            likes_recus:        connexions.filter(c => c.type === 'like' && c.receveur._id.toString() === moi.toString()),
        };

        return res.json({ success: true, connexions: groupes });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

module.exports = router;
