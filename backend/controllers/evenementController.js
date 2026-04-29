// ============================================================
// controllers/evenementController.js
//
// RÈGLES MÉTIER :
//   - Tout utilisateur connecté peut CRÉER un événement
//   - user  → stat_event forcé à 'brouillon' (admin doit publier)
//   - admin → peut créer directement en 'publié'
//   - Modifier / Supprimer : créateur OU admin
//   - Un user ne peut supprimer que SES brouillons
//   - Seul l'admin peut changer le statut vers 'publié'
// ============================================================

const Evenement = require('../models/Evenement');
const Participation = require('../models/Participation');
const Utilisateur = require('../models/Utilisateur');
const Interest = require('../models/Interest');
const Review = require('../models/Review');
const Connexion = require('../models/Connexion');
const crypto = require('crypto');

// ── Formater un événement pour le frontend ──────────────────
const formater = async (ev) => {
  const nb = await Participation.countDocuments({ evenement: ev._id });
  const obj = ev.toObject ? ev.toObject() : ev;
  return {
    ...obj,
    nb_inscrits: nb,
    lieu: ev.location?.name_location || 'Lieu non défini',
    categorie: ev.categories?.[0]?.event_type || 'Sport',
    titre: ev.title_event,
    description: ev.event_description,
  };
};

