// ============================================================
// models/Utilisateur.js — Modèle Mongoose pour les utilisateurs
// Collection MongoDB : "utilisateur"
// ============================================================

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ── Définition du schéma ──
const utilisateurSchema = new mongoose.Schema({

    // ── Identité ──
    first_name: {
        type: String,
        required: [true, 'Le prénom est obligatoire'],
        trim: true,                // Supprimer espaces début/fin
        maxlength: [50, 'Prénom trop long (max 50 caractères)']
    },

    last_name: {
        type: String,
        required: [true, 'Le nom est obligatoire'],
        trim: true,
        maxlength: [50, 'Nom trop long (max 50 caractères)']
    },

    sexe: {
        type: String,
        enum: {
            values: ['homme', 'femme'],
            message: 'Sexe invalide : choisir homme, femme '
        }
        // Optionnel — non requis à l'inscription
    },

    // ── Authentification ──
    email: {
        type: String,
        required: [true, "L'email est obligatoire"],
        unique: true,              // Index unique dans MongoDB
        lowercase: true,           // Toujours stocker en minuscules
        trim: true,
        match: [
            /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
            'Format email invalide'
        ]
    },

    password_hash: {
        type: String,
        required: [true, 'Le mot de passe est obligatoire'],
        minlength: [6, 'Mot de passe trop court (min 6 caractères)'],
        select: false              // ⚠️ Ne JAMAIS retourner le hash dans les queries
    },

    telephone: {
        type: String,              // String pour gérer les formats internationaux (+216...)
        trim: true
        // TODO: Ajouter validation format téléphone
    },

    // ── Rôle et permissions ──
    role: {
        type: String,
        enum: {
            values: ['user', 'admin', 'organisateur'],
            message: 'Rôle invalide'
        },
        default: 'user'
        // ⚠️ SÉCURITÉ : Ce champ ne doit JAMAIS être modifiable
        //    via /api/auth/register ou /api/utilisateurs/:id (PUT normal)
        //    Seul /api/utilisateurs/:id/role (isAdmin middleware) peut le changer
    },

    // ── Préférences ──
    langue: {
        type: String,
        enum: ['fr', 'en', 'ar', 'ar-tn'],
        default: 'fr'
        // La langue choisie par l'utilisateur, synchronisée avec le frontend
    },

    // ── Gamification / Statistiques ──
    cumul_heures_participation: {
        type: Number,
        default: 0,
        min: 0
        // Total des heures de présence confirmée aux événements
        // Incrémenté automatiquement lors d'un scan QR
    },

    cumul_points: {
        type: Number,
        default: 0,
        min: 0
        // Points accumulés grâce aux participations
        // Utilisés pour générer des coupons de réduction
    },

    cumul_points_remise: {
        type: Number,
        default: 0,
        min: 0
        // Points déjà utilisés pour des remises/coupons
    },

    reliabilite_score: {
        type: Number,
        default: 100,
        min: 0,
        max: 100
        // Score de fiabilité : baisse si l'utilisateur s'inscrit mais n'arrive pas
        // 100 = très fiable, 0 = blacklisté
        // TODO: Implémenter la logique de calcul automatique
    },

    // ── Métadonnées ──
    created_at: {
        type: Date,
        default: Date.now
    }

}, {
    // Options du schéma
    collection: 'utilisateur',  // Nom explicite de la collection MongoDB
    timestamps: false             // On gère created_at manuellement ci-dessus
});

// ── Méthodes du schéma ──

/**
 * Avant de sauvegarder : hasher le mot de passe si modifié
 * S'exécute automatiquement sur .save() et .create()
 */
utilisateurSchema.pre('save', async function (next) {
    // Ne hasher que si le mot de passe a été modifié (ou est nouveau)
    if (!this.isModified('password_hash')) return next();

    try {
        // Générer un salt avec 12 rounds (bon compromis sécurité/performance)
        const salt = await bcrypt.genSalt(12);
        // Remplacer le mot de passe en clair par son hash
        this.password_hash = await bcrypt.hash(this.password_hash, salt);
        next();
    } catch (error) {
        next(error);
    }
});

/**
 * Méthode d'instance : comparer un mot de passe en clair avec le hash stocké
 * Utilisation : const isValid = await user.comparePassword(motDePasseSaisi)
 */
utilisateurSchema.methods.comparePassword = async function (motDePasse) {
    return await bcrypt.compare(motDePasse, this.password_hash);
};

/**
 * Méthode d'instance : retourner l'utilisateur sans données sensibles
 * Utilisation : const userPublic = user.toPublicJSON()
 */
utilisateurSchema.methods.toPublicJSON = function () {
    const obj = this.toObject();
    delete obj.password_hash; // Ne jamais envoyer le hash au frontend
    delete obj.__v;
    return obj;
};

// ── Export du modèle ──
module.exports = mongoose.model('Utilisateur', utilisateurSchema);