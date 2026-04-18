// ============================================================
// models/Equiper.js — Équipements requis par événement
// Collection MongoDB : "equiper"
// Table de jointure Evenement ↔ Equipment avec quantité
// ============================================================

const mongoose = require('mongoose');

const equiperSchema = new mongoose.Schema({

    evenement: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Evenement',
        required: true
    },

    equipement: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Equipment',
        required: true
    },

    required_qtity: {
        type: Number,
        default: 1,
        min: [1, 'La quantité requise doit être au moins 1']
        // Nombre d'unités de cet équipement nécessaires pour l'événement
        // TODO: Vérifier que required_qtity <= Equipment.total_qtite
    }

}, {
    collection: 'equiper'
});

// ── Index composé unique ──
equiperSchema.index({ evenement: 1, equipement: 1 }, { unique: true });

module.exports = mongoose.model('Equiper', equiperSchema);