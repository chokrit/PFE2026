// ============================================================
// middleware/auth.js
// Emplacement : backend/middleware/auth.js
//
// PROBLÈMES CORRIGÉS :
//   1. verifyToken cherchait req.utilisateur avant de le créer
//   2. isAdmin renvoyait vers /login côté backend (mauvaise pratique)
//      → maintenant retourne juste 403 JSON, c'est le frontend qui redirige
//   3. Meilleurs messages d'erreur pour déboguer
//
// FONCTIONNEMENT :
//   verifyToken → lit le JWT dans le header Authorization
//                 → décode l'id → charge l'utilisateur depuis MongoDB
//                 → met req.utilisateur disponible dans les routes suivantes
//   isAdmin     → vérifie que req.utilisateur.role === 'admin'
// ============================================================

const jwt = require('jsonwebtoken');
const Utilisateur = require('../models/Utilisateur');

// ─────────────────────────────────────────────────────────────
// verifyToken
// Vérifie que la requête contient un JWT valide
// Ajoute req.utilisateur pour les routes suivantes
//
// UTILISATION dans les routes :
//   router.get('/ma-route', verifyToken, monController);
//
// POUR MODIFIER :
//   Pour accepter le token en cookie : lire req.cookies.token
//   Pour une durée différente : changer expiresIn dans authController.js
// ─────────────────────────────────────────────────────────────
const verifyToken = async (req, res, next) => {
    try {
        // Lire l'en-tête Authorization : "Bearer eyJhbGci..."
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Token manquant — veuillez vous connecter',
            });
        }

        // Extraire le token (supprimer "Bearer ")
        const token = authHeader.split(' ')[1];

        // Vérifier et décoder le token
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (jwtError) {
            // Token expiré ou invalide
            return res.status(401).json({
                success: false,
                message: jwtError.name === 'TokenExpiredError'
                    ? 'Session expirée — veuillez vous reconnecter'
                    : 'Token invalide',
            });
        }

        // Charger l'utilisateur depuis MongoDB avec son id
        // NOTE : on utilise le modèle Utilisateur qui pointe vers
        //        la collection "utilisateur" (sans s) grâce au 3ème argument
        const utilisateur = await Utilisateur.findById(decoded.id).select('-password_hash');

        if (!utilisateur) {
            return res.status(401).json({
                success: false,
                message: 'Utilisateur introuvable — compte peut-être supprimé',
            });
        }

        // Rendre l'utilisateur disponible dans toutes les routes suivantes
        // Accessible via req.utilisateur dans les controllers
        req.utilisateur = utilisateur;

        // Passer au middleware ou controller suivant
        next();

    } catch (error) {
        console.error('❌ Erreur verifyToken:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Erreur serveur lors de la vérification du token',
        });
    }
};

// ─────────────────────────────────────────────────────────────
// isAdmin
// Vérifie que l'utilisateur connecté est un admin
// DOIT être utilisé APRÈS verifyToken
//
// UTILISATION dans les routes :
//   router.get('/admin-only', verifyToken, isAdmin, monController);
//
// POUR MODIFIER :
//   Pour ajouter un rôle "moderateur" ayant accès partiel :
//   const isAdminOrModo = (req, res, next) => {
//     if (['admin','moderateur'].includes(req.utilisateur.role)) return next();
//     ...
//   }
// ─────────────────────────────────────────────────────────────
const isAdmin = (req, res, next) => {
    // verifyToken doit avoir été appelé avant pour avoir req.utilisateur
    if (!req.utilisateur) {
        return res.status(401).json({
            success: false,
            message: 'Non authentifié',
        });
    }

    if (req.utilisateur.role !== 'admin') {
        return res.status(403).json({
            success: false,
            // Ne pas révéler pourquoi exactement (sécurité)
            message: 'Accès refusé — droits administrateur requis',
        });
    }

    // L'utilisateur est bien admin → continuer
    next();
};

const isOrganisateur = (req, res, next) => {
    if (!req.utilisateur) {
        return res.status(401).json({ success: false, message: 'Non authentifié' });
    }
    if (!['admin', 'organisateur'].includes(req.utilisateur.role)) {
        return res.status(403).json({ success: false, message: 'Accès refusé — droits organisateur requis' });
    }
    next();
};

module.exports = { verifyToken, isAdmin, isOrganisateur };