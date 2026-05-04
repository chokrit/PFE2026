// ============================================================
// models/Location.js — Lieux des événements
// Collection MongoDB : "locations"
// ============================================================

const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({

    name_location: {
        type: String,
        required: [true, 'Le nom du lieu est obligatoire'],
        trim: true,
    },

    location_capacity: {
        type: Number,
        min: [0, 'Capacité ne peut pas être négative'],
    },

    is_official: {
        type: Boolean,
        default: false,
    },

    gps_coordinates: {
        lat: { type: Number, min: -90,  max: 90  },
        lng: { type: Number, min: -180, max: 180 },
    },

    // ── Cycle de validation (mirrors Categorie model) ────────
    statut: {
        type: String,
        enum: ['active', 'en_attente', 'refusee'],
        default: 'active',
    },

    suggere_par: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Utilisateur',
        default: null,
    },

    raison_suggestion: {
        type: String,
        trim: true,
        default: '',
    },

}, {
    collection: 'locations',
    timestamps: true,
});

module.exports = mongoose.model('Location', locationSchema);