// ============================================================
// models/Location.js — Lieux des événements
// Collection MongoDB : "locations"
// ============================================================

const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({

    name_location: {
        type: String,
        required: [true, 'Le nom du lieu est obligatoire'],
        trim: true
    },

    location_capacity: {
        type: Number,
        min: [0, 'Capacité ne peut pas être négative']
        // Nombre max de personnes que peut accueillir le lieu
    },

    is_official: {
        type: Boolean,
        default: false
        // true = lieu appartenant ou partenaire officiel de l'organisme
    },

    gps_coordinates: {
        lat: {
            type: Number,
            min: -90,
            max: 90
            // TODO: Ajouter validation latitude
        },
        lng: {
            type: Number,
            min: -180,
            max: 180
            // TODO: Ajouter validation longitude
        }
    }

}, {
    collection: 'locations',
    timestamps: true
});

module.exports = mongoose.model('Location', locationSchema);