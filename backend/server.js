// ============================================================
// server.js — Point d'entrée Express
// CORRECTIONS :
//   1. Ajout routes /participations et /recompenses
//   2. Ajout route /locations pour les listes déroulantes
//   3. Ajout route /categories pour les sélecteurs
// ============================================================

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();

// Connexion MongoDB
connectDB();

// Middlewares globaux
app.use(cors({
  origin: process.env.NODE_ENV === 'development'
    ? ['http://localhost:5173', 'http://localhost:3000']
    : '*',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Route de santé ──
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'EVENT API fonctionne', timestamp: new Date() });
});

// ── Routes principales ──
app.use('/api/auth', require('./routes/auth'));
app.use('/api/utilisateurs', require('./routes/utilisateurs'));
app.use('/api/evenements', require('./routes/evenements'));
app.use('/api/participations', require('./routes/participations'));  // ← NOUVEAU
app.use('/api/recompenses', require('./routes/recompenses'));     // ← NOUVEAU
app.use('/api/locations', require('./routes/locations'));       // ← NOUVEAU
app.use('/api/categories', require('./routes/categories'));      // ← NOUVEAU

// ── 404 ──
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route introuvable : ${req.method} ${req.originalUrl}`,
  });
});

// ── Erreurs globales ──
app.use((err, req, res, next) => {
  console.error('Erreur serveur:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Erreur interne du serveur',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n✅ Serveur EVENT démarré`);
  console.log(`📡 Port : ${PORT}`);
  console.log(`🌍 Env  : ${process.env.NODE_ENV}`);
  console.log(`🔗 URL  : http://localhost:${PORT}/api/health\n`);
});
