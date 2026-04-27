// ============================================================
// routes/utilisateurs.js — Routes de gestion des utilisateurs
// Préfixe : /api/utilisateurs
// ============================================================

//const express = require('express');
//const router = express.Router();
//const { verifyToken, isAdmin } = require('../middleware/auth');
//const {
// getTousUtilisateurs,
// getUtilisateur,
//modifierUtilisateur,
//supprimerUtilisateur,
//changerRole
//} = require('../controllers/utilisateurController');

// GET /api/utilisateurs — Liste complète (admin seulement)
//router.get('/', verifyToken, isAdmin, getTousUtilisateurs);

// GET /api/utilisateurs/:id — Profil d'un utilisateur (connecté)
//router.get('/:id', verifyToken, getUtilisateur);

// PUT /api/utilisateurs/:id — Modifier son profil (soi-même ou admin)
//router.put('/:id', verifyToken, modifierUtilisateur);

// DELETE /api/utilisateurs/:id — Supprimer (admin seulement)
//router.delete('/:id', verifyToken, isAdmin, supprimerUtilisateur);

// PUT /api/utilisateurs/:id/role — Changer le rôle (admin seulement)
//router.put('/:id/role', verifyToken, isAdmin, changerRole);

//module.exports = router;
//============================================================
// ============================================================
// models/Utilisateur.js
// CORRECTION : 3ème argument de mongoose.model() = nom exact
//              de la collection dans Atlas → 'utilisateur' (sans s)
// ============================================================

// ============================================================
// routes/utilisateurs.js
// Emplacement : backend/routes/utilisateurs.js
//
// PROBLÈMES CORRIGÉS :
//   1. La collection s'appelle "utilisateur" (sans s) dans Atlas
//      → Mongoose doit recevoir le 3ème argument dans le modèle
//   2. GET /api/utilisateurs retournait [] car il cherchait dans
//      "utilisateurs" (avec s) au lieu de "utilisateur"
//   3. Ajout de logs console pour déboguer facilement
//
// POUR MODIFIER PLUS TARD :
//   - Ajouter pagination : ?page=1&limit=20 dans la route GET /
//   - Ajouter tri : ?sort=created_at&order=desc
//   - Ajouter filtre par rôle : ?role=admin
// ============================================================

const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middleware/auth');
const Utilisateur = require('../models/Utilisateur');
const Interest = require('../models/Interest');
const Categorie = require('../models/Categorie');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ─────────────────────────────────────────────────────────────
// POST /api/utilisateurs/upload-photo
// Upload une photo de profil vers Cloudinary — utilisateur connecté
// Body : { image: "data:image/jpeg;base64,..." }
// ─────────────────────────────────────────────────────────────
router.post('/upload-photo', verifyToken, async (req, res) => {
    try {
        const { image } = req.body;
        if (!image) return res.status(400).json({ success: false, message: 'Image requise' });

        const result = await cloudinary.uploader.upload(image, {
            folder: 'event-app/profiles',
            public_id: `user_${req.utilisateur._id}`,
            overwrite: true,
            transformation: [{ width: 300, height: 300, crop: 'fill', gravity: 'face' }],
        });

        console.log(`✅ Photo uploadée : ${result.secure_url}`);
        return res.json({ success: true, url: result.secure_url });
    } catch (error) {
        console.error('❌ Erreur upload photo Cloudinary:', error.message);
        return res.status(500).json({ success: false, message: 'Erreur upload photo' });
    }
});

