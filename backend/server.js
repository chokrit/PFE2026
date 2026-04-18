// ============================================================
// server.js — Point d'entrée principal du serveur Express
// Lance le serveur, connecte MongoDB, charge les routes
// ============================================================

// Charger les variables d'environnement depuis .env
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

// ── Initialiser l'application Express ──
const app = express();

// ── Connexion à MongoDB Atlas ──
connectDB();

// ── Middlewares globaux ──

// CORS : autoriser les requêtes depuis le frontend React (port 5173 en dev)
app.use(cors({
    origin: process.env.NODE_ENV === 'development'
        ? 'http://localhost:5173'
        : '*', // TODO: restreindre en production
    credentials: true
}));

// Parser les requêtes JSON (body des POST/PUT)
app.use(express.json());

// Parser les données de formulaires URL-encoded
app.use(express.urlencoded({ extended: true }));

// ── Routes de l'API ──

// Route de test — vérifier que le serveur tourne
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'EVENT API fonctionne correctement',
        timestamp: new Date().toISOString()
    });
});

// Routes d'authentification (login, register, forgot-password)
app.use('/api/auth', require('./routes/auth'));

// Routes utilisateurs (profil, liste admin, etc.)
app.use('/api/utilisateurs', require('./routes/utilisateurs'));

// Routes événements (liste, création, détail, QR scan)
app.use('/api/evenements', require('./routes/evenements'));

// ── Middleware de gestion des erreurs 404 ──
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route introuvable : ${req.method} ${req.originalUrl}`
    });
});
app.use('/api/participations', require('./routes/participations'));
app.use('/api/recompenses', require('./routes/recompenses'));
// ── Middleware de gestion des erreurs globales ──
app.use((err, req, res, next) => {
    console.error('Erreur serveur :', err.stack);
    res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur',
        // Afficher le détail uniquement en développement
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// ── Démarrer le serveur ──
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`\n✅ Serveur EVENT démarré`);
    console.log(`📡 Port : ${PORT}`);
    console.log(`🌍 Environnement : ${process.env.NODE_ENV}`);
    console.log(`🔗 URL : http://localhost:${PORT}/api/health\n`);
});