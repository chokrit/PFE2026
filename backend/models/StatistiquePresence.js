// ============================================================
// models/StatistiquePresence.js
// Collection MongoDB Atlas : "statistique_presence"
//
// RÔLE :
//   Enregistre un snapshot à chaque validation de présence.
//   Ces données alimentent un futur moteur d'IA/recommandation :
//     - Prédire les absences
//     - Suggérer des événements adaptés au niveau
//     - Détecter les patterns de participation (jour, heure, sport)
//
// UN DOCUMENT = UNE PRÉSENCE VALIDÉE
// ============================================================

const mongoose = require('mongoose');

const statistiquePresenceSchema = new mongoose.Schema({

    // ── Références principales ─────────────────────────────
    evenement: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Evenement',
        required: true,
    },

    utilisateur: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Utilisateur',
        required: true,
    },

    // Première catégorie de l'événement (sport pratiqué)
    // Utile pour agréger les stats par discipline
    categorie: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Categorie',
        default: null,
    },

    // ── Temporel ──────────────────────────────────────────
    // Timestamp exact du scan QR (pour calculer ponctualité)
    heure_scan: {
        type: Date,
        required: true,
        default: Date.now,
    },

    // Heure de début officielle de l'événement
    // Permet de calculer : retard = heure_scan - heure_debut_ev
    heure_debut_ev: {
        type: Date,
    },

    // Durée calculée de l'événement en heures
    // = (ev_end_time - ev_start_time) / 3600000
    // 0 si ev_end_time non renseigné
    heures_duree: {
        type: Number,
        default: 0,
        min: 0,
    },

    // ── Gamification ─────────────────────────────────────
    // Points gagnés lors de cette présence (actuellement fixé à 10)
    points_gagnes: {
        type: Number,
        default: 10,
        min: 0,
    },

    // Snapshot du cumul_points AVANT cette présence
    // Permet de reconstituer l'historique de progression
    cumul_pts_avant: {
        type: Number,
        default: 0,
    },

    // Niveau avant/après (Débutant, Actif, Avancé, Champion)
    // Détecte les passages de niveau — événement intéressant pour l'IA
    niveau_avant: {
        type: String,
        enum: ['Débutant', 'Actif', 'Avancé', 'Champion'],
        default: 'Débutant',
    },

    niveau_apres: {
        type: String,
        enum: ['Débutant', 'Actif', 'Avancé', 'Champion'],
        default: 'Débutant',
    },

    // ── Fiabilité ─────────────────────────────────────────
    // Snapshot du score de fiabilité avant/après recalcul
    // Permet de tracer l'évolution de la fiabilité dans le temps
    fiabilite_avant: {
        type: Number,
        default: 100,
        min: 0,
        max: 100,
    },

    fiabilite_apres: {
        type: Number,
        default: 100,
        min: 0,
        max: 100,
    },

    // ── Coupon déclenché ─────────────────────────────────
    // true si cette présence a déclenché l'attribution d'un coupon
    // Permet de corréler engagement ↔ récompenses
    coupon_declenche: {
        type: Boolean,
        default: false,
    },

}, {
    collection: 'statistique_presence',
    timestamps: false,
});

// Index pour les requêtes analytiques courantes
statistiquePresenceSchema.index({ utilisateur: 1, heure_scan: -1 });
statistiquePresenceSchema.index({ evenement: 1 });
statistiquePresenceSchema.index({ categorie: 1, heure_scan: -1 });

module.exports = mongoose.model('StatistiquePresence', statistiquePresenceSchema, 'statistique_presence');
