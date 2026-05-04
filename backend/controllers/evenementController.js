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

const Evenement     = require('../models/Evenement');
const Participation = require('../models/Participation');
const Utilisateur   = require('../models/Utilisateur');
const Interest      = require('../models/Interest');
const Review        = require('../models/Review');
const Connexion     = require('../models/Connexion');
const Notification  = require('../models/Notification');
const crypto        = require('crypto');

// ── Helper : envoyer une notification à tous les participants d'un événement ──
// Utilisé par annulerEvenement, approuverModification, etc.
const notifierParticipants = async (eventId, type, titre, messageFn) => {
    const participations = await Participation.find({ evenement: eventId })
        .populate('utilisateur', 'first_name last_name _id');

    const docs = participations
        .filter(p => p.utilisateur)
        .map(p => ({
            utilisateur: p.utilisateur._id,
            evenement:   eventId,
            type,
            titre,
            message:     messageFn(p.utilisateur.first_name),
        }));

    if (docs.length > 0) {
        await Notification.insertMany(docs, { ordered: false }).catch(() => {});
    }
    return docs.length;
};

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
//
// RÈGLES :
//   user (créateur simple) → modification stockée dans modification_proposee,
//     en attente de validation par l'orga/admin.
//     Une notification est envoyée aux admins et organisateurs.
//
//   organisateur / admin → modification appliquée directement.
//     Les participants inscrits sont notifiés des changements.
// ─────────────────────────────────────────────────────────────
const modifierEvenement = async (req, res) => {
  try {
    const ev = await Evenement.findById(req.params.id)
        .populate('createur', 'first_name last_name _id');
    if (!ev) return res.status(404).json({ success: false, message: 'Événement introuvable' });

    const estCreateur = ev.createur._id.toString() === req.utilisateur._id.toString();
    const estPrivilegie = ['admin', 'organisateur'].includes(req.utilisateur.role);

    if (!estCreateur && !estPrivilegie) {
        return res.status(403).json({ success: false, message: 'Non autorisé' });
    }

    const {
        title_event, event_description, ev_start_time,
        ev_end_time, max_participants, location, categories, stat_event,
    } = req.body;

    // ── CAS 1 : créateur simple → soumettre pour validation ──────
    if (estCreateur && !estPrivilegie) {
        // Bloquer si une modification est déjà en attente
        if (ev.modification_en_attente) {
            return res.status(409).json({
                success: false,
                message: 'Une modification est déjà en attente de validation. Attendez la décision avant de soumettre une nouvelle modification.',
            });
        }

        // Stocker les nouvelles valeurs proposées
        const proposee = {
            titre:            title_event?.trim()           || ev.title_event,
            description:      event_description?.trim()     ?? ev.event_description,
            ev_start_time:    ev_start_time ? new Date(ev_start_time) : ev.ev_start_time,
            ev_end_time:      ev_end_time   ? new Date(ev_end_time)   : ev.ev_end_time,
            max_participants: max_participants ? Number(max_participants) : ev.max_participants,
            location:         location || ev.location,
            categories:       categories?.length ? categories : ev.categories,
            proposee_par:     req.utilisateur._id,
            proposee_le:      new Date(),
        };

        await Evenement.findByIdAndUpdate(req.params.id, {
            modification_en_attente: true,
            modification_proposee:   proposee,
        });

        // Notifier tous les admins et organisateurs
        const adminsEtOrgas = await Utilisateur.find({
            role: { $in: ['admin', 'organisateur'] },
        }).select('_id first_name');

        const notifDocs = adminsEtOrgas.map(u => ({
            utilisateur: u._id,
            evenement:   ev._id,
            type:        'modification_soumise',
            titre:       `✏️ Modification en attente — "${ev.title_event}"`,
            message:     `${ev.createur.first_name} ${ev.createur.last_name} a soumis une modification pour l'événement "${ev.title_event}". Rendez-vous dans votre dashboard pour approuver ou refuser les changements.`,
        }));
        await Notification.insertMany(notifDocs, { ordered: false }).catch(() => {});

        console.log(`📝 Modification soumise pour validation : "${ev.title_event}" par ${req.utilisateur.email}`);

        return res.json({
            success: true,
            message: 'Votre modification a été soumise. Un organisateur ou administrateur la validera prochainement.',
        });
    }

    // ── CAS 2 : organisateur/admin → application directe ─────────
    const updates = {};
    if (title_event)       updates.title_event       = title_event.trim();
    if (event_description !== undefined) updates.event_description = event_description?.trim() || '';
    if (ev_start_time)     updates.ev_start_time     = new Date(ev_start_time);
    if (ev_end_time)       updates.ev_end_time       = new Date(ev_end_time);
    if (max_participants)  updates.max_participants  = Number(max_participants);
    if (location)          updates.location          = location;
    if (categories?.length) updates.categories       = categories;

    // Seuls admin/orga peuvent changer le statut
    if (stat_event) updates.stat_event = stat_event;

    // Générer QR si première publication
    if (updates.stat_event === 'publié' && !ev.qr_code_token) {
        updates.qr_code_token = crypto.randomBytes(32).toString('hex');
    }

    const evMaj = await Evenement.findByIdAndUpdate(
        req.params.id, updates, { new: true, runValidators: true }
    ).populate('location', 'name_location').populate('categories', 'event_type').populate('createur', 'first_name last_name');

    // Notifier les participants des changements appliqués
    if (Object.keys(updates).some(k => ['title_event','ev_start_time','ev_end_time','location'].includes(k))) {
        await notifierParticipants(
            ev._id,
            'modification_approuvee',
            `📢 Mise à jour — "${evMaj.title_event}"`,
            (prenom) => `Bonjour ${prenom} ! L'événement "${evMaj.title_event}" auquel vous êtes inscrit vient d'être mis à jour par l'organisateur. Vérifiez les nouvelles informations dans vos inscriptions.`
        );
    }

    console.log(`✏️ Événement modifié directement par ${req.utilisateur.role} : "${ev.title_event}"`);

    return res.json({ success: true, message: 'Événement modifié', evenement: evMaj });
  } catch (error) {
    console.error('modifierEvenement:', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/evenements/:id/approuver-modification
// Orga ou admin approuve une modification en attente.
// Les champs proposés remplacent les champs actuels.
// Créateur + participants reçoivent une notification.
// ─────────────────────────────────────────────────────────────
const approuverModification = async (req, res) => {
  try {
    const ev = await Evenement.findById(req.params.id)
        .populate('createur', 'first_name last_name _id');
    if (!ev) return res.status(404).json({ success: false, message: 'Événement introuvable' });

    if (!ev.modification_en_attente || !ev.modification_proposee?.proposee_par) {
        return res.status(400).json({ success: false, message: 'Aucune modification en attente pour cet événement' });
    }

    const p = ev.modification_proposee;

    // Appliquer les valeurs proposées sur l'événement
    const updates = {
        modification_en_attente: false,
        modification_proposee:   {},         // vider le snapshot
    };
    if (p.titre)            updates.title_event       = p.titre;
    if (p.description !== undefined && p.description !== null) updates.event_description = p.description;
    if (p.ev_start_time)    updates.ev_start_time     = p.ev_start_time;
    if (p.ev_end_time)      updates.ev_end_time       = p.ev_end_time;
    if (p.max_participants) updates.max_participants  = p.max_participants;
    if (p.location)         updates.location          = p.location;
    if (p.categories?.length) updates.categories      = p.categories;

    const evMaj = await Evenement.findByIdAndUpdate(req.params.id, updates, { new: true })
        .populate('location', 'name_location').populate('categories', 'event_type');

    // Notifier le créateur
    await Notification.create({
        utilisateur: ev.createur._id,
        evenement:   ev._id,
        type:        'modification_approuvee',
        titre:       `✅ Modification approuvée — "${evMaj.title_event}"`,
        message:     `Bonne nouvelle ${ev.createur.first_name} ! Votre modification pour l'événement "${evMaj.title_event}" a été approuvée et appliquée. Les participants ont été informés.`,
    });

    // Notifier les participants
    await notifierParticipants(
        ev._id,
        'modification_approuvee',
        `📢 Mise à jour — "${evMaj.title_event}"`,
        (prenom) => `Bonjour ${prenom} ! L'événement "${evMaj.title_event}" a été mis à jour. Consultez vos inscriptions pour voir les nouvelles informations.`
    );

    console.log(`✅ Modification approuvée : "${ev.title_event}"`);
    return res.json({ success: true, message: 'Modification approuvée et appliquée', evenement: evMaj });
  } catch (error) {
    console.error('approuverModification:', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/evenements/:id/refuser-modification
// Body : { raison } — obligatoire
// Orga ou admin refuse. L'événement reste inchangé.
// Le créateur reçoit une notification avec la raison.
// ─────────────────────────────────────────────────────────────
const refuserModification = async (req, res) => {
  try {
    const { raison } = req.body;
    if (!raison || !raison.trim()) {
        return res.status(400).json({ success: false, message: 'La raison du refus est obligatoire' });
    }

    const ev = await Evenement.findById(req.params.id)
        .populate('createur', 'first_name last_name _id');
    if (!ev) return res.status(404).json({ success: false, message: 'Événement introuvable' });

    if (!ev.modification_en_attente) {
        return res.status(400).json({ success: false, message: 'Aucune modification en attente pour cet événement' });
    }

    // Remettre l'état à "pas de modification en attente" sans toucher les champs réels
    await Evenement.findByIdAndUpdate(req.params.id, {
        modification_en_attente: false,
        modification_proposee:   {},
    });

    // Notifier le créateur avec la raison du refus
    await Notification.create({
        utilisateur: ev.createur._id,
        evenement:   ev._id,
        type:        'modification_refusee',
        titre:       `❌ Modification refusée — "${ev.title_event}"`,
        message:     `Bonjour ${ev.createur.first_name}, votre demande de modification pour "${ev.title_event}" n'a pas pu être acceptée. Raison : ${raison.trim()}. N'hésitez pas à soumettre une nouvelle modification adaptée.`,
    });

    console.log(`❌ Modification refusée : "${ev.title_event}" — raison : ${raison}`);
    return res.json({ success: true, message: 'Modification refusée, le créateur a été notifié' });
  } catch (error) {
    console.error('refuserModification:', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/evenements/:id/annuler
// Body : { raison } — obligatoire
// Créateur, organisateur ou admin peuvent annuler.
// Tous les participants inscrits reçoivent une notification
// avec la raison et un message d'excuse chaleureux.
// ─────────────────────────────────────────────────────────────
const annulerEvenement = async (req, res) => {
  try {
    const { raison } = req.body;
    if (!raison || !raison.trim()) {
        return res.status(400).json({
            success: false,
            message: 'Une raison d\'annulation est obligatoire.',
        });
    }

    const ev = await Evenement.findById(req.params.id)
        .populate('createur', 'first_name last_name _id');
    if (!ev) return res.status(404).json({ success: false, message: 'Événement introuvable' });

    const estCreateur   = ev.createur._id.toString() === req.utilisateur._id.toString();
    const estPrivilegie = ['admin', 'organisateur'].includes(req.utilisateur.role);
    if (!estCreateur && !estPrivilegie) {
        return res.status(403).json({ success: false, message: 'Non autorisé' });
    }

    if (['annulé', 'terminé'].includes(ev.stat_event)) {
        return res.status(400).json({ success: false, message: `L'événement est déjà "${ev.stat_event}"` });
    }

    // Passer l'événement en "annulé" avec la raison
    await Evenement.findByIdAndUpdate(req.params.id, {
        stat_event:        'annulé',
        raison_annulation: raison.trim(),
        // Effacer toute modification en attente
        modification_en_attente: false,
        modification_proposee:   {},
    });

    // Notifier tous les participants avec un message chaleureux et une excuse
    const nb = await notifierParticipants(
        ev._id,
        'evenement_annule',
        `😔 Événement annulé — "${ev.title_event}"`,
        (prenom) =>
            `Bonjour ${prenom}, nous sommes sincèrement désolés de vous informer que l'événement ` +
            `"${ev.title_event}" a dû être annulé. Raison : ${raison.trim()}. ` +
            `Nous espérons vous retrouver très prochainement lors d'un prochain événement. Merci de votre compréhension ! 🙏`
    );

    console.log(`🚫 Événement annulé : "${ev.title_event}" — ${nb} participant(s) notifié(s)`);
    return res.json({
        success: true,
        message: `Événement annulé. ${nb} participant(s) notifié(s).`,
    });
  } catch (error) {
    console.error('annulerEvenement:', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ─────────────────────────────────────────────────────────────
// Appelée par le cron toutes les 15 min.
// Passe en "terminé" tous les événements publiés dont
// ev_end_time est dépassé (ou ev_start_time + 2h si pas de fin).
// ─────────────────────────────────────────────────────────────
const terminerEvenementsExpires = async () => {
    const maintenant = new Date();

    // 1. Événements avec ev_end_time défini et dépassé
    const avecFin = await Evenement.find({
        stat_event: 'publié',
        ev_end_time: { $lt: maintenant },
    });

    // 2. Événements sans ev_end_time mais dont ev_start_time + 2h est dépassé
    const seuil2h = new Date(maintenant.getTime() - 2 * 60 * 60 * 1000);
    const sansFin = await Evenement.find({
        stat_event:  'publié',
        ev_end_time: { $exists: false },
        ev_start_time: { $lt: seuil2h },
    });

    const expires = [...avecFin, ...sansFin];
    if (expires.length === 0) return;

    for (const ev of expires) {
        await Evenement.findByIdAndUpdate(ev._id, { stat_event: 'terminé' });
        console.log(`🏁 Événement passé en "terminé" : "${ev.title_event}"`);
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
  // Cycle de vie
  annulerEvenement, approuverModification, refuserModification,
  terminerEvenementsExpires,
};
