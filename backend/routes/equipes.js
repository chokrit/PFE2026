// ============================================================
// routes/equipes.js — Gestion des équipes d'événements
// Préfixe : /api/equipes
// ============================================================

const express = require('express');
const router = express.Router();
const { verifyToken, isOrganisateur } = require('../middleware/auth');
const Equipe        = require('../models/Equipe');
const Connexion     = require('../models/Connexion');
const Participation = require('../models/Participation');
const Utilisateur   = require('../models/Utilisateur');
const Evenement     = require('../models/Evenement');
const Notification  = require('../models/Notification');
const Interest      = require('../models/Interest');

// Service IA de formation d'équipes
// Algorithme glouton avec score d'affinité (partenariat, likes, collaboration, niveau)
const { genererEquipesSuggeres } = require('../services/iaEquipeService');

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

// ─────────────────────────────────────────────────────────────
// GET /api/equipes/suggestions/:eventId?tailleEquipe=4
// isOrganisateur — suggestion IA d'équipes pour un événement
//
// Appelle le service iaEquipeService qui :
//   1. Charge les participants inscrits à l'événement
//   2. Charge toutes leurs connexions all-time (pas event-scoped)
//   3. Calcule le score d'affinité entre chaque paire :
//        score = partenariat×0.40 + likes×0.20
//              + collaboration×0.25 + niveau×0.15
//   4. Regroupe via algorithme glouton en respectant
//      la règle d'exclusion (refus de partenariat = jamais ensemble)
//
// NE SAUVEGARDE RIEN — retourne uniquement la proposition.
// Pour valider et sauvegarder, utiliser POST /api/equipes/manuelle
// avec les membres choisis par l'organisateur.
//
// Query param :
//   tailleEquipe — nombre de membres par équipe (défaut 4, min 2)
// ─────────────────────────────────────────────────────────────
router.get('/suggestions/:eventId', verifyToken, async (req, res) => {
    try {
        const tailleEquipe = parseInt(req.query.tailleEquipe) || 4;

        if (tailleEquipe < 2) {
            return res.status(400).json({
                success: false,
                message: 'La taille d\'équipe doit être d\'au moins 2 membres',
            });
        }

        // Contrôle d'accès : admin → tout événement ; orga/user → seulement les leurs
        const evAcces = await Evenement.findById(req.params.eventId).select('createur');
        if (!evAcces) return res.status(404).json({ success: false, message: 'Événement introuvable' });
        if (req.utilisateur.role !== 'admin' && evAcces.createur.toString() !== req.utilisateur._id.toString()) {
            return res.status(403).json({ success: false, message: 'Accès refusé — vous n\'êtes pas le créateur de cet événement' });
        }

        const resultat = await genererEquipesSuggeres(req.params.eventId, tailleEquipe);

        return res.json({ success: true, ...resultat });
    } catch (error) {
        console.error('❌ Erreur suggestions équipes IA:', error.message);
        // Retourner le message d'erreur métier (ex: "pas assez de participants")
        return res.status(400).json({ success: false, message: error.message || 'Erreur serveur' });
    }
});

// ─────────────────────────────────────────────────────────────
// POST /api/equipes/valider-lot — isOrganisateur
//
// Sauvegarde TOUTES les équipes suggérées par l'IA en une seule
// requête, puis envoie une notification (type 'systeme') à chaque
// membre assigné.
//
// Body :
//   {
//     evenement_id : ObjectId,
//     equipes      : [
//       { nom, membres: [userId, ...], score_moyen }
//     ]
//   }
//
// Retourne les équipes créées avec leurs IDs en base.
// ─────────────────────────────────────────────────────────────
const COULEURS_EQUIPES = ['rouge', 'bleu', 'vert', 'jaune', 'orange', 'violet'];