// ─────────────────────────────────────────────────────────────
// GET /api/utilisateurs
// Liste tous les utilisateurs — admin seulement
//
// POURQUOI ÇA NE MARCHAIT PAS :
//   Mongoose crée une collection avec le nom du modèle mis en
//   minuscule + "s" par défaut → "utilisateurs".
//   Mais dans Atlas la collection s'appelle "utilisateur" (sans s).
//   FIX : le 3ème argument de mongoose.model() dans Utilisateur.js
//   force le bon nom → mongoose.model('Utilisateur', schema, 'utilisateur')
// ─────────────────────────────────────────────────────────────
router.get('/', verifyToken, isAdmin, async (req, res) => {
    try {
        // Récupère tous les utilisateurs SANS le mot de passe
        // .select('-password_hash') exclut ce champ sensible
        const utilisateurs = await Utilisateur
            .find()
            .select('-password_hash -__v')
            .sort({ created_at: -1 });

        // Log pour vérifier dans la console du backend
        console.log(`📋 GET /api/utilisateurs → ${utilisateurs.length} utilisateurs trouvés`);

        return res.json({
            success: true,
            count: utilisateurs.length,
            utilisateurs: utilisateurs,
        });
    } catch (error) {
        console.error('❌ Erreur GET /api/utilisateurs:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Erreur serveur lors de la récupération des utilisateurs',
            // En développement : afficher le détail de l'erreur
            detail: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
});

// ─────────────────────────────────────────────────────────────
// GET /api/utilisateurs/mes-interests
// Intérêts de l'utilisateur connecté (avec détail catégorie)
// DOIT être avant GET /:id pour éviter le conflit de route
// ─────────────────────────────────────────────────────────────
router.get('/mes-interests', verifyToken, async (req, res) => {
    try {
        const interests = await Interest
            .find({ utilisateur: req.utilisateur._id })
            .populate('categorie', 'event_categ event_type');
        return res.json({ success: true, interests });
    } catch (error) {
        console.error('❌ Erreur GET /mes-interests:', error.message);
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// ─────────────────────────────────────────────────────────────
// PUT /api/utilisateurs/mes-interests
// Remplace toutes les préférences de l'utilisateur connecté
// Body : { categories: ['id1', 'id2', ...] }
// ─────────────────────────────────────────────────────────────
router.put('/mes-interests', verifyToken, async (req, res) => {
    try {
        const { categories } = req.body;
        const userId = req.utilisateur._id;

        await Interest.deleteMany({ utilisateur: userId });

        if (Array.isArray(categories) && categories.length > 0) {
            const docs = categories.map(catId => ({ utilisateur: userId, categorie: catId }));
            await Interest.insertMany(docs);
        }

        console.log(`✅ Préférences mises à jour pour ${req.utilisateur.email}`);
        return res.json({ success: true, message: 'Préférences mises à jour' });
    } catch (error) {
        console.error('❌ Erreur PUT /mes-interests:', error.message);
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// ─────────────────────────────────────────────────────────────
// GET /api/utilisateurs/:id
// Détail d'un utilisateur — admin seulement
// ─────────────────────────────────────────────────────────────
router.get('/:id', verifyToken, isAdmin, async (req, res) => {
    try {
        const utilisateur = await Utilisateur
            .findById(req.params.id)
            .select('-password_hash -__v');

        if (!utilisateur) {
            return res.status(404).json({
                success: false,
                message: 'Utilisateur introuvable',
            });
        }

        return res.json({ success: true, utilisateur });
    } catch (error) {
        console.error('❌ Erreur GET /api/utilisateurs/:id:', error.message);
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// ─────────────────────────────────────────────────────────────
// PUT /api/utilisateurs/:id/role
// Changer le rôle d'un utilisateur — admin seulement
//
// POUR MODIFIER :
//   Ajouter d'autres rôles dans l'enum si besoin
//   Ex: ['user', 'admin', 'organisateur', 'moderateur']
// ─────────────────────────────────────────────────────────────
router.put('/:id/role', verifyToken, isAdmin, async (req, res) => {
    try {
        const { role } = req.body;

        // Vérifier que le rôle est valide
        const rolesValides = ['user', 'admin', 'organisateur'];
        if (!rolesValides.includes(role)) {
            return res.status(400).json({
                success: false,
                message: `Rôle invalide. Valeurs acceptées : ${rolesValides.join(', ')}`,
            });
        }

        // Empêcher l'admin de se retirer son propre rôle
        if (req.params.id === req.utilisateur._id.toString() && role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Vous ne pouvez pas modifier votre propre rôle',
            });
        }

        const utilisateur = await Utilisateur.findByIdAndUpdate(
            req.params.id,
            { role },
            { new: true }
        ).select('-password_hash -__v');

        if (!utilisateur) {
            return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
        }

        console.log(`✅ Rôle changé → ${utilisateur.email} : ${role}`);
        return res.json({ success: true, message: `Rôle changé en "${role}"`, utilisateur });
    } catch (error) {
        console.error('❌ Erreur PUT /role:', error.message);
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// ─────────────────────────────────────────────────────────────
// DELETE /api/utilisateurs/:id
// Supprimer un utilisateur — admin seulement
//
// ATTENTION : Ne supprime pas les participations liées !
// POUR MODIFIER : ajouter Participation.deleteMany({ utilisateur: id })
//                avant la suppression pour nettoyer la base
// ─────────────────────────────────────────────────────────────
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
    try {
        // Empêcher l'admin de se supprimer lui-même
        if (req.params.id === req.utilisateur._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Vous ne pouvez pas supprimer votre propre compte',
            });
        }

        const utilisateur = await Utilisateur.findByIdAndDelete(req.params.id);

        if (!utilisateur) {
            return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
        }

        // TODO : Supprimer aussi les participations de cet utilisateur
        // const Participation = require('../models/Participation');
        // await Participation.deleteMany({ utilisateur: req.params.id });

        console.log(`✅ Utilisateur supprimé : ${utilisateur.email}`);
        return res.json({
            success: true,
            message: `Utilisateur "${utilisateur.first_name} ${utilisateur.last_name}" supprimé`,
        });
    } catch (error) {
        console.error('❌ Erreur DELETE /api/utilisateurs:', error.message);
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// ─────────────────────────────────────────────────────────────
// PUT /api/utilisateurs/mot-de-passe
// Changer son propre mot de passe — tout utilisateur connecté
// ─────────────────────────────────────────────────────────────
router.put('/mot-de-passe', verifyToken, async (req, res) => {
    try {
        const { ancien_mot_de_passe, nouveau_mot_de_passe } = req.body;

        if (!ancien_mot_de_passe || !nouveau_mot_de_passe) {
            return res.status(400).json({ success: false, message: 'Ancien et nouveau mot de passe requis' });
        }
        if (nouveau_mot_de_passe.length < 6) {
            return res.status(400).json({ success: false, message: 'Le nouveau mot de passe doit contenir au moins 6 caractères' });
        }

        const utilisateur = await Utilisateur.findById(req.utilisateur._id).select('+password_hash');
        if (!utilisateur) {
            return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
        }

        const valide = await utilisateur.comparePassword(ancien_mot_de_passe);
        if (!valide) {
            return res.status(401).json({ success: false, message: 'Ancien mot de passe incorrect' });
        }

        utilisateur.password_hash = nouveau_mot_de_passe;
        await utilisateur.save();

        return res.json({ success: true, message: 'Mot de passe modifié avec succès' });
    } catch (error) {
        console.error('❌ Erreur PUT /mot-de-passe:', error.message);
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// ─────────────────────────────────────────────────────────────
// PUT /api/utilisateurs/profil
// Modifier son propre profil — tout utilisateur connecté
// ─────────────────────────────────────────────────────────────
router.put('/profil', verifyToken, async (req, res) => {
    try {
        const allowed = ['first_name', 'last_name', 'telephone', 'photo', 'langue'];
        const updates = {};
        allowed.forEach(field => {
            if (req.body[field] !== undefined) updates[field] = req.body[field];
        });

        const utilisateur = await Utilisateur.findByIdAndUpdate(
            req.utilisateur._id,
            updates,
            { new: true, runValidators: true }
        ).select('-password_hash -__v');

        if (!utilisateur) {
            return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
        }

        return res.json({ success: true, message: 'Profil mis à jour', utilisateur });
    } catch (error) {
        console.error('❌ Erreur PUT /profil:', error.message);
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

module.exports = router;