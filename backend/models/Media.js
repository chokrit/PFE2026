// ============================================================
// models/Media.js — Médias (photos de profil, événements)
// Collection MongoDB Atlas : "media"
// ============================================================

const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({

    file_url: {
        type: String,
        required: true,
        // URL Cloudinary version optimisée 1200px max
    },

    thumbnail_url: {
        type: String,
        // URL Cloudinary version miniature 300x300
        // Toujours généré à l'upload — ne jamais laisser vide
    },

    public_id: {
        type: String,
        // public_id Cloudinary — nécessaire pour cloudinary.uploader.destroy()
    },

    utilisateur: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Utilisateur',
        required: true,
    },

    evenement: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Evenement',
        default: null,
        // null si photo de profil
    },

    type_media: {
        type: String,
        required: true,
        enum: [
            'photo_profil',      // approuvée automatiquement
            'photo_evenement',   // nécessite validation organisateur
            'photo_officielle',  // organisateur/admin → approuvée automatiquement
        ],
    },

    statut: {
        type: String,
        enum: ['en_attente', 'approuve', 'refuse'],
        default: 'en_attente',
    },

    approuve_par: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Utilisateur',
        default: null,
    },

    approuve_at: {
        type: Date,
        default: null,
    },

    signale: {
        type: Boolean,
        default: false,
    },

    signale_par: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Utilisateur',
        // Quand length >= 3 → statut repasse en 'en_attente' pour modération
    }],

    taille_fichier: {
        type: Number, // octets
    },

    format: {
        type: String, // jpg, png, webp...
    },

    uploaded_at: {
        type: Date,
        default: Date.now,
    },

}, {
    collection: 'media', // Nom exact de la collection Atlas
    timestamps: false,
});

// ── Pre-save : approbation automatique et rotation photo profil ──
mediaSchema.pre('save', async function (next) {
    // photo_profil et photo_officielle → approuvées automatiquement
    if (['photo_profil', 'photo_officielle'].includes(this.type_media)) {
        this.statut = 'approuve';
    }

    // Quand une nouvelle photo_profil est sauvegardée :
    // désactiver (refuser) toutes les anciennes photo_profil du même utilisateur
    if (this.type_media === 'photo_profil' && this.isNew) {
        await mongoose.model('Media').updateMany(
            {
                utilisateur: this.utilisateur,
                type_media: 'photo_profil',
                _id: { $ne: this._id },
            },
            { statut: 'refuse' }
        );
    }

    next();
});

module.exports = mongoose.model('Media', mediaSchema, 'media');
