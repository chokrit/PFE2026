// ============================================================
// routes/recompenses.js  — NOUVEAU FICHIER
// Gérer les coupons et récompenses des utilisateurs
// ============================================================

const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middleware/auth');
const Appartenir       = require('../models/Appartenir');
const RegleRecompense  = require('../models/RegleRecompence');

// ─────────────────────────────────────────────────────────────
// GET /api/recompenses/mes-coupons
// Retourne les coupons de l'utilisateur connecté
// ─────────────────────────────────────────────────────────────
router.get('/mes-coupons', verifyToken, async (req, res) => {
  try {
    const coupons = await Appartenir.find({
      utilisateur: req.utilisateur._id,
    })
      .populate('coupon')
      .populate('regle', 'titre_recompense remise_pourcentage');

    const resultat = coupons
      .filter((a) => a.coupon) // ignorer les coupons supprimés
      .map((a) => ({
        id: a._id,
        coupon_code: a.coupon?.coupon_code,
        remise_pourcentage: a.regle?.remise_pourcentage || 0,
        titre_recompense: a.regle?.titre_recompense || 'Récompense',
        datefin_coupon: a.coupon?.datefin_coupon,
        is_redeemed: a.is_redeemed,
        status: a.coupon?.status || 'actif',
      }));

    return res.json({ success: true, coupons: resultat });
  } catch (error) {
    console.error('Erreur mes-coupons:', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/recompenses/regles — admin : liste toutes les règles
// ─────────────────────────────────────────────────────────────
router.get('/regles', verifyToken, isAdmin, async (req, res) => {
  try {
    const regles = await RegleRecompense.find().sort({ createdAt: -1 });
    return res.json({ success: true, regles });
  } catch (err) {
    console.error('GET /recompenses/regles:', err.message);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/recompenses/regles — admin : créer une règle
// ─────────────────────────────────────────────────────────────
router.post('/regles', verifyToken, isAdmin, async (req, res) => {
  try {
    const { titre_recompense, nbre_heures_pour_recompense, nbre_participations, remise_pourcentage, duree_validite } = req.body;
    if (!titre_recompense?.trim()) {
      return res.status(400).json({ success: false, message: 'Le nom de la règle est obligatoire' });
    }
    if (!remise_pourcentage || Number(remise_pourcentage) < 1) {
      return res.status(400).json({ success: false, message: 'La remise doit être supérieure à 0 %' });
    }
    const regle = await RegleRecompense.create({
      titre_recompense:            titre_recompense.trim(),
      nbre_heures_pour_recompense: Number(nbre_heures_pour_recompense) || 0,
      nbre_participations:         Number(nbre_participations) || 0,
      remise_pourcentage:          Number(remise_pourcentage),
      duree_validite:              Number(duree_validite) || 30,
    });
    return res.status(201).json({ success: true, message: 'Règle créée', regle });
  } catch (err) {
    console.error('POST /recompenses/regles:', err.message);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ─────────────────────────────────────────────────────────────
// PUT /api/recompenses/regles/:id — admin : modifier une règle
// ─────────────────────────────────────────────────────────────
router.put('/regles/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { titre_recompense, nbre_heures_pour_recompense, nbre_participations, remise_pourcentage, duree_validite } = req.body;
    const regle = await RegleRecompense.findByIdAndUpdate(
      req.params.id,
      {
        titre_recompense:            titre_recompense?.trim(),
        nbre_heures_pour_recompense: Number(nbre_heures_pour_recompense) || 0,
        nbre_participations:         Number(nbre_participations) || 0,
        remise_pourcentage:          Number(remise_pourcentage) || 0,
        duree_validite:              Number(duree_validite) || 30,
      },
      { new: true }
    );
    if (!regle) return res.status(404).json({ success: false, message: 'Règle introuvable' });
    return res.json({ success: true, message: 'Règle modifiée', regle });
  } catch (err) {
    console.error('PUT /recompenses/regles/:id:', err.message);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ─────────────────────────────────────────────────────────────
// PATCH /api/recompenses/regles/:id/statut — admin : toggle actif
// ─────────────────────────────────────────────────────────────
router.patch('/regles/:id/statut', verifyToken, isAdmin, async (req, res) => {
  try {
    const regle = await RegleRecompense.findById(req.params.id);
    if (!regle) return res.status(404).json({ success: false, message: 'Règle introuvable' });
    regle.est_active = !regle.est_active;
    await regle.save();
    return res.json({
      success: true,
      message: regle.est_active ? 'Règle activée' : 'Règle désactivée',
      regle,
    });
  } catch (err) {
    console.error('PATCH /recompenses/regles/:id/statut:', err.message);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

module.exports = router;
