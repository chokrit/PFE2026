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
    },

    // ── QR code personnel du participant ──────────────────────
    // Généré automatiquement à l'inscription (crypto.randomBytes)
    // Affiché comme QR code dans le dashboard du participant
    // L'organisateur le scanne pour valider la présence sur place
    qr_token: {
        type: String,
        unique: true,
        sparse: true,   // autorise null : les anciennes participations sans token ne bloquent pas
    },

    // Passe à true dès que l'organisateur a scanné ce token
    // Empêche le double-scan d'un même QR (une présence = un scan)
    qr_utilise: {
        type: Boolean,
        default: false,
    }

}, {
    collection: 'participations'
});

// ── Index composé : un utilisateur ne peut pas s'inscrire 2x au même événement ──
participationSchema.index({ utilisateur: 1, evenement: 1 }, { unique: true });

module.exports = mongoose.model('Participation', participationSchema);