// ─────────────────────────────────────────────────────────────
// GET /api/evenements — Événements publiés (public)
// ─────────────────────────────────────────────────────────────
const getEvenements = async (req, res) => {
  try {
    const evs = await Evenement.find({ stat_event: 'publié' })
      .populate('location', 'name_location gps_coordinates')
      .populate('categories', 'event_type event_categ')
      .populate('createur', 'first_name last_name')
      .sort({ ev_start_time: 1 });

    const resultats = await Promise.all(evs.map(formater));
    return res.json({ success: true, count: resultats.length, evenements: resultats });
  } catch (error) {
    console.error('getEvenements:', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/evenements/all — Tous les événements (admin)
// ─────────────────────────────────────────────────────────────
const getTousEvenements = async (req, res) => {
  try {
    const evs = await Evenement.find()
      .populate('location', 'name_location')
      .populate('categories', 'event_type')
      .populate('createur', 'first_name last_name')
      .sort({ ev_start_time: -1 });

    const resultats = await Promise.all(evs.map(formater));
    return res.json({ success: true, count: resultats.length, evenements: resultats });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/evenements/mes-evenements — Mes événements créés
// ─────────────────────────────────────────────────────────────
const getMesEvenements = async (req, res) => {
  try {
    const evs = await Evenement.find({ createur: req.utilisateur._id })
      .populate('location', 'name_location')
      .populate('categories', 'event_type')
      .sort({ ev_start_time: -1 });

    const resultats = await Promise.all(evs.map(formater));
    return res.json({ success: true, count: resultats.length, evenements: resultats });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/evenements/:id — Détail
// ─────────────────────────────────────────────────────────────
const getEvenement = async (req, res) => {
  try {
    const ev = await Evenement.findById(req.params.id)
      .populate('location')
      .populate('categories')
      .populate('createur', 'first_name last_name email');
    if (!ev) return res.status(404).json({ success: false, message: 'Événement introuvable' });
    return res.json({ success: true, evenement: await formater(ev) });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/evenements — Créer un événement
// ✅ Accessible à TOUT utilisateur connecté
// ─────────────────────────────────────────────────────────────
const creerEvenement = async (req, res) => {
  try {
    const {
      title_event, event_description, ev_start_time,
      ev_end_time, max_participants, location, categories, stat_event,
    } = req.body;

    if (!title_event || !ev_start_time) {
      return res.status(400).json({
        success: false,
        message: 'Le titre et la date de début sont obligatoires',
      });
    }

    // ── RÈGLE CLÉ : statut selon le rôle ──
    // user         → toujours 'brouillon', l'admin publiera après validation
    // admin/orga   → respecte le choix du formulaire
    const canPublish = ['admin', 'organisateur'].includes(req.utilisateur.role);
    const statutFinal = canPublish
      ? (stat_event || 'brouillon')
      : 'brouillon';

    const data = {
      title_event: title_event.trim(),
      event_description: event_description?.trim() || '',
      ev_start_time: new Date(ev_start_time),
      ev_end_time: ev_end_time ? new Date(ev_end_time) : undefined,
      max_participants: Number(max_participants) || 30,
      stat_event: statutFinal,
      createur: req.utilisateur._id,
      qr_code_token: null,
    };

    if (location && location !== '') data.location = location;
    if (categories?.length) data.categories = Array.isArray(categories) ? categories : [categories];
    if (statutFinal === 'publié') data.qr_code_token = crypto.randomBytes(32).toString('hex');

    const ev = await Evenement.create(data);
    const evPopule = await Evenement.findById(ev._id)
      .populate('location', 'name_location')
      .populate('categories', 'event_type event_categ')
      .populate('createur', 'first_name last_name');

    console.log(`✅ Événement créé [${req.utilisateur.role}] : ${ev.title_event}`);

    const message = canPublish
      ? `Événement "${ev.title_event}" créé`
      : `Événement "${ev.title_event}" soumis — en attente de validation par l'administrateur`;

    return res.status(201).json({ success: true, message, evenement: evPopule });
  } catch (error) {
    console.error('creerEvenement:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: Object.values(error.errors).map(e => e.message).join(', ') });
    }
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ─────────────────────────────────────────────────────────────
// PUT /api/evenements/:id — Modifier
// Créateur OU admin peuvent modifier
// Un user ne peut PAS passer le statut à 'publié'
// ─────────────────────────────────────────────────────────────
const modifierEvenement = async (req, res) => {
  try {
    const ev = await Evenement.findById(req.params.id);
    if (!ev) return res.status(404).json({ success: false, message: 'Événement introuvable' });

    const estCreateur = ev.createur.toString() === req.utilisateur._id.toString();
    const estAdmin = req.utilisateur.role === 'admin';
    if (!estCreateur && !estAdmin) {
      return res.status(403).json({ success: false, message: 'Non autorisé' });
    }

    const updates = { ...req.body };
    if (updates.ev_start_time) updates.ev_start_time = new Date(updates.ev_start_time);
    if (updates.ev_end_time) updates.ev_end_time = new Date(updates.ev_end_time);

    // Seuls admin et organisateur peuvent publier
    const canPublish = ['admin', 'organisateur'].includes(req.utilisateur.role);
    if (!canPublish && updates.stat_event === 'publié') delete updates.stat_event;

    // Générer QR si publication
    if (updates.stat_event === 'publié' && !ev.qr_code_token) {
      updates.qr_code_token = crypto.randomBytes(32).toString('hex');
    }

    const evMaj = await Evenement.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
      .populate('location', 'name_location')
      .populate('categories', 'event_type')
      .populate('createur', 'first_name last_name');

    return res.json({ success: true, message: 'Événement modifié', evenement: evMaj });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ─────────────────────────────────────────────────────────────
// DELETE /api/evenements/:id — Supprimer
// Créateur peut supprimer ses brouillons
// Admin peut tout supprimer
// ─────────────────────────────────────────────────────────────
const supprimerEvenement = async (req, res) => {
  try {
    const ev = await Evenement.findById(req.params.id);
    if (!ev) return res.status(404).json({ success: false, message: 'Événement introuvable' });

    const estCreateur = ev.createur.toString() === req.utilisateur._id.toString();
    const estAdmin = req.utilisateur.role === 'admin';
    if (!estCreateur && !estAdmin) {
      return res.status(403).json({ success: false, message: 'Non autorisé' });
    }
    if (!estAdmin && ev.stat_event === 'publié') {
      return res.status(403).json({ success: false, message: 'Impossible de supprimer un événement publié' });
    }

    await Evenement.findByIdAndDelete(req.params.id);
    await Participation.deleteMany({ evenement: req.params.id });
    return res.json({ success: true, message: 'Événement supprimé' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/evenements/:id/qr-scan
// ─────────────────────────────────────────────────────────────
const qrScan = async (req, res) => {
  try {
    const { qr_code_token } = req.body;
    if (!qr_code_token) return res.status(400).json({ success: false, message: 'Token QR manquant' });

    const ev = await Evenement.findOne({ qr_code_token }).populate('categories', '_id');
    if (!ev) return res.status(404).json({ success: false, message: 'QR Code invalide' });

    const p = await Participation.findOneAndUpdate(
      { utilisateur: req.utilisateur._id, evenement: ev._id },
      { is_present: true, scanner_date: new Date() },
      { new: true }
    );
    if (!p) return res.status(404).json({ success: false, message: 'Vous n\'êtes pas inscrit à cet événement' });

    // ── Mise à jour des statistiques du participant ──
    try {
      const heures = ev.ev_end_time && ev.ev_start_time
        ? (new Date(ev.ev_end_time) - new Date(ev.ev_start_time)) / (1000 * 60 * 60)
        : 1;

      // Calculer score fiabilité
      const totalInscriptions = await Participation.countDocuments({ utilisateur: req.utilisateur._id });
      const totalPresences = await Participation.countDocuments({ utilisateur: req.utilisateur._id, is_present: true });
      const reliabilite = totalInscriptions > 0 ? Math.round((totalPresences / totalInscriptions) * 100) : 100;

      await Utilisateur.findByIdAndUpdate(req.utilisateur._id, {
        $inc: { cumul_heures_participation: Math.round(heures * 10) / 10, cumul_points: 10 },
        reliabilite_score: reliabilite,
      });

      // Mettre à jour ou créer l'interest pour chaque catégorie de l'événement
      for (const cat of (ev.categories || [])) {
        await Interest.findOneAndUpdate(
          { utilisateur: req.utilisateur._id, categorie: cat._id },
          { $inc: { nb_participations: 1 } },
          { upsert: true, new: true }
        );
      }
    } catch (statErr) {
      console.warn('⚠️ Stats qrScan partielles:', statErr.message);
    }

    return res.json({ success: true, message: '✅ Présence confirmée !', participation: p, evenement: { title_event: ev.title_event } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/evenements/suggestions — Événements recommandés
// Score pondéré par catégorie, connexions, note, fiabilité orga
// ─────────────────────────────────────────────────────────────
const getSuggestions = async (req, res) => {
  try {
    const moi = req.utilisateur._id;
    const maintenant = new Date();

    const evs = await Evenement.find({ stat_event: 'publié', ev_start_time: { $gt: maintenant } })
      .populate('categories', '_id')
      .populate('createur', 'reliabilite_score')
      .limit(50);

    // Mes intérêts avec nb_participations
    const mesInterests = await Interest.find({ utilisateur: moi });
    const interestMap = {};
    mesInterests.forEach(i => { interestMap[i.categorie.toString()] = i.nb_participations; });

    // Mes connexions acceptées
    const mesConnexions = await Connexion.find({
      $or: [{ demandeur: moi }, { receveur: moi }],
      type: 'partenaire', statut: 'accepte',
    });
    const idConnexions = mesConnexions.map(c =>
      c.demandeur.toString() === moi.toString() ? c.receveur.toString() : c.demandeur.toString()
    );

    const scores = await Promise.all(evs.map(async (ev) => {
      // Score catégorie (35%)
      const maxPart = Math.max(...(ev.categories || []).map(c => interestMap[c._id.toString()] || 0), 0);
      const scoreCat = Math.min(maxPart / 10, 1) * 0.35;

      // Score connexions inscrites (30%)
      const nb_inscrits = await Participation.countDocuments({ evenement: ev._id });
      const inscrisConnectes = nb_inscrits > 0
        ? await Participation.countDocuments({ evenement: ev._id, utilisateur: { $in: idConnexions } })
        : 0;
      const scoreCx = Math.min(inscrisConnectes / 3, 1) * 0.30;

      // Score note moyenne événement (20%) — via Review si disponible
      let scoreNote = 0.10; // neutre par défaut

      // Score fiabilité organisateur (15%)
      const fiab = ev.createur?.reliabilite_score ?? 80;
      const scoreOrga = (fiab / 100) * 0.15;

      return { ev, score: scoreCat + scoreCx + scoreNote + scoreOrga };
    }));

    const top5 = scores.sort((a, b) => b.score - a.score).slice(0, 5);
    const resultats = await Promise.all(top5.map(async ({ ev, score }) => ({
      ...(await formater(ev)),
      score,
    })));

    return res.json({ success: true, suggestions: resultats });
  } catch (error) {
    console.error('getSuggestions:', error.message);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/evenements/:id/noter
// Body: { note (1-5), commentaire }
// ─────────────────────────────────────────────────────────────
const noterEvenement = async (req, res) => {
  try {
    const { note, commentaire } = req.body;
    if (!note || note < 1 || note > 5) {
      return res.status(400).json({ success: false, message: 'Note entre 1 et 5' });
    }

    const participation = await Participation.findOne({
      utilisateur: req.utilisateur._id, evenement: req.params.id, is_present: true,
    });
    if (!participation) {
      return res.status(403).json({ success: false, message: 'Vous devez avoir participé à cet événement' });
    }

    const ev = await Evenement.findById(req.params.id).populate('categories', '_id');
    if (!ev) return res.status(404).json({ success: false, message: 'Événement introuvable' });

    // Mettre à jour interest.note pour chaque catégorie
    for (const cat of (ev.categories || [])) {
      await Interest.findOneAndUpdate(
        { utilisateur: req.utilisateur._id, categorie: cat._id },
        { note },
        { upsert: true }
      );
    }

    // Créer le Review
    await Review.create({
      utilisateur: req.utilisateur._id,
      evenement: req.params.id,
      note,
      commentaire: commentaire?.trim() || '',
    });

    return res.json({ success: true, message: 'Note enregistrée' });
  } catch (error) {
    console.error('noterEvenement:', error.message);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

module.exports = {
  getEvenements, getTousEvenements, getMesEvenements,
  getEvenement, creerEvenement, modifierEvenement,
  supprimerEvenement, qrScan, getSuggestions, noterEvenement,
};
