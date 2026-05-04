// ============================================================
// models/Categorie.js — Catégories d'événements sportifs
// Collection MongoDB : "categories"
//
// AJOUTS :
//   - statut      : 'active' (visible par tous) | 'en_attente' (suggérée,
//                   attend validation admin/orga) | 'refusee'
//   - suggere_par : référence à l'utilisateur qui a proposé cette catégorie
//   - raison_suggestion : texte libre expliquant pourquoi ce sport manque
// ============================================================

const mongoose = require('mongoose');

const categorieSchema = new mongoose.Schema({

    event_categ: {
        type: String,
        required: true,
        trim: true,
        // Groupe principal : ex "Sport collectif", "Sport individuel", "Aquatique"
    },

    event_type: {
        type: String,
        trim: true,
        // Sport spécifique : ex "Football", "Natation", "Course à pied"
    },

    // ── Cycle de vie de la catégorie ──────────────────────────
    statut: {
        type: String,
        enum: ['active', 'en_attente', 'refusee'],
        default: 'active',
        // active     → visible dans tous les menus et les préférences
        // en_attente → suggérée par un utilisateur, attend validation orga/admin
        // refusee    → refusée par un orga/admin, masquée partout
    },

    // Qui a proposé cette catégorie (null si créée par l'admin directement)
    suggere_par: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Utilisateur',
        default: null,
    },

    // Message optionnel du suggéreur expliquant l'intérêt de ce sport
    raison_suggestion: {
        type: String,
        trim: true,
        default: '',
    },

}, {
    collection: 'categories',
    timestamps: true,
});

module.exports = mongoose.model('Categorie', categorieSchema);
