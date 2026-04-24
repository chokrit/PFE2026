// ============================================================
// routes/recompenses.js  — NOUVEAU FICHIER
// Gérer les coupons et récompenses des utilisateurs
// ============================================================

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const Appartenir = require('../models/Appartenir');

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

module.exports = router;
