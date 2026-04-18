// ============================================================
// routes/utilisateurs.js — Routes de gestion des utilisateurs
// Préfixe : /api/utilisateurs
// ============================================================

const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middleware/auth');
const {
    getTousUtilisateurs,
    getUtilisateur,
    modifierUtilisateur,
    supprimerUtilisateur,
    changerRole
} = require('../controllers/utilisateurController');

// GET /api/utilisateurs — Liste complète (admin seulement)
router.get('/', verifyToken, isAdmin, getTousUtilisateurs);

// GET /api/utilisateurs/:id — Profil d'un utilisateur (connecté)
router.get('/:id', verifyToken, getUtilisateur);

// PUT /api/utilisateurs/:id — Modifier son profil (soi-même ou admin)
router.put('/:id', verifyToken, modifierUtilisateur);

// DELETE /api/utilisateurs/:id — Supprimer (admin seulement)
router.delete('/:id', verifyToken, isAdmin, supprimerUtilisateur);

// PUT /api/utilisateurs/:id/role — Changer le rôle (admin seulement)
router.put('/:id/role', verifyToken, isAdmin, changerRole);

module.exports = router;