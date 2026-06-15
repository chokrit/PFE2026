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
const Evenement     = require('./models/Evenement');
const Participation = require('./models/Participation');
const Notification  = require('./models/Notification');

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
app.use('/api/categories',     require('./routes/categories'));
app.use('/api/medias',         require('./routes/medias'));
app.use('/api/connexions',     require('./routes/connexions'));
app.use('/api/equipes',        require('./routes/equipes'));
app.use('/api/notifications',  require('./routes/notifications'));
app.use('/api/stats',          require('./routes/stats'));         // ← Statistiques KPI

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

// ── Job : rappels 24h avant chaque événement ─────────────────
function genererMessageRappel(prenom, titre, startTime) {
  const heure = new Date(startTime).toLocaleTimeString('fr-FR', {
    hour: '2-digit', minute: '2-digit',
  });
  return `Bonjour ${prenom} ! Votre événement "${titre}" commence demain `
    + `à ${heure}. C'est l'occasion de bouger, de rencontrer vos coéquipiers `
    + `et de gagner +10 points pour votre score de fidélité. On compte sur `
    + `vous — votre présence fait la différence ! À demain !`;
}

async function envoyerRappels24h() {
  try {
    const maintenant = Date.now();
    const dans24h    = new Date(maintenant + 24 * 60 * 60 * 1000);
    const dans25h    = new Date(maintenant + 25 * 60 * 60 * 1000);

    const evenements = await Evenement.find({
      stat_event: 'publié',
      ev_start_time: { $gte: dans24h, $lte: dans25h },
    }).select('_id title_event ev_start_time');

    for (const ev of evenements) {
      const participations = await Participation.find({
        evenement: ev._id,
        is_present: false,
      }).populate('utilisateur', 'email first_name');

      for (const p of participations) {
        const u = p.utilisateur;
        if (!u) continue;

        // Anti-doublon : une seule notification de rappel par participant par événement
        const existe = await Notification.findOne({
          utilisateur: u._id,
          evenement:   ev._id,
          type:        'rappel_evenement',
        });
        if (existe) continue;

        await Notification.create({
          utilisateur: u._id,
          evenement:   ev._id,
          type:        'rappel_evenement',
          titre:       'Rappel — votre événement commence demain !',
          message:     genererMessageRappel(u.first_name, ev.title_event, ev.ev_start_time),
          lu:          false,
        });
        /* EMAIL : nodemailer non configuré.
           Configurer SMTP dans .env pour activer
           l'envoi email. Seule la notification
           in-app est créée pour le moment. */
      }
    }
  } catch (err) {
    console.error('[Job rappel24h]', err.message);
  }
}

envoyerRappels24h();                              // exécution immédiate au démarrage
setInterval(envoyerRappels24h, 60 * 60 * 1000);  // puis toutes les heures
