// ============================================================
// models/Equipe.js — Équipes d'événements sportifs
// Collection MongoDB Atlas : "equipe"
// ============================================================

const mongoose = require('mongoose');

const equipeSchema = new mongoose.Schema({

    evenement: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Evenement',
        required: true,
    },

    nom_equipe: {
        type: String,
        required: true,
        trim: true,
    },

    couleur: {
        type: String,
        default: 'bleu',
        enum: ['rouge', 'bleu', 'vert', 'jaune', 'orange', 'violet'],
    },

    membres: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Utilisateur',
    }],

    capitaine: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Utilisateur',
        default: null,
    },

    type_creation: {
        type: String,
        enum: ['manuelle', 'automatique'],
        required: true,
    },

    score_affinite: {
        type: Number,
        default: 0,
        // Score calculé par l'algo d'affinité pour les équipes automatiques
    },

    statut: {
        type: String,
        enum: ['proposee', 'validee'],
        default: 'proposee',
        // proposee → suggestion non encore notifiée aux membres
        // validee  → organisateur a validé, participants notifiés
    },

    valide_par: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Utilisateur',
        default: null,
    },

    created_at: {
        type: Date,
        default: Date.now,
    },

}, {
    collection: 'equipe',
    timestamps: false,
});

module.exports = mongoose.model('Equipe', equipeSchema, 'equipe');
