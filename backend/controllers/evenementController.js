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
const { verifierChevauchement }        = require('../utils/chevauchement');

// ── Services IA ───────────────────────────────────────────────
// iaSuggestionService : formule pondérée de recommandation d'événements
const { getSuggestionsPourUtilisateur } = require('../services/iaSuggestionService');
// iaFiabiliteService  : recalcul du score de fiabilité après chaque scan QR
const { recalculerFiabilite }           = require('../services/iaFiabiliteService');

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

    if (ev_end_time && new Date(ev_end_time) <= new Date(ev_start_time)) {
      return res.status(400).json({
        success: false,
        message: 'La date de fin doit être postérieure à la date de début.',
      });
    }

    // ── Vérification de chevauchement ──
    const conflit = await verifierChevauchement(
      req.utilisateur._id,
      ev_start_time,
      ev_end_time || null,
    );
    if (conflit) {
      return res.status(409).json({ success: false, message: conflit.message });
    }

    // ── Vérification de conflit de lieu ──
    if (location) {
      const fmtDate = (d) =>
        new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });

      const conflitLieu = await Evenement.findOne({
        location:      location,
        stat_event:    { $in: ['brouillon', 'publié'] },
        ev_start_time: { $lt: ev_end_time ? new Date(ev_end_time) : new Date(new Date(ev_start_time).getTime() + 2 * 60 * 60 * 1000) },
        ev_end_time:   { $gt: new Date(ev_start_time) },
      }).populate('createur', 'first_name last_name')
        .populate('location', 'name_location');

      if (conflitLieu) {
        await Notification.create({
          utilisateur: req.utilisateur._id,
          evenement:   null,
          type:        'systeme',
          titre:       'Conflit de lieu détecté',
          message:     `Votre événement "${title_event}" n'a pas pu être créé car le lieu "${conflitLieu.location?.name_location || 'sélectionné'}" est déjà réservé du ${fmtDate(conflitLieu.ev_start_time)} au ${fmtDate(conflitLieu.ev_end_time)} par l'événement "${conflitLieu.title_event}". Veuillez choisir un autre lieu ou une autre plage horaire.`,
        });

        return res.status(409).json({
          success: false,
          message: `Un événement existe déjà dans ce lieu sur cette plage horaire : "${conflitLieu.title_event}" du ${fmtDate(conflitLieu.ev_start_time)} au ${fmtDate(conflitLieu.ev_end_time)}`,
          conflit: {
            titre:    conflitLieu.title_event,
            debut:    conflitLieu.ev_start_time,
            fin:      conflitLieu.ev_end_time,
            createur: conflitLieu.createur?.first_name,
          },
        });
      }
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
      // qr_code_token volontairement absent : le champ doit être MANQUANT (pas null)
      // pour que le sparse unique index l'ignore et permette plusieurs brouillons.
      // Il est défini ci-dessous seulement pour les événements publiés.
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
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'Un événement avec ces données existe déjà (contrainte d\'unicité).' });
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

        // Vérifier le chevauchement sur les nouvelles dates proposées
        if (ev_start_time || ev_end_time) {
            const newStart = ev_start_time ? new Date(ev_start_time) : ev.ev_start_time;
            const newEnd   = ev_end_time   ? new Date(ev_end_time)   : ev.ev_end_time;
            if (newEnd && newEnd <= newStart) {
                return res.status(400).json({ success: false, message: 'La date de fin doit être postérieure à la date de début.' });
            }
            const conflit  = await verifierChevauchement(req.utilisateur._id, newStart, newEnd, req.params.id);
            if (conflit) {
                return res.status(409).json({ success: false, message: conflit.message });
            }
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
    // Vérifier le chevauchement pour le créateur si les dates changent
    if (ev_start_time || ev_end_time) {
        const newStart = ev_start_time ? new Date(ev_start_time) : ev.ev_start_time;
        const newEnd   = ev_end_time   ? new Date(ev_end_time)   : ev.ev_end_time;
        if (newEnd && newEnd <= newStart) {
            return res.status(400).json({ success: false, message: 'La date de fin doit être postérieure à la date de début.' });
        }
        const conflit  = await verifierChevauchement(ev.createur._id, newStart, newEnd, req.params.id);
        if (conflit) {
            return res.status(409).json({
                success: false,
                message: `Impossible de déplacer l'événement : le créateur a un conflit — ${conflit.message}`,
            });
        }
    }

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
//
// RÈGLES :
//   créateur simple → annulation stockée dans annulation_proposee,
//     en attente de confirmation par orga/admin.
//     Une notification est envoyée aux admins et organisateurs.
//
//   organisateur / admin → annulation appliquée directement.
//     Les participants sont notifiés immédiatement.
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

    // ── CAS 1 : créateur simple → soumettre pour confirmation ──
    if (estCreateur && !estPrivilegie) {
        if (ev.annulation_en_attente) {
            return res.status(409).json({
                success: false,
                message: 'Une demande d\'annulation est déjà en attente de validation.',
            });
        }

        await Evenement.findByIdAndUpdate(req.params.id, {
            annulation_en_attente: true,
            annulation_proposee: {
                raison:       raison.trim(),
                proposee_par: req.utilisateur._id,
                proposee_le:  new Date(),
            },
        });

        const adminsEtOrgas = await Utilisateur.find(
            { role: { $in: ['admin', 'organisateur'] } }, '_id'
        );
        const notifDocs = adminsEtOrgas.map(u => ({
            utilisateur: u._id,
            evenement:   ev._id,
            type:        'annulation_soumise',
            titre:       `⚠️ Demande d'annulation — "${ev.title_event}"`,
            message:     `${ev.createur.first_name} ${ev.createur.last_name} demande l'annulation de l'événement "${ev.title_event}". Raison : ${raison.trim()}. Validez ou refusez dans votre dashboard.`,
        }));
        await Notification.insertMany(notifDocs, { ordered: false }).catch(() => {});

        return res.json({
            success: true,
            message: 'Demande d\'annulation soumise. Un organisateur ou administrateur la confirmera prochainement.',
        });
    }

    // ── CAS 2 : organisateur/admin → application directe ──────
    await Evenement.findByIdAndUpdate(req.params.id, {
        stat_event:             'annulé',
        raison_annulation:      raison.trim(),
        annulation_en_attente:  false,
        annulation_proposee:    {},
        modification_en_attente: false,
        modification_proposee:   {},
    });

    const nb = await notifierParticipants(
        ev._id,
        'evenement_annule',
        `😔 Événement annulé — "${ev.title_event}"`,
        (prenom) =>
            `Bonjour ${prenom}, nous sommes sincèrement désolés de vous informer que l'événement ` +
            `"${ev.title_event}" a dû être annulé. Raison : ${raison.trim()}. ` +
            `Nous espérons vous retrouver très prochainement lors d'un prochain événement. Merci de votre compréhension ! 🙏`
    );

    console.log(`🚫 Événement annulé directement par ${req.utilisateur.role} : "${ev.title_event}" — ${nb} participant(s) notifié(s)`);
    return res.json({ success: true, message: `Événement annulé. ${nb} participant(s) notifié(s).` });
  } catch (error) {
    console.error('annulerEvenement:', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/evenements/:id/approuver-annulation
// Orga ou admin confirme l'annulation soumise par le créateur.
// L'événement passe en 'annulé', participants notifiés.
// ─────────────────────────────────────────────────────────────
const approuverAnnulation = async (req, res) => {
  try {
    const ev = await Evenement.findById(req.params.id)
        .populate('createur', 'first_name last_name _id');
    if (!ev) return res.status(404).json({ success: false, message: 'Événement introuvable' });

    if (!ev.annulation_en_attente) {
        return res.status(400).json({ success: false, message: 'Aucune demande d\'annulation en attente' });
    }

    const raison = ev.annulation_proposee?.raison || 'Raison non précisée';

    await Evenement.findByIdAndUpdate(req.params.id, {
        stat_event:            'annulé',
        raison_annulation:     raison,
        annulation_en_attente: false,
        annulation_proposee:   {},
        modification_en_attente: false,
        modification_proposee:   {},
    });

    // Notifier le créateur
    await Notification.create({
        utilisateur: ev.createur._id,
        evenement:   ev._id,
        type:        'annulation_approuvee',
        titre:       `✅ Annulation confirmée — "${ev.title_event}"`,
        message:     `${ev.createur.first_name}, votre demande d'annulation pour l'événement "${ev.title_event}" a été approuvée. Les participants ont été informés.`,
    });

    // Notifier les participants
    const nb = await notifierParticipants(
        ev._id,
        'evenement_annule',
        `😔 Événement annulé — "${ev.title_event}"`,
        (prenom) =>
            `Bonjour ${prenom}, nous sommes sincèrement désolés de vous informer que l'événement ` +
            `"${ev.title_event}" a dû être annulé. Raison : ${raison}. ` +
            `Nous espérons vous retrouver très prochainement ! 🙏`
    );

    console.log(`✅ Annulation approuvée : "${ev.title_event}" — ${nb} participant(s) notifié(s)`);
    return res.json({ success: true, message: `Annulation approuvée. ${nb} participant(s) notifié(s).` });
  } catch (error) {
    console.error('approuverAnnulation:', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/evenements/:id/refuser-annulation
// Body : { raison } — obligatoire
// L'événement reste publié. Le créateur est notifié.
// ─────────────────────────────────────────────────────────────
const refuserAnnulation = async (req, res) => {
  try {
    const { raison } = req.body;
    if (!raison || !raison.trim()) {
        return res.status(400).json({ success: false, message: 'La raison du refus est obligatoire' });
    }

    const ev = await Evenement.findById(req.params.id)
        .populate('createur', 'first_name last_name _id');
    if (!ev) return res.status(404).json({ success: false, message: 'Événement introuvable' });

    if (!ev.annulation_en_attente) {
        return res.status(400).json({ success: false, message: 'Aucune demande d\'annulation en attente' });
    }

    await Evenement.findByIdAndUpdate(req.params.id, {
        annulation_en_attente: false,
        annulation_proposee:   {},
    });

    await Notification.create({
        utilisateur: ev.createur._id,
        evenement:   ev._id,
        type:        'annulation_refusee',
        titre:       `❌ Demande d'annulation refusée — "${ev.title_event}"`,
        message:     `${ev.createur.first_name}, votre demande d'annulation pour "${ev.title_event}" n'a pas été retenue. Raison : ${raison.trim()}. L'événement reste actif.`,
    });

    console.log(`❌ Annulation refusée : "${ev.title_event}"`);
    return res.json({ success: true, message: 'Demande d\'annulation refusée, le créateur a été notifié' });
  } catch (error) {
    console.error('refuserAnnulation:', error);
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

      // Incrémenter les compteurs de gamification (heures de sport + points)
      // reliabilite_score est mis à jour séparément par le service IA ci-dessous
      await Utilisateur.findByIdAndUpdate(req.utilisateur._id, {
        $inc: { cumul_heures_participation: Math.round(heures * 10) / 10, cumul_points: 10 },
      });

      // Recalculer le score de fiabilité via le service IA (formule centralisée)
      // Formule : (nb_presences / nb_inscriptions) × 100
      // Définie dans services/iaFiabiliteService.js pour réutilisation future
      await recalculerFiabilite(req.utilisateur._id);

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
// GET /api/evenements/suggestions — Événements recommandés (IA)
//
// Délègue entièrement le calcul à iaSuggestionService.
// Formule détaillée dans services/iaSuggestionService.js :
//   score = affinite_categorie×0.35 + presence_sociale×0.30
//         + reputation_event×0.20   + fiabilite_org×0.15
// ─────────────────────────────────────────────────────────────
const getSuggestions = async (req, res) => {
  try {
    // Calculer les scores via le service IA (5 suggestions par défaut)
    const resultats = await getSuggestionsPourUtilisateur(req.utilisateur._id, 5);

    // Formater chaque événement pour le frontend
    // (ajoute nb_inscrits, lieu, categorie — via la fonction formater locale)
    const suggestions = await Promise.all(
      resultats.map(async ({ ev, score_total, detail }) => ({
        ...(await formater(ev)),
        score:        score_total,  // score global entre 0.0 et 1.0
        score_detail: detail,       // détail par paramètre (debug / "Pourquoi ce conseil ?")
      }))
    );

    return res.json({ success: true, suggestions });
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
  approuverAnnulation, refuserAnnulation,
  terminerEvenementsExpires,
};
