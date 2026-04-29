// ============================================================
// models/Evenement.js — Modèle pour les événements sportifs
// Collection MongoDB : "evenements"
// ============================================================

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('crypto'); // Pour générer le token QR

const evenementSchema = new mongoose.Schema({

    title_event: {
        type: String,
        required: [true, "Le titre de l'événement est obligatoire"],
        trim: true,
        maxlength: [100, 'Titre trop long']
    },

    event_description: {
        type: String,
        trim: true,
        maxlength: [2000, 'Description trop longue']
        // TODO: Supporter le format Markdown pour la mise en forme
    },

    ev_start_time: {
        type: Date,
        required: [true, "La date de début est obligatoire"]
    },

    ev_end_time: {
        type: Date
        // TODO: Ajouter une validation : ev_end_time > ev_start_time
    },

    stat_event: {
        type: String,
        enum: {
            values: ['brouillon', 'publié', 'annulé', 'terminé'],
            message: 'Statut invalide'
        },
        default: 'brouillon'
        // brouillon → visible seulement par le créateur
        // publié    → visible par tous
        // annulé    → affiché comme annulé
        // terminé   → archivé après la date de fin
    },

    max_participants: {
        type: Number,
        default: 30,
        min: [1, 'Il faut au moins 1 participant']
    },

    qr_code_token: {
        type: String,
        unique: true,
        sparse: true  // Permet null/undefined avant génération
        // Généré automatiquement à la publication
        // Utilisé pour scanner la présence des participants
    },

    // ── Relations (références vers d'autres collections) ──

    createur: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Utilisateur',
        required: true
        // L'organisateur qui a créé l'événement
    },

    location: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Location'
        // Lieu où se déroule l'événement
        // TODO: Permettre plusieurs lieux pour un même événement
    },

    categories: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Categorie'
        // Tags de catégories (ex: Football, Natation)
    }],

    notif_rappel_envoyee: {
        type: Boolean,
        default: false,
        // true dès que le cron a envoyé le rappel aux participants
    }

}, {
    collection: 'evenements',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// ── Middleware : générer le token QR à la publication ──
evenementSchema.pre('save', function (next) {
    // Générer un token unique quand l'événement passe en "publié"
    if (this.isModified('stat_event') && this.stat_event === 'publié' && !this.qr_code_token) {
        // Token aléatoire unique pour le QR code
        this.qr_code_token = require('crypto').randomBytes(32).toString('hex');
        console.log(`🎫 Token QR généré pour : ${this.title_event}`);
    }
    next();
});

module.exports = mongoose.model('Evenement', evenementSchema);