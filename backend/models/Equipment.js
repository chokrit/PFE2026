// ============================================================
// models/Equipment.js — Équipements disponibles
// Collection MongoDB : "equipments"
// ============================================================

const mongoose = require('mongoose');

const equipmentSchema = new mongoose.Schema({

    label: {
        type: String,
        required: [true, "Le nom de l'équipement est obligatoire"],
        trim: true
        // Ex : "Ballon de football", "Chronomètre", "Dossard"
    },

    total_qtite: {
        type: Number,
        default: 0,
        min: [0, 'La quantité ne peut pas être négative']
        // Stock total disponible dans l'organisme
        // La quantité réservée par événement est dans le modèle Equiper.js
    }

}, {
    collection: 'equipments',
    timestamps: true
});

module.exports = mongoose.model('Equipment', equipmentSchema);