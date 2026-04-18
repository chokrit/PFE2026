// ============================================================
// models/Review.js — Avis sur les événements
// Collection MongoDB : "reviews"
// ============================================================

const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({

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

    note: {
        type: Number,
        min: 0,
        max: 5
        // Note de 0 à 5 étoiles
        // TODO: Forcer un entier ou demi-entier (0, 0.5, 1, 1.5... 5)
    },

    commentaire: {
        type: String,
        maxlength: [1000, 'Commentaire trop long']
        // TODO: Ajouter modération automatique (filtre mots offensants)
    }

    // TODO: Ajouter ces champs dans une prochaine version :
    // photos       : [{ type: String }]    → URLs des photos jointes
    // likes        : { type: Number, default: 0 }
    // est_signale  : { type: Boolean, default: false }
    // est_approuve : { type: Boolean, default: true }

}, {
    collection: 'reviews',
    timestamps: true
});

// ── Index : un utilisateur = une review par événement ──
reviewSchema.index({ utilisateur: 1, evenement: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);