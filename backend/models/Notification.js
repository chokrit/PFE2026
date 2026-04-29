const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({

    utilisateur: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Utilisateur',
        required: true,
    },

    evenement: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Evenement',
        default: null,
    },

    type: {
        type: String,
        // rappel_event        → cron 2h avant l'événement
        // inscription         → confirmation d'inscription
        // validation          → présence confirmée par l'organisateur
        // systeme             → messages internes de la plateforme
        // encouragement_absent→ message chaleureux aux absents après la fin
        enum: ['rappel_event', 'inscription', 'validation', 'systeme', 'encouragement_absent'],
        default: 'rappel_event',
    },

    titre: {
        type: String,
        required: true,
    },

    message: {
        type: String,
        required: true,
    },

    lu: {
        type: Boolean,
        default: false,
    },

    created_at: {
        type: Date,
        default: Date.now,
    },

}, {
    collection: 'notification',
    timestamps: false,
});

notificationSchema.index({ utilisateur: 1, lu: 1, created_at: -1 });

module.exports = mongoose.model('Notification', notificationSchema, 'notification');
