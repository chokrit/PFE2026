// ============================================================
// routes/participations.js
// Préfixe : /api/participations
//
// ROUTES :
//   GET  /mes-inscriptions                → liste des inscriptions du user connecté
//   POST /:eventId/inscription            → s'inscrire à un événement
//   GET  /evenement/:eventId              → participants d'un événement (orga/admin)
//   DELETE /:eventId/annuler              → annuler son inscription
//   POST /marquer-present/:participationId→ marquage manuel (orga/admin)
//   POST /valider-presence                → scan QR du participant (orga/admin) ← NOUVEAU
//   POST /message-absents/:eventId        → encouragement aux absents (orga/admin) ← NOUVEAU
// ============================================================

const express  = require('express');
const router   = express.Router();
const crypto   = require('crypto');

const { verifyToken, isOrganisateur } = require('../middleware/auth');

const Participation       = require('../models/Participation');
const Evenement           = require('../models/Evenement');
const Utilisateur         = require('../models/Utilisateur');
const Interest            = require('../models/Interest');
const Notification        = require('../models/Notification');
const StatistiquePresence = require('../models/StatistiquePresence');
const RegleRecompense     = require('../models/RegleRecompence');
const Appartenir          = require('../models/Appartenir');
const Discount            = require('../models/Discount');

// ── Helper : calculer le niveau depuis les points cumulés ──
const calculerNiveau = (pts) => {
    if (pts >= 500) return 'Champion';
    if (pts >= 200) return 'Avancé';
    if (pts >= 50)  return 'Actif';
    return 'Débutant';
};

