// ============================================================
// models/Connexion.js — Liens sociaux entre participants
// Collection MongoDB Atlas : "connexion"
// ============================================================

const mongoose = require('mongoose');

const connexionSchema = new mongoose.Schema({

    demandeur: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Utilisateur',
        required: true,
    },

    receveur: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Utilisateur',
        required: true,
    },

    evenement: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Evenement',
        required: true,
        // Événement lors duquel la connexion a été initiée
    },

    type: {
        type: String,
        enum: ['like', 'partenaire'],
        required: true,
    },

    statut: {
        type: String,
        enum: ['en_attente', 'accepte', 'refuse'],
        // like      → accepte automatiquement (pre-save)
        // partenaire → en_attente jusqu'à réponse du receveur
    },

    note_collab: {
        type: Number,
        min: 1,
        max: 5,
        default: null,
        // Note de collaboration donnée après participation commune
    },

    created_at: {
        type: Date,
        default: Date.now,
    },

}, {
    collection: 'connexion',
    timestamps: false,
});

// ── Pre-save : statut automatique selon le type ──
connexionSchema.pre('save', function (next) {
    if (this.isNew) {
        this.statut = this.type === 'like' ? 'accepte' : 'en_attente';
    }
    next();
});

// ── Index unique pour éviter les doublons ──
connexionSchema.index(
    { demandeur: 1, receveur: 1, evenement: 1, type: 1 },
    { unique: true }
);

module.exports = mongoose.model('Connexion', connexionSchema, 'connexion');
