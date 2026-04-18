// ============================================================
// routes/auth.js — Routes d'authentification
// Préfixe : /api/auth
// ============================================================

const express = require('express');
const router = express.Router();
const { register, login, forgotPassword } = require('../controllers/authController');

// POST /api/auth/register — Créer un compte
// Accessible sans authentification
router.post('/register', register);

// POST /api/auth/login — Se connecter
// Accessible sans authentification
router.post('/login', login);

// POST /api/auth/forgot-password — Mot de passe oublié
// Accessible sans authentification
router.post('/forgot-password', forgotPassword);

module.exports = router;