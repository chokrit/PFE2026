// ============================================================
// controllers/utilisateurController.js — Gestion des profils
// ============================================================

const Utilisateur = require('../models/Utilisateur');

// GET /api/utilisateurs — Liste tous les utilisateurs (admin only)
const getTousUtilisateurs = async (req, res) => {
    try {
        const utilisateurs = await Utilisateur.find().select('-password_hash').sort({ created_at: -1 });

        res.json({
            success: true,
            count: utilisateurs.length,
            utilisateurs
        });
    } catch (error) {
        console.error('getTousUtilisateurs:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};

// GET /api/utilisateurs/:id — Profil d'un utilisateur
const getUtilisateur = async (req, res) => {
    try {
        const utilisateur = await Utilisateur.findById(req.params.id).select('-password_hash');

        if (!utilisateur) {
            return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
        }

        res.json({ success: true, utilisateur });
    } catch (error) {
        console.error('getUtilisateur:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};

// PUT /api/utilisateurs/:id — Modifier son profil
const modifierUtilisateur = async (req, res) => {
    try {
        const champsInterdits = ['role', 'password_hash', 'email', 'reliabilite_score',
            'cumul_points', 'cumul_heures_participation'];

        const updates = { ...req.body };
        champsInterdits.forEach(champ => delete updates[champ]);

        if (req.utilisateur._id.toString() !== req.params.id && req.utilisateur.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Action non autorisée' });
        }

        const utilisateur = await Utilisateur.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true, runValidators: true }
        ).select('-password_hash');

        if (!utilisateur) {
            return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
        }

        res.json({ success: true, message: 'Profil mis à jour', utilisateur });

    } catch (error) {
        console.error('modifierUtilisateur:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};

// DELETE /api/utilisateurs/:id — Supprimer (admin only)
const supprimerUtilisateur = async (req, res) => {
    try {
        const utilisateur = await Utilisateur.findByIdAndDelete(req.params.id);

        if (!utilisateur) {
            return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
        }

        res.json({ success: true, message: 'Utilisateur supprimé' });

    } catch (error) {
        console.error('supprimerUtilisateur:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};

// PUT /api/utilisateurs/:id/role — Changer le rôle (admin only)
const changerRole = async (req, res) => {
    try {
        const { role } = req.body;

        if (!['user', 'admin'].includes(role)) {
            return res.status(400).json({ success: false, message: 'Rôle invalide' });
        }

        const utilisateur = await Utilisateur.findByIdAndUpdate(
            req.params.id,
            { role },
            { new: true }
        ).select('-password_hash');

        if (!utilisateur) {
            return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
        }

        res.json({
            success: true,
            message: `Rôle changé en "${role}" pour ${utilisateur.first_name}`,
            utilisateur
        });

    } catch (error) {
        console.error('changerRole:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};

module.exports = {
    getTousUtilisateurs,
    getUtilisateur,
    modifierUtilisateur,
    supprimerUtilisateur,
    changerRole
};
