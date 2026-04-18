// ============================================================
// models/Participation.js — Inscriptions et présences
// Collection MongoDB : "participations"
// Table de jointure : Utilisateur ↔ Evenement
// ============================================================

const mongoose = require('mongoose');

const participationSchema = new mongoose.Schema({

    utilisateur: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Utilisateur',
        required: true
    },

    evenement: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Evenement',
        required: true
    },

    is_present: {
        type: Boolean,
        default: false
        // false = inscrit mais pas encore présent
        // true  = présence confirmée par scan QR sur place
    },

    scanner_date: {
        type: Date
        // Date et heure exactes du scan QR
        // null si pas encore scanné
    },

    // Date d'inscription à l'événement
    registered_at: {
        type: Date,
        default: Date.now
    }

}, {
    collection: 'participations'
});

// ── Index composé : un utilisateur ne peut pas s'inscrire 2x au même événement ──
participationSchema.index({ utilisateur: 1, evenement: 1 }, { unique: true });

module.exports = mongoose.model('Participation', participationSchema);