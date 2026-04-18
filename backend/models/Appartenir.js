// ============================================================
// models/Appartenir.js — Relation Utilisateur ↔ Coupon ↔ Règle
// Collection MongoDB : "appartenir"
// Représente l'attribution d'un coupon à un utilisateur
// ============================================================

const mongoose = require('mongoose');

const appartenirSchema = new mongoose.Schema({

    utilisateur: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Utilisateur',
        required: true
    },

    coupon: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Discount',
        required: true
    },

    regle: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RegleRecompense'
        // La règle qui a déclenché l'attribution du coupon
    },

    expiry_date: {
        type: Date
        // Date d'expiration de ce coupon pour cet utilisateur
        // Peut différer de datefin_coupon dans Discount
    },

    is_redeemed: {
        type: Boolean,
        default: false
        // true = coupon déjà utilisé par cet utilisateur
    }

}, {
    collection: 'appartenir',
    timestamps: true
});

module.exports = mongoose.model('Appartenir', appartenirSchema);