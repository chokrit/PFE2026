// ============================================================
// controllers/authController.js
// CORRECTIONS :
//   1. Login retourne le champ 'role' pour redirection frontend
//   2. Register cherche bien dans la collection 'utilisateur'
//   3. Messages d'erreur clairs
// ============================================================

const jwt = require('jsonwebtoken');
const Utilisateur = require('../models/Utilisateur');

// Générer un JWT valable 7 jours
const genererToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// ─────────────────────────────────────────────────────────────
// POST /api/auth/register — Créer un compte
// ─────────────────────────────────────────────────────────────
const register = async (req, res) => {
  try {
    const { first_name, last_name, email, password, telephone, sexe, langue } = req.body;

    // Validation champs obligatoires
    if (!first_name || !last_name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Prénom, nom, email et mot de passe sont obligatoires',
      });
    }

    // Vérifier email unique
    const emailExistant = await Utilisateur.findOne({ email: email.toLowerCase() });
    if (emailExistant) {
      return res.status(409).json({
        success: false,
        message: 'Cet email est déjà utilisé',
      });
    }

    // ⚠️ role toujours 'user' — jamais depuis req.body
    const nouvelUtilisateur = await Utilisateur.create({
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      email: email.toLowerCase().trim(),
      password_hash: password,   // hashé par le pre-save hook
      telephone: telephone || undefined,
      sexe: sexe || undefined,
      langue: langue || 'fr',
      role: 'user',
    });

    const token = genererToken(nouvelUtilisateur._id);

    return res.status(201).json({
      success: true,
      message: 'Compte créé avec succès',
      token,
      utilisateur: nouvelUtilisateur.toPublicJSON(),
    });

  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    console.error('Erreur register:', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur lors de la création du compte' });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/auth/login — Connexion
// ─────────────────────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email et mot de passe requis',
      });
    }

    // Chercher l'utilisateur — inclure password_hash (select: false par défaut)
    const utilisateur = await Utilisateur
      .findOne({ email: email.toLowerCase().trim() })
      .select('+password_hash');

    if (!utilisateur) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect',
      });
    }

    // Vérifier le mot de passe
    const motDePasseValide = await utilisateur.comparePassword(password);
    if (!motDePasseValide) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect',
      });
    }

    const token = genererToken(utilisateur._id);

    // ⚠️ CORRECTION CLÉ : retourner le role pour que le frontend
    //    puisse rediriger vers /admin ou /dashboard
    return res.json({
      success: true,
      message: 'Connexion réussie',
      token,
      utilisateur: {
        _id: utilisateur._id,
        first_name: utilisateur.first_name,
        last_name: utilisateur.last_name,
        email: utilisateur.email,
        role: utilisateur.role,        // ← INDISPENSABLE
        langue: utilisateur.langue,
        cumul_points: utilisateur.cumul_points,
        cumul_heures_participation: utilisateur.cumul_heures_participation,
        cumul_points_remise: utilisateur.cumul_points_remise,
        reliabilite_score: utilisateur.reliabilite_score,
      },
    });

  } catch (error) {
    console.error('Erreur login:', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur lors de la connexion' });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/auth/forgot-password — Mot de passe oublié
// TODO: Implémenter avec nodemailer
// ─────────────────────────────────────────────────────────────
const forgotPassword = async (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Fonctionnalité à implémenter — nodemailer requis',
  });
};

module.exports = { register, login, forgotPassword };
