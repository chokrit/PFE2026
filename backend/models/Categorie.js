// ============================================================
// models/Categorie.js — Catégories d'événements sportifs
// Collection MongoDB : "categories"
// ============================================================

const mongoose = require('mongoose');

const categorieSchema = new mongoose.Schema({

    event_categ: {
        type: String,
        required: true,
        trim: true
        // Catégorie principale : ex "Sport collectif", "Sport individuel", "Aquatique"
    },

    event_type: {
        type: String,
        trim: true
        // Type spécifique : ex "Football", "Natation", "Course à pied"
    }

}, {
    collection: 'categories',
    timestamps: true
});

module.exports = mongoose.model('Categorie', categorieSchema);