// ============================================================
// middleware/auth.js — Middlewares d'authentification JWT
// Utilisé pour protéger les routes privées
// ============================================================

const jwt = require('jsonwebtoken');
const Utilisateur = require('../models/Utilisateur');

/**
 * Middleware : verifyToken
 * Vérifie le JWT dans le header Authorization
 * Usage : router.get('/route', verifyToken, controller)
 *
 * Format header attendu : "Authorization: Bearer <token>"
 */
const verifyToken = async (req, res, next) => {
    try {
        // Récupérer le header Authorization
        const authHeader = req.headers.authorization;

        // Vérifier que le header existe et commence par "Bearer "
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Token manquant. Veuillez vous connecter.'
            });
        }

        // Extraire le token (après "Bearer ")
        const token = authHeader.split(' ')[1];

        // Vérifier et décoder le token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Récupérer l'utilisateur depuis la base (sans le mot de passe)
        const utilisateur = await Utilisateur.findById(decoded.id).select('-password_hash');

        if (!utilisateur) {
            return res.status(401).json({
                success: false,
                message: 'Utilisateur introuvable. Token invalide.'
            });
        }

        // Attacher l'utilisateur à la requête pour les middlewares suivants
        req.utilisateur = utilisateur;
        next();

    } catch (error) {
        // Token expiré ou invalide
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ success: false, message: 'Token invalide' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Token expiré. Reconnectez-vous.' });
        }
        return res.status(500).json({ success: false, message: 'Erreur d\'authentification' });
    }
};

/**
 * Middleware : isAdmin
 * Vérifie que l'utilisateur connecté a le rôle 'admin'
 * DOIT être utilisé APRÈS verifyToken
 * Usage : router.delete('/route', verifyToken, isAdmin, controller)
 */
const isAdmin = (req, res, next) => {
    if (!req.utilisateur) {
        return res.status(401).json({
            success: false,
            message: 'Non authentifié. Utiliser verifyToken avant isAdmin.'
        });
    }

    if (req.utilisateur.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Accès refusé. Droits administrateur requis.'
        });
    }

    next();
};

module.exports = { verifyToken, isAdmin };