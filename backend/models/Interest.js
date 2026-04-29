// ============================================================
// models/Interest.js — Centres d'intérêt des utilisateurs
// Collection MongoDB : "interests"
// Table de jointure Utilisateur ↔ Categorie (relation M-M)
// ============================================================

const mongoose = require('mongoose');

const interestSchema = new mongoose.Schema({

    utilisateur: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Utilisateur',
        required: true
    },

    categorie: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Categorie',
        required: true,
    },

    nb_participations: {
        type: Number,
        default: 0,
        // Incrémenté à chaque présence confirmée dans cette catégorie
    },

    note: {
        type: Number,
        default: null,
        min: 1,
        max: 5,
        // Dernière note donnée à un événement de cette catégorie
    },

}, {
    collection: 'interests'
});

// ── Index composé unique : pas de doublon d'intérêt ──
interestSchema.index({ utilisateur: 1, categorie: 1 }, { unique: true });

module.exports = mongoose.model('Interest', interestSchema);