// ============================================================
// routes/equipes.js — Gestion des équipes d'événements
// Préfixe : /api/equipes
// ============================================================

const express = require('express');
const router = express.Router();
const { verifyToken, isOrganisateur } = require('../middleware/auth');
const Equipe = require('../models/Equipe');
const Connexion = require('../models/Connexion');
const Participation = require('../models/Participation');
const Utilisateur = require('../models/Utilisateur');

// ── Helper : calculer niveau ──
const niveau = (pts) => pts >= 500 ? 3 : pts >= 200 ? 2 : pts >= 50 ? 1 : 0;

// ─────────────────────────────────────────────────────────────
// GET /api/equipes/evenement/:eventId
// ─────────────────────────────────────────────────────────────
router.get('/evenement/:eventId', verifyToken, async (req, res) => {
    try {
        const equipes = await Equipe.find({ evenement: req.params.eventId })
            .populate('membres', 'first_name last_name photo cumul_points')
            .populate('capitaine', 'first_name last_name')
            .populate('valide_par', 'first_name last_name')
            .sort({ created_at: -1 });

        return res.json({ success: true, equipes });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// ─────────────────────────────────────────────────────────────
// POST /api/equipes/manuelle — isOrganisateur
// Body: { evenement_id, nom_equipe, couleur, membres[], capitaine }
// ─────────────────────────────────────────────────────────────
router.post('/manuelle', verifyToken, isOrganisateur, async (req, res) => {
    try {
        const { evenement_id, nom_equipe, couleur, membres, capitaine } = req.body;
        if (!evenement_id || !nom_equipe) {
            return res.status(400).json({ success: false, message: 'evenement_id et nom_equipe requis' });
        }

        const equipe = await Equipe.create({
            evenement: evenement_id,
            nom_equipe,
            couleur:  couleur || 'bleu',
            membres:  membres || [],
            capitaine: capitaine || null,
            type_creation: 'manuelle',
            statut: 'validee',
            valide_par: req.utilisateur._id,
        });

        return res.status(201).json({ success: true, equipe });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// ─────────────────────────────────────────────────────────────
// POST /api/equipes/automatique — isOrganisateur
// Body: { evenement_id, nb_equipes, taille_equipe }
// Retourne les équipes suggérées SANS les sauvegarder
// ─────────────────────────────────────────────────────────────
router.post('/automatique', verifyToken, isOrganisateur, async (req, res) => {
    try {
        const { evenement_id, nb_equipes, taille_equipe } = req.body;
        if (!evenement_id || !nb_equipes) {
            return res.status(400).json({ success: false, message: 'evenement_id et nb_equipes requis' });
        }

        // Récupérer les participants
        const participations = await Participation.find({ evenement: evenement_id })
            .populate('utilisateur', 'first_name last_name cumul_points reliabilite_score photo');

        const participants = participations.map(p => p.utilisateur).filter(Boolean);
        if (participants.length < 2) {
            return res.status(400).json({ success: false, message: 'Pas assez de participants' });
        }

        // Récupérer toutes les connexions pour cet événement
        const connexions = await Connexion.find({ evenement: evenement_id });

        // Calculer score d'affinité entre chaque paire
        const scoreAffinite = (a, b) => {
            const aId = a._id.toString();
            const bId = b._id.toString();
            let score = 0;

            // Partenariat accepté × 0.40
            const partenaire = connexions.find(c =>
                c.type === 'partenaire' && c.statut === 'accepte' &&
                ((c.demandeur.toString() === aId && c.receveur.toString() === bId) ||
                 (c.demandeur.toString() === bId && c.receveur.toString() === aId))
            );
            if (partenaire) score += 0.40;

            // Refus → ne pas grouper ensemble
            const refuse = connexions.find(c =>
                c.type === 'partenaire' && c.statut === 'refuse' &&
                ((c.demandeur.toString() === aId && c.receveur.toString() === bId) ||
                 (c.demandeur.toString() === bId && c.receveur.toString() === aId))
            );
            if (refuse) return -999; // forcer séparation

            // Likes mutuels × 0.20
            const likeA = connexions.find(c => c.type === 'like' && c.demandeur.toString() === aId && c.receveur.toString() === bId);
            const likeB = connexions.find(c => c.type === 'like' && c.demandeur.toString() === bId && c.receveur.toString() === aId);
            if (likeA && likeB) score += 0.20;
            else if (likeA || likeB) score += 0.10;

            // Note collab moyenne × 0.25
            if (partenaire?.note_collab) score += (partenaire.note_collab / 5) * 0.25;

            // Même niveau × 0.15
            if (niveau(a.cumul_points) === niveau(b.cumul_points)) score += 0.15;

            return score;
        };

        // Algorithme glouton : répartir en équipes équilibrées
        const n = parseInt(nb_equipes);
        const equipes = Array.from({ length: n }, (_, i) => ({
            nom_equipe: `Équipe ${i + 1}`,
            couleur: ['rouge', 'bleu', 'vert', 'jaune', 'orange', 'violet'][i % 6],
            membres: [],
            type_creation: 'automatique',
            statut: 'proposee',
            score_affinite: 0,
        }));

        // Mélanger les participants d'abord
        const shuffled = [...participants].sort(() => Math.random() - 0.5);

        shuffled.forEach((participant, idx) => {
            // Choisir l'équipe avec le plus petit nombre de membres
            let cible = equipes.reduce((best, eq, i) =>
                eq.membres.length < equipes[best].membres.length ? i : best, 0);

            // Parmi les équipes avec le moins de membres, choisir celle avec le meilleur score
            const minSize = equipes[cible].membres.length;
            const candidats = equipes
                .map((eq, i) => ({ i, eq }))
                .filter(({ eq }) => eq.membres.length === minSize);

            let meilleurScore = -Infinity;
            candidats.forEach(({ i, eq }) => {
                const scoreTotal = eq.membres.reduce((acc, m) => acc + scoreAffinite(participant, m), 0);
                if (scoreTotal > meilleurScore) { meilleurScore = scoreTotal; cible = i; }
            });

            equipes[cible].membres.push(participant);
            equipes[cible].score_affinite += Math.max(0, meilleurScore);
        });

        return res.json({ success: true, suggestion: equipes });
    } catch (error) {
        console.error('❌ Erreur équipes auto:', error.message);
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// ─────────────────────────────────────────────────────────────
// PUT /api/equipes/:equipeId — Modifier une équipe
// ─────────────────────────────────────────────────────────────
router.put('/:equipeId', verifyToken, isOrganisateur, async (req, res) => {
    try {
        const { nom_equipe, couleur, membres, capitaine } = req.body;
        const equipe = await Equipe.findByIdAndUpdate(
            req.params.equipeId,
            { nom_equipe, couleur, membres, capitaine },
            { new: true, runValidators: true }
        ).populate('membres', 'first_name last_name');

        if (!equipe) return res.status(404).json({ success: false, message: 'Équipe introuvable' });
        return res.json({ success: true, equipe });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// ─────────────────────────────────────────────────────────────
// POST /api/equipes/:equipeId/valider — Valider et notifier
// ─────────────────────────────────────────────────────────────
router.post('/:equipeId/valider', verifyToken, isOrganisateur, async (req, res) => {
    try {
        const equipe = await Equipe.findByIdAndUpdate(
            req.params.equipeId,
            { statut: 'validee', valide_par: req.utilisateur._id },
            { new: true }
        );
        if (!equipe) return res.status(404).json({ success: false, message: 'Équipe introuvable' });
        return res.json({ success: true, equipe });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// ─────────────────────────────────────────────────────────────
// DELETE /api/equipes/:equipeId/membre/:userId
// ─────────────────────────────────────────────────────────────
router.delete('/:equipeId/membre/:userId', verifyToken, isOrganisateur, async (req, res) => {
    try {
        const equipe = await Equipe.findByIdAndUpdate(
            req.params.equipeId,
            { $pull: { membres: req.params.userId } },
            { new: true }
        );
        if (!equipe) return res.status(404).json({ success: false, message: 'Équipe introuvable' });
        return res.json({ success: true, equipe });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

module.exports = router;
