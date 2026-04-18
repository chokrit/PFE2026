// ============================================================
// models/Discount.js — Coupons de réduction
// Collection MongoDB : "discounts"
// ============================================================

const mongoose = require('mongoose');

const discountSchema = new mongoose.Schema({

    coupon_code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true
        // Ex : "EVENT-ABC123" — généré automatiquement
        // TODO: Implémenter la génération automatique lors de la création
    },

    status: {
        type: String,
        enum: ['actif', 'utilisé', 'expiré'],
        default: 'actif'
    },

    date_coupon: {
        type: Date,
        default: Date.now
        // Date de création du coupon
    },

    datefin_coupon: {
        type: Date
        // Date d'expiration — après cette date, status → 'expiré' automatiquement
        // TODO: Ajouter un job cron pour marquer les coupons expirés
    },

    date_utilisation_coupon: {
        type: Date
        // Date à laquelle le coupon a été utilisé
        // null si pas encore utilisé
    }

}, {
    collection: 'discounts'
});

module.exports = mongoose.model('Discount', discountSchema);