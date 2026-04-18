// ============================================================
// controllers/authController.js — Logique d'authentification
// Login, Register, Forgot Password
// ============================================================

const jwt = require('jsonwebtoken');
const Utilisateur = require('../models/Utilisateur');

/**
 * Générer un JWT pour un utilisateur
 * @param {string} id - L'_id MongoDB de l'utilisateur
 * @returns {string} Le token JWT signé
 */
const genererToken = (id) => {
    return jwt.sign(
        { id },                          // Payload : uniquement l'ID
        process.env.JWT_SECRET,          // Clé secrète depuis .env
        { expiresIn: '7d' }              // Expiration : 7 jours
        // TODO: Réduire à 1h + implémenter refresh token en production
    );
};

// ─────────────────────────────────────────────────────────────
// POST /api/auth/register — Créer un nouveau compte
// ─────────────────────────────────────────────────────────────
const register = async (req, res) => {
    try {
        // Extraire les données du body
        const { first_name, last_name, email, password, telephone, sexe, langue } = req.body;

        // ── Validations de base ──
        if (!first_name || !last_name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Prénom, nom, email et mot de passe sont obligatoires'
            });
        }

        // Vérifier si l'email existe déjà
        const emailExistant = await Utilisateur.findOne({ email: email.toLowerCase() });
        if (emailExistant) {
            return res.status(409).json({
                success: false,
                message: 'Cet email est déjà utilisé'
            });
        }

        // ── Créer l'utilisateur ──
        // ⚠️ SÉCURITÉ : Le role est TOUJOURS 'user' ici, jamais depuis req.body
        const nouvelUtilisateur = await Utilisateur.create({
            first_name: first_name.trim(),
            last_name: last_name.trim(),
            email: email.toLowerCase().trim(),
            password_hash: password,   // Sera hashé automatiquement par le pre-save hook
            telephone: telephone || undefined,
            sexe: sexe || undefined,
            langue: langue || 'fr',
            role: 'user'               // ← TOUJOURS 'user', jamais depuis req.body !
        });

        // ── Générer le token JWT ──
        const token = genererToken(nouvelUtilisateur._id);

        // ── Répondre avec le token et les infos publiques ──
        res.status(201).json({
            success: true,
            message: 'Compte créé avec succès',
            token,
            utilisateur: nouvelUtilisateur.toPublicJSON()
        });

    } catch (error) {
        // Erreur de validation Mongoose (champs manquants, format invalide)
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }
        console.error('Erreur register :', error);
        res.status(500).json({ success: false, message: 'Erreur serveur lors de la création du compte' });
    }
};

// ─────────────────────────────────────────────────────────────
// POST /api/auth/login — Connexion
// ─────────────────────────────────────────────────────────────
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation des champs
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email et mot de passe requis'
            });
        }

        // Chercher l'utilisateur par email
        // .select('+password_hash') car password_hash a select:false dans le schéma
        const utilisateur = await Utilisateur.findOne({
            email: email.toLowerCase()
        }).select('+password_hash');

        if (!utilisateur) {
            // ⚠️ Même message que "mauvais mot de passe" pour éviter l'énumération d'emails
            return res.status(401).json({
                success: false,
                message: 'Email ou mot de passe incorrect'
            });
        }

        // Vérifier le mot de passe
        const motDePasseValide = await utilisateur.comparePassword(password);
        if (!motDePasseValide) {
            return res.status(401).json({
                success: false,
                message: 'Email ou mot de passe incorrect'
            });
        }

        // Générer le token JWT
        const token = genererToken(utilisateur._id);

        // Répondre
        res.json({
            success: true,
            message: 'Connexion réussie',
            token,
            utilisateur: utilisateur.toPublicJSON()
        });

    } catch (error) {
        console.error('Erreur login :', error);
        res.status(500).json({ success: false, message: 'Erreur serveur lors de la connexion' });
    }
};

// ─────────────────────────────────────────────────────────────
// POST /api/auth/forgot-password — Mot de passe oublié
// ─────────────────────────────────────────────────────────────
const forgotPassword = async (req, res) => {
    // TODO: Implémenter la réinitialisation par email
    // Étapes à implémenter :
    // 1. Vérifier que l'email existe dans la base
    // 2. Générer un token de réinitialisation (crypto.randomBytes)
    // 3. Stocker le token haché + date d'expiration dans l'utilisateur
    // 4. Envoyer un email avec le lien (nodemailer + SMTP)
    // 5. Créer la route POST /api/auth/reset-password/:token
    //    → Vérifier le token, vérifier expiration, hasher nouveau mdp, sauvegarder

    res.status(200).json({
        success: true,
        message: '📧 Fonctionnalité à implémenter — Un email sera envoyé avec le lien de réinitialisation'
    });
};

module.exports = { register, login, forgotPassword };