router.post('/valider-lot', verifyToken, async (req, res) => {
    try {
        const { equipes, evenement_id } = req.body;

        if (!Array.isArray(equipes) || equipes.length === 0) {
            return res.status(400).json({ success: false, message: 'equipes[] est requis et ne peut pas être vide' });
        }
        if (!evenement_id) {
            return res.status(400).json({ success: false, message: 'evenement_id est requis' });
        }

        // Récupérer l'événement + contrôle d'accès
        const ev = await Evenement.findById(evenement_id).select('title_event categories createur');
        if (!ev) {
            return res.status(404).json({ success: false, message: 'Événement introuvable' });
        }
        // Admin → tout événement ; orga/user → seulement les leurs
        if (req.utilisateur.role !== 'admin' && ev.createur.toString() !== req.utilisateur._id.toString()) {
            return res.status(403).json({ success: false, message: 'Accès refusé — vous n\'êtes pas le créateur de cet événement' });
        }

        const equipesCreees = [];

        for (let i = 0; i < equipes.length; i++) {
            const eq = equipes[i];
            const membres = eq.membres || [];
            const nomEquipe = eq.nom || `Équipe ${i + 1}`;

            // ── Créer l'équipe en base ────────────────────────
            const equipe = await Equipe.create({
                evenement:       evenement_id,
                nom_equipe:      nomEquipe,
                couleur:         COULEURS_EQUIPES[i % COULEURS_EQUIPES.length],
                membres:         membres,
                type_creation:   'automatique',
                statut:          'validee',
                valide_par:      req.utilisateur._id,
            });
            equipesCreees.push(equipe);

            // ── Notifier chaque membre de son assignation ─────
            for (const userId of membres) {
                await Notification.create({
                    utilisateur: userId,
                    evenement:   evenement_id,
                    type:        'systeme',
                    titre:       `Équipe assignée — ${ev.title_event}`,
                    message:     `Vous avez été assigné à l'équipe "${nomEquipe}" pour l'événement "${ev.title_event}". Bonne chance !`,
                });
            }

            // EMAIL STUB — nodemailer non configuré.
            // Remplacer ce log par un appel sendMail() une fois le SMTP configuré dans .env.
            if (membres.length > 0) {
                console.log(`[EMAIL STUB] Équipe "${nomEquipe}" (event: "${ev.title_event}") — notification email à envoyer à ${membres.length} membre(s)`);
            }
        }

        // ── Notification aux utilisateurs pertinents non encore inscrits ──
        // Réutilise la source de données de iaSuggestionService (Interest.categorie)
        // pour identifier les utilisateurs ayant un historique dans les catégories
        // de l'événement. Exclut les inscrits, admins et organisateurs.
        // Cap à 15 destinataires pour éviter le spam.
        if (ev.categories?.length > 0) {
            const inscrits = await Participation.find({ evenement: evenement_id }).select('utilisateur');
            const idInscrits = new Set(inscrits.map(p => p.utilisateur.toString()));

            const interests = await Interest.find({
                categorie:         { $in: ev.categories },
                nb_participations: { $gte: 1 },
            })
                .populate('utilisateur', '_id role')
                .sort({ nb_participations: -1 })
                .limit(60);

            const vus = new Set();
            const candidats = [];
            for (const int of interests) {
                const u = int.utilisateur;
                if (!u?._id) continue;
                const uid = u._id.toString();
                if (vus.has(uid)) continue;
                if (idInscrits.has(uid)) continue;
                if (['admin', 'organisateur'].includes(u.role)) continue;
                vus.add(uid);
                candidats.push(uid);
                if (candidats.length >= 15) break;
            }

            if (candidats.length > 0) {
                const notifsNonInscrits = candidats.map(uid => ({
                    utilisateur: uid,
                    evenement:   evenement_id,
                    type:        'systeme',
                    titre:       `Des équipes ont été formées — ${ev.title_event}`,
                    message:     `Des équipes viennent d'être constituées pour l'événement "${ev.title_event}". Rejoignez-le avant qu'il ne soit complet !`,
                }));
                await Notification.insertMany(notifsNonInscrits, { ordered: false }).catch(() => {});
                console.log(`📨 ${candidats.length} utilisateurs non inscrits notifiés — event ${evenement_id}`);
            }
        }

        console.log(`✅ ${equipesCreees.length} équipes créées et membres notifiés — event ${evenement_id}`);
        return res.status(201).json({
            success:    true,
            equipes:    equipesCreees,
            nb_equipes: equipesCreees.length,
        });
    } catch (error) {
        console.error('❌ Erreur valider-lot équipes:', error.message);
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

module.exports = router;
