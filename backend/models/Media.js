// ============================================================
// models/Media.js — Fichiers médias (photos, vidéos)
// Collection MongoDB : "medias"
// ============================================================

const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({

    file_url: {
        type: String,
        required: true
        // URL complète du fichier
        // TODO: Intégrer Cloudinary ou AWS S3 pour le stockage cloud
    },

    thumbnail_url: {
        type: String
        // URL de la miniature (générée automatiquement)
        // null pour les fichiers non-image
    },

    utilisateur: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Utilisateur'
        // Propriétaire du média
    },

    evenement: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Evenement'
        // Événement associé (optionnel)
        // TODO: Un média peut appartenir à un utilisateur ET un événement
    },

    type_media: {
        type: String,
        enum: ['photo_profil', 'photo_evenement', 'document', 'autre'],
        default: 'autre'
        // TODO: Ajouter 'video' quand le support vidéo sera implémenté
    }

}, {
    collection: 'medias',
    timestamps: true
});

module.exports = mongoose.model('Media', mediaSchema);