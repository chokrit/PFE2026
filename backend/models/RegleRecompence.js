// ============================================================
// models/RegleRecompense.js — Règles du système de gamification
// Collection MongoDB : "regles_recompenses"
// ============================================================

const mongoose = require('mongoose');

const regleRecompenseSchema = new mongoose.Schema({

    titre_recompense: {
        type: String,
        required: true,
        trim: true
        // Ex : "Fidèle sportif - 10h de participation"
    },

    nbre_heures_pour_recompense: {
        type: Number,
        default: 0,
        min: 0
        // Seuil d'heures de participation pour déclencher la récompense
        // Ex : 10 → après 10h cumulées, l'utilisateur reçoit un coupon
    },

    nbre_participations: {
        type: Number,
        default: 0,
        min: 0
        // Alternative : seuil basé sur le nombre d'événements participés
        // Ex : 5 → après 5 événements, récompense déclenchée
    },

    remise_pourcentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
        // Pourcentage de remise accordé : ex 15 → coupon de -15%
    },

    est_active: {
        type: Boolean,
        default: true
        // Désactiver une règle sans la supprimer
    }

}, {
    collection: 'regles_recompenses',
    timestamps: true
});

module.exports = mongoose.model('RegleRecompense', regleRecompenseSchema);