// ── Helper : vérifier et déclencher les vouchers ──────────
// Reçoit l'utilisateur MIS À JOUR et le nombre total de présences.
// Pour chaque règle active non encore attribuée à cet utilisateur,
// crée un Discount + Appartenir si le seuil est atteint.
// Retourne true si au moins un coupon a été créé.
const verifierVouchers = async (utilisateur, totalPresences) => {
    const regles = await RegleRecompense.find({ est_active: true });
    let couponsCreés = false;

    for (const regle of regles) {
        // Vérifier si l'utilisateur a déjà reçu un coupon pour cette règle
        const dejaAttribue = await Appartenir.findOne({
            utilisateur: utilisateur._id,
            regle:       regle._id,
        });
        if (dejaAttribue) continue; // coupon déjà donné, on passe

        // Vérifier les deux seuils possibles (heures OU participations)
        const seuilHeuresAtteint =
            regle.nbre_heures_pour_recompense > 0 &&
            utilisateur.cumul_heures_participation >= regle.nbre_heures_pour_recompense;

        const seuilPresencesAtteint =
            regle.nbre_participations > 0 &&
            totalPresences >= regle.nbre_participations;

        if (!seuilHeuresAtteint && !seuilPresencesAtteint) continue;

        // Créer le coupon (Discount) avec un code unique
        const code    = `EVENT-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
        const expiry  = new Date();
        expiry.setMonth(expiry.getMonth() + 3); // expire dans 3 mois

        const discount = await Discount.create({
            coupon_code:   code,
            status:        'actif',
            date_coupon:   new Date(),
            datefin_coupon: expiry,
        });

        // Attribuer le coupon à l'utilisateur via Appartenir
        await Appartenir.create({
            utilisateur:  utilisateur._id,
            coupon:       discount._id,
            regle:        regle._id,
            expiry_date:  expiry,
            is_redeemed:  false,
        });

        console.log(`🎫 Coupon "${code}" attribué à ${utilisateur.first_name} (règle: ${regle.titre_recompense})`);
        couponsCreés = true;
    }

    return couponsCreés;
};

// ─────────────────────────────────────────────────────────────
// GET /api/participations/mes-inscriptions
// Retourne les inscriptions de l'utilisateur connecté
// ─────────────────────────────────────────────────────────────
router.get('/mes-inscriptions', verifyToken, async (req, res) => {
    try {
        const participations = await Participation.find({
            utilisateur: req.utilisateur._id,
        }).populate({
            path: 'evenement',
            populate: [
                { path: 'location',   select: 'name_location' },
                { path: 'categories', select: 'event_type' },
            ],
        });

        const inscriptions = participations.map((p) => ({
            id:              p._id,
            eventId:         p.evenement?._id,
            titre:           p.evenement?.title_event || 'Événement inconnu',
            date:            p.evenement?.ev_start_time,
            lieu:            p.evenement?.location?.name_location || 'Lieu non défini',
            categorie:       p.evenement?.categories?.[0]?.event_type || 'Sport',
            stat_event:      p.evenement?.stat_event,
            is_present:      p.is_present,
            // ── QR token PERSONNEL du participant (pas celui de l'événement) ──
            // Chaque participant a son propre token, unique et à usage unique
            qr_token:        p.qr_token || null,
            qr_utilise:      p.qr_utilise || false,
            max_participants: p.evenement?.max_participants || 0,
            registered_at:   p.registered_at,
        }));

        return res.json({ success: true, participations: inscriptions });
    } catch (error) {
        console.error('Erreur mes-inscriptions:', error);
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// ─────────────────────────────────────────────────────────────
// POST /api/participations/:eventId/inscription
// S'inscrire à un événement — génère un qr_token unique
// ─────────────────────────────────────────────────────────────
router.post('/:eventId/inscription', verifyToken, async (req, res) => {
    try {
        const { eventId } = req.params;

        const evenement = await Evenement.findById(eventId);
        if (!evenement) {
            return res.status(404).json({ success: false, message: 'Événement introuvable' });
        }
        if (evenement.stat_event !== 'publié') {
            return res.status(400).json({
                success: false,
                message: "Cet événement n'est pas ouvert aux inscriptions",
            });
        }

        // Vérifier les places disponibles
        const nbInscrits = await Participation.countDocuments({ evenement: eventId });
        if (nbInscrits >= evenement.max_participants) {
            return res.status(400).json({ success: false, message: 'Événement complet' });
        }

        // Vérifier si déjà inscrit
        const dejaInscrit = await Participation.findOne({
            utilisateur: req.utilisateur._id,
            evenement:   eventId,
        });
        if (dejaInscrit) {
            return res.status(409).json({
                success: false,
                message: 'Vous êtes déjà inscrit à cet événement',
            });
        }

        // Générer un token QR unique pour CE participant à CET événement
        // 48 caractères hex — assez long pour être impossible à deviner
        const qr_token = crypto.randomBytes(24).toString('hex');

        const participation = await Participation.create({
            utilisateur:   req.utilisateur._id,
            evenement:     eventId,
            is_present:    false,
            registered_at: new Date(),
            qr_token,       // ← token personnel
            qr_utilise:    false,
        });

        console.log(`✅ Inscription: ${req.utilisateur.email} → ${evenement.title_event}`);

        return res.status(201).json({
            success: true,
            message: 'Inscription confirmée !',
            participation,
        });
    } catch (error) {
        console.error('Erreur inscription:', error);
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// ─────────────────────────────────────────────────────────────
// GET /api/participations/evenement/:eventId
// Liste des participants d'un événement (orga/admin)
// ─────────────────────────────────────────────────────────────
router.get('/evenement/:eventId', verifyToken, async (req, res) => {
    try {
        const participants = await Participation.find({
            evenement: req.params.eventId,
        }).populate('utilisateur', 'first_name last_name email telephone');

        return res.json({ success: true, count: participants.length, participants });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// ─────────────────────────────────────────────────────────────
// DELETE /api/participations/:eventId/annuler
// Annuler son inscription
// ─────────────────────────────────────────────────────────────
router.delete('/:eventId/annuler', verifyToken, async (req, res) => {
    try {
        const participation = await Participation.findOneAndDelete({
            utilisateur: req.utilisateur._id,
            evenement:   req.params.eventId,
        });

        if (!participation) {
            return res.status(404).json({ success: false, message: 'Inscription introuvable' });
        }

        return res.json({ success: true, message: 'Inscription annulée' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// ─────────────────────────────────────────────────────────────
// POST /api/participations/marquer-present/:participationId
// Marquage manuel (orga/admin) — sans contrainte horaire
// ─────────────────────────────────────────────────────────────
router.post('/marquer-present/:participationId', verifyToken, async (req, res) => {
    try {
        const participation = await Participation.findById(req.params.participationId)
            .populate('evenement', 'createur title_event');

        if (!participation) {
            return res.status(404).json({ success: false, message: 'Participation introuvable' });
        }

        const estCreateur = participation.evenement?.createur?.toString() === req.utilisateur._id.toString();
        const estAdmin    = req.utilisateur.role === 'admin';

        if (!estCreateur && !estAdmin) {
            return res.status(403).json({
                success: false,
                message: "Non autorisé — vous n'êtes pas le créateur de cet événement",
            });
        }

        participation.is_present    = true;
        participation.scanner_date  = new Date();
        await participation.save();

        return res.json({ success: true, message: 'Présence confirmée', participation });
    } catch (error) {
        console.error('Erreur marquer-present:', error);
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// ─────────────────────────────────────────────────────────────
// POST /api/participations/valider-presence
// Validation de présence par scan QR (organisateur / admin)
//
// Body : { qr_token }
//
// Règles métier :
//   1. Rôle organisateur ou admin obligatoire
//   2. Fenêtre horaire stricte :
//      - Même jour calendaire que ev_start_time
//      - Heure actuelle entre ev_start_time et ev_end_time
//   3. qr_utilise doit être false (scan unique)
//   4. Après scan :
//      - participation  → is_present=true, scanner_date, qr_utilise=true
//      - utilisateur    → +10 pts, +heures, reliabilite_score recalculé
//      - interest       → nb_participations++ par catégorie
//      - vouchers       → vérification et création si seuil atteint
//      - StatistiquePresence → snapshot pour l'IA
//      - Notification   → message d'encouragement au participant
// ─────────────────────────────────────────────────────────────
router.post('/valider-presence', verifyToken, isOrganisateur, async (req, res) => {
    try {
        const { qr_token } = req.body;

        if (!qr_token || !qr_token.trim()) {
            return res.status(400).json({ success: false, message: 'Token QR manquant' });
        }

        // ── 1. Trouver la participation par token ─────────
        const participation = await Participation.findOne({ qr_token: qr_token.trim() })
            .populate({
                path: 'utilisateur',
                select: 'first_name last_name email cumul_points cumul_heures_participation reliabilite_score',
            })
            .populate({
                path: 'evenement',
                populate: { path: 'categories', select: '_id event_type' },
            });

        if (!participation) {
            return res.status(404).json({
                success: false,
                message: '❌ Token QR invalide — aucun participant trouvé',
            });
        }

        const ev   = participation.evenement;
        const user = participation.utilisateur;

        // ── 2. Vérifier que le scan n'a pas déjà été fait ─
        if (participation.qr_utilise) {
            return res.status(409).json({
                success: false,
                message: `⚠️ Ce QR a déjà été utilisé — ${user.first_name} ${user.last_name} est déjà marqué présent`,
            });
        }

        // ── 3. Vérifier la fenêtre horaire ────────────────
        const maintenant  = new Date();
        const dateDebut   = new Date(ev.ev_start_time);
        const dateFin     = ev.ev_end_time ? new Date(ev.ev_end_time) : null;

        // Comparer uniquement les dates calendaires (jour/mois/année)
        const memeJour =
            maintenant.getFullYear() === dateDebut.getFullYear() &&
            maintenant.getMonth()    === dateDebut.getMonth()    &&
            maintenant.getDate()     === dateDebut.getDate();

        if (!memeJour) {
            const joursEv = dateDebut.toLocaleDateString('fr-FR', {
                weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
            });
            return res.status(403).json({
                success: false,
                message: `⏰ Le scan n'est autorisé que le jour de l'événement (${joursEv})`,
            });
        }

        // Vérifier que l'heure est bien dans la plage de l'événement
        if (maintenant < dateDebut) {
            const heure = dateDebut.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
            return res.status(403).json({
                success: false,
                message: `⏰ L'événement n'a pas encore commencé — début à ${heure}`,
            });
        }

        if (dateFin && maintenant > dateFin) {
            const heure = dateFin.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
            return res.status(403).json({
                success: false,
                message: `⏰ L'événement est terminé depuis ${heure} — validation impossible`,
            });
        }

        // ── 4. Marquer la participation ───────────────────
        participation.is_present   = true;
        participation.scanner_date = maintenant;
        participation.qr_utilise   = true;
        await participation.save();

        // ── 5. Mettre à jour les statistiques du participant ─
        // Calculer la durée de l'événement en heures
        const heuresDuree = dateFin
            ? Math.round(((dateFin - dateDebut) / (1000 * 60 * 60)) * 10) / 10
            : 1; // 1h par défaut si pas de date de fin

        // Snapshot avant mise à jour (pour StatistiquePresence)
        const cumulPtsAvant    = user.cumul_points || 0;
        const fiabiliteAvant   = user.reliabilite_score || 100;
        const niveauAvant      = calculerNiveau(cumulPtsAvant);

        // Recalculer le score de fiabilité :
        // (nb présences confirmées) / (total inscriptions) × 100
        const totalInscriptions = await Participation.countDocuments({ utilisateur: user._id });
        const totalPresences    = await Participation.countDocuments({ utilisateur: user._id, is_present: true });
        const nouvelleFilabilite = totalInscriptions > 0
            ? Math.round((totalPresences / totalInscriptions) * 100)
            : 100;

        // Appliquer les mises à jour sur l'utilisateur
        const userMaj = await Utilisateur.findByIdAndUpdate(
            user._id,
            {
                $inc: {
                    cumul_points:                10,
                    cumul_heures_participation:  heuresDuree,
                },
                reliabilite_score: nouvelleFilabilite,
            },
            { new: true } // retourner le document mis à jour
        );

        const niveauApres    = calculerNiveau(userMaj.cumul_points);
        const fiabiliteApres = userMaj.reliabilite_score;

        // ── 6. Mettre à jour les intérêts par catégorie ──
        for (const cat of (ev.categories || [])) {
            await Interest.findOneAndUpdate(
                { utilisateur: user._id, categorie: cat._id },
                { $inc: { nb_participations: 1 } },
                { upsert: true, new: true }
            );
        }

        // ── 7. Vérifier et déclencher les vouchers ────────
        const couponDeclenche = await verifierVouchers(userMaj, totalPresences);

        // ── 8. Créer le document de statistique pour l'IA ─
        await StatistiquePresence.create({
            evenement:       ev._id,
            utilisateur:     user._id,
            categorie:       ev.categories?.[0]?._id || null,
            heure_scan:      maintenant,
            heure_debut_ev:  dateDebut,
            heures_duree:    heuresDuree,
            points_gagnes:   10,
            cumul_pts_avant: cumulPtsAvant,
            niveau_avant:    niveauAvant,
            niveau_apres:    niveauApres,
            fiabilite_avant: fiabiliteAvant,
            fiabilite_apres: fiabiliteApres,
            coupon_declenche: couponDeclenche,
        });

        // ── 9. Notification d'encouragement au participant ─
        // Message personnalisé avec son prénom, chaleureux et motivant
        const passageNiveau = niveauAvant !== niveauApres;
        let titreNotif, messageNotif;

        if (passageNiveau) {
            // Félicitations spéciales pour un passage de niveau
            titreNotif = `🏆 Félicitations ${user.first_name} — Niveau ${niveauApres} atteint !`;
            messageNotif = `Bravo ${user.first_name} ! Ta présence à "${ev.title_event}" t'a fait passer au niveau ${niveauApres}. `
                + `Tu gagnes +10 points et +${heuresDuree}h. Continue comme ça, tu es sur la bonne voie ! 💪`;
        } else if (couponDeclenche) {
            // Coupon débloqué
            titreNotif = `🎫 ${user.first_name}, tu as débloqué un coupon !`;
            messageNotif = `Super ${user.first_name} ! Ta présence à "${ev.title_event}" t'a rapporté +10 points `
                + `et un coupon de réduction vient d'être ajouté à ton compte. Bravo pour ta régularité ! 🌟`;
        } else {
            // Présence confirmée classique
            titreNotif = `✅ Présence confirmée — ${ev.title_event}`;
            messageNotif = `Bonjour ${user.first_name} ! Ta présence à "${ev.title_event}" a bien été validée. `
                + `Tu gagnes +10 points (total : ${userMaj.cumul_points} pts) et +${heuresDuree}h de sport. `
                + `Profite bien de ta séance ! 💪`;
        }

        await Notification.create({
            utilisateur: user._id,
            evenement:   ev._id,
            type:        'validation',
            titre:       titreNotif,
            message:     messageNotif,
        });

        console.log(`✅ Présence validée : ${user.first_name} ${user.last_name} → ${ev.title_event}`);

        // ── Réponse au frontend ───────────────────────────
        return res.json({
            success: true,
            message: `✅ Présence de ${user.first_name} ${user.last_name} confirmée !`,
            participant: {
                prenom:         user.first_name,
                nom:            user.last_name,
                email:          user.email,
                points_gagnes:  10,
                cumul_points:   userMaj.cumul_points,
                niveau_avant:   niveauAvant,
                niveau_apres:   niveauApres,
                passage_niveau: passageNiveau,
                coupon_declenche: couponDeclenche,
                fiabilite:      fiabiliteApres,
            },
        });

    } catch (error) {
        console.error('❌ Erreur valider-presence:', error.message);
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// ─────────────────────────────────────────────────────────────
// POST /api/participations/message-absents/:eventId
// Envoyer un message d'encouragement aux absents (orga/admin)
//
// Règles :
//   - Rôle organisateur ou admin
//   - L'événement doit être terminé (now > ev_end_time)
//   - Envoie une notification de type encouragement_absent
//     à chaque participant avec is_present === false
// ─────────────────────────────────────────────────────────────
router.post('/message-absents/:eventId', verifyToken, isOrganisateur, async (req, res) => {
    try {
        const { eventId } = req.params;

        // Récupérer l'événement avec son titre et ses dates
        const ev = await Evenement.findById(eventId)
            .populate('createur', 'first_name last_name');

        if (!ev) {
            return res.status(404).json({ success: false, message: 'Événement introuvable' });
        }

        // Vérifier que l'événement est bien terminé
        const maintenant = new Date();
        const dateFin    = ev.ev_end_time ? new Date(ev.ev_end_time) : new Date(ev.ev_start_time);

        if (maintenant <= dateFin) {
            return res.status(403).json({
                success: false,
                message: "L'événement n'est pas encore terminé. Les messages ne peuvent être envoyés qu'après la fin.",
            });
        }

        // Trouver tous les participants ABSENTS
        const absents = await Participation.find({
            evenement:  eventId,
            is_present: false,
        }).populate('utilisateur', 'first_name last_name _id');

        if (absents.length === 0) {
            return res.json({
                success: true,
                message: 'Aucun absent — tous les participants étaient présents ! 🎉',
                nb_envoyes: 0,
            });
        }

        // Formater la date de l'événement pour le message
        const dateEv = new Date(ev.ev_start_time).toLocaleDateString('fr-FR', {
            weekday: 'long', day: '2-digit', month: 'long',
        });

        // Créer une notification personnalisée pour chaque absent
        const notifications = absents
            .filter(a => a.utilisateur) // ignorer les comptes supprimés
            .map(a => ({
                utilisateur: a.utilisateur._id,
                evenement:   ev._id,
                type:        'encouragement_absent',
                titre:       `On a pensé à toi, ${a.utilisateur.first_name} ! 💙`,
                message:     `Bonjour ${a.utilisateur.first_name}, nous avons remarqué ton absence à `
                    + `"${ev.title_event}" le ${dateEv}. Nous espérons que tout va bien de ton côté ! `
                    + `Sache que tu nous as manqué et que l'événement aurait été encore meilleur avec ta présence. `
                    + `On compte sur toi pour la prochaine fois — à très bientôt ! 🌟`,
            }));

        await Notification.insertMany(notifications, { ordered: false });

        console.log(`📩 ${notifications.length} message(s) d'encouragement envoyés pour "${ev.title_event}"`);

        return res.json({
            success:     true,
            message:     `Messages envoyés à ${notifications.length} absent(s)`,
            nb_envoyes:  notifications.length,
        });

    } catch (error) {
        console.error('❌ Erreur message-absents:', error.message);
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

module.exports = router;
