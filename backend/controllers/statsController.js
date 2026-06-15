// ============================================================
// controllers/statsController.js — Statistiques agrégées
//
// TROIS NIVEAUX D'ACCÈS :
//   getStatsAdmin        → admin seulement, vue globale
//   getStatsOrganisateur → orga/admin, vue limitée à leurs événements
//   getStatsUtilisateur  → tout utilisateur connecté, données perso
//
// FILTRAGE PAR PÉRIODE :
//   Query param "periode" : 7j | 30j | 90j | 6mois | 1an | personnalisee
//   Query params "dateDebut" + "dateFin" : utilisés si periode=personnalisee
//   Défaut si rien n'est fourni : 30 derniers jours
// ============================================================

const Evenement          = require('../models/Evenement');
const Participation      = require('../models/Participation');
const Utilisateur        = require('../models/Utilisateur');
const Connexion          = require('../models/Connexion');
const Equipe             = require('../models/Equipe');
const Media              = require('../models/Media');
const Review             = require('../models/Review');
const Discount           = require('../models/Discount');
const RegleRecompense    = require('../models/RegleRecompence');
const Interest           = require('../models/Interest');
const Categorie          = require('../models/Categorie');
const mongoose           = require('mongoose');

// ── Helper : calcul des dates de début/fin selon la période ──
// Retourne { debut: Date, fin: Date, nb_jours: number }
const calcPeriode = (dateDebutStr, dateFinStr, periode) => {
    const fin = new Date(); // maintenant = borne haute par défaut
    fin.setHours(23, 59, 59, 999);

    let debut;

    if (periode && periode !== 'personnalisee') {
        // Périodes prédéfinies calculées à partir d'aujourd'hui
        debut = new Date();
        debut.setHours(0, 0, 0, 0);

        switch (periode) {
            case '7j':    debut.setDate(debut.getDate() - 7);      break;
            case '30j':   debut.setDate(debut.getDate() - 30);     break;
            case '90j':   debut.setDate(debut.getDate() - 90);     break;
            case '6mois': debut.setMonth(debut.getMonth() - 6);    break;
            case '1an':   debut.setFullYear(debut.getFullYear()-1); break;
            default:      debut.setDate(debut.getDate() - 30);     break;
        }
    } else if (dateDebutStr && dateFinStr) {
        // Mode personnalisé : l'admin fournit les deux bornes
        debut = new Date(dateDebutStr);
        debut.setHours(0, 0, 0, 0);
        const finCustom = new Date(dateFinStr);
        finCustom.setHours(23, 59, 59, 999);
        const nb = Math.ceil((finCustom - debut) / (1000 * 60 * 60 * 24));
        return { debut, fin: finCustom, nb_jours: nb };
    } else {
        // Défaut : 30 derniers jours
        debut = new Date();
        debut.setHours(0, 0, 0, 0);
        debut.setDate(debut.getDate() - 30);
    }

    const nb_jours = Math.ceil((fin - debut) / (1000 * 60 * 60 * 24));
    return { debut, fin, nb_jours };
};

// ── Helper : arrondir un nombre à 1 décimale ──
const arrondir = (n) => Math.round((n || 0) * 10) / 10;

// ─────────────────────────────────────────────────────────────
// GET /api/stats/admin
// Retourne toutes les sections KPI en un seul appel API.
// Toutes les requêtes sont filtrées sur la période choisie.
// ─────────────────────────────────────────────────────────────
const getStatsAdmin = async (req, res) => {
    try {
        const { dateDebut, dateFin, periode } = req.query;
        const { debut, fin, nb_jours } = calcPeriode(dateDebut, dateFin, periode || '30j');

        // Heure courante — utilisée pour les calculs indépendants de la période
        const maintenant = new Date();

        // ── SECTION 1 : PARTICIPATION ─────────────────────────────

        // 1a. Taux de présence global sur la période
        // (participations avec is_present=true / total participations)
        const presenceStats = await Participation.aggregate([
            { $match: { registered_at: { $gte: debut, $lte: fin } } },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    presences: { $sum: { $cond: ['$is_present', 1, 0] } },
                },
            },
        ]);
        const totalParticipations = presenceStats[0]?.total || 0;
        const totalPresences      = presenceStats[0]?.presences || 0;
        const taux_presence_global = totalParticipations > 0
            ? arrondir((totalPresences / totalParticipations) * 100)
            : 0;

        // 1b. Taux d'abandon = % d'utilisateurs inscrits dans la période
        // mais sans aucune présence confirmée
        const abandonStats = await Participation.aggregate([
            { $match: { registered_at: { $gte: debut, $lte: fin } } },
            // Grouper par utilisateur et vérifier s'il a au moins 1 présence
            {
                $group: {
                    _id: '$utilisateur',
                    aPresence: { $max: '$is_present' }, // true si au moins 1 présence
                },
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    sansPresence: {
                        $sum: { $cond: ['$aPresence', 0, 1] },
                    },
                },
            },
        ]);
        const taux_abandon = abandonStats[0]?.total > 0
            ? arrondir((abandonStats[0].sansPresence / abandonStats[0].total) * 100)
            : 0;

        // 1c. Évolution mensuelle des participations (pour graphique courbe)
        const evolution_mensuelle = await Participation.aggregate([
            { $match: { registered_at: { $gte: debut, $lte: fin } } },
            {
                $group: {
                    _id: {
                        annee: { $year: '$registered_at' },
                        mois:  { $month: '$registered_at' },
                    },
                    nb_inscrits:  { $sum: 1 },
                    nb_presences: { $sum: { $cond: ['$is_present', 1, 0] } },
                },
            },
            { $sort: { '_id.annee': 1, '_id.mois': 1 } },
            {
                $project: {
                    _id: 0,
                    mois:  '$_id.mois',
                    annee: '$_id.annee',
                    nb_inscrits:  1,
                    nb_presences: 1,
                },
            },
        ]);

        // 1d. Récurrence = % utilisateurs ayant participé 3+ fois sur la période
        const recurrenceStats = await Participation.aggregate([
            { $match: { registered_at: { $gte: debut, $lte: fin } } },
            { $group: { _id: '$utilisateur', count: { $sum: 1 } } },
            {
                $group: {
                    _id: null,
                    total:      { $sum: 1 },
                    recurrents: { $sum: { $cond: [{ $gte: ['$count', 3] }, 1, 0] } },
                },
            },
        ]);
        const recurrence = recurrenceStats[0]?.total > 0
            ? arrondir((recurrenceStats[0].recurrents / recurrenceStats[0].total) * 100)
            : 0;

        // 1e. Temps moyen entre participations (en jours)
        // Récupère les participations de chaque utilisateur (2+ participations)
        // puis calcule les intervalles en JavaScript (MongoDB ne supporte pas
        // facilement la différence entre éléments consécutifs d'un tableau)
        const userParticipations = await Participation.aggregate([
            { $match: { registered_at: { $gte: debut, $lte: fin } } },
            { $sort: { utilisateur: 1, registered_at: 1 } },
            {
                $group: {
                    _id: '$utilisateur',
                    dates: { $push: '$registered_at' },
                    count: { $sum: 1 },
                },
            },
            { $match: { count: { $gte: 2 } } },
        ]);
        let totalIntervalles = 0, nbIntervalles = 0;
        for (const u of userParticipations) {
            for (let i = 1; i < u.dates.length; i++) {
                const diffJours = (new Date(u.dates[i]) - new Date(u.dates[i - 1]))
                    / (1000 * 60 * 60 * 24);
                totalIntervalles += diffJours;
                nbIntervalles++;
            }
        }
        const temps_moyen_entre_participations = nbIntervalles > 0
            ? arrondir(totalIntervalles / nbIntervalles)
            : 0;

        // ── SECTION 2 : ÉVÉNEMENTS ────────────────────────────────

        // Compter les événements par statut sur la période
        const evStatsAgg = await Evenement.aggregate([
            { $match: { created_at: { $gte: debut, $lte: fin } } },
            { $group: { _id: '$stat_event', count: { $sum: 1 } } },
        ]);
        const evParStatut = {};
        evStatsAgg.forEach(s => { evParStatut[s._id] = s.count; });

        const total_crees   = Object.values(evParStatut).reduce((a, b) => a + b, 0);
        const total_publies = evParStatut['publié']   || 0;
        const total_annules = evParStatut['annulé']   || 0;
        const taux_annulation = total_crees > 0
            ? arrondir((total_annules / total_crees) * 100)
            : 0;
        const repartition_statuts = {
            publié:   total_publies,
            brouillon: evParStatut['brouillon'] || 0,
            annulé:   total_annules,
            terminé:  evParStatut['terminé'] || 0,
        };

        // Top 5 catégories par nombre de participations (sur la période)
        // Jointure : Participation → Evenement → categories
        const top5RawCats = await Participation.aggregate([
            { $match: { registered_at: { $gte: debut, $lte: fin } } },
            {
                $lookup: {
                    from: 'evenements',
                    localField: 'evenement',
                    foreignField: '_id',
                    as: 'ev',
                },
            },
            { $unwind: '$ev' },
            // Déstructurer le tableau categories de l'événement
            { $unwind: '$ev.categories' },
            {
                $group: {
                    _id: '$ev.categories',
                    nb_participations: { $sum: 1 },
                },
            },
            { $sort: { nb_participations: -1 } },
            { $limit: 5 },
            // Joindre pour avoir le nom de la catégorie
            {
                $lookup: {
                    from: 'categories',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'cat',
                },
            },
            { $unwind: { path: '$cat', preserveNullAndEmptyArrays: true } },
            // Joindre les reviews pour la note moyenne par catégorie
            {
                $lookup: {
                    from: 'reviews',
                    let: { catId: '$_id' },
                    pipeline: [
                        {
                            $lookup: {
                                from: 'evenements',
                                localField: 'evenement',
                                foreignField: '_id',
                                as: 'ev',
                            },
                        },
                        { $unwind: '$ev' },
                        { $unwind: '$ev.categories' },
                        {
                            $match: {
                                $expr: { $eq: ['$ev.categories', '$$catId'] },
                            },
                        },
                        { $group: { _id: null, moyenne: { $avg: '$note' } } },
                    ],
                    as: 'reviewStats',
                },
            },
            {
                $project: {
                    _id: 0,
                    categorie: { $ifNull: ['$cat.event_type', 'Inconnu'] },
                    nb_participations: 1,
                    note_moyenne: {
                        $ifNull: [{ $arrayElemAt: ['$reviewStats.moyenne', 0] }, 0],
                    },
                },
            },
        ]);
        const top5_categories = top5RawCats.map(c => ({
            ...c,
            note_moyenne: arrondir(c.note_moyenne),
        }));

        // Événements en liste d'attente (inscrits >= max_participants)
        const eventsListeAttente = await Evenement.aggregate([
            { $match: { stat_event: 'publié' } },
            {
                $lookup: {
                    from: 'participations',
                    localField: '_id',
                    foreignField: 'evenement',
                    as: 'inscrits',
                },
            },
            {
                $project: {
                    title_event: 1,
                    max_participants: 1,
                    nb_inscrits: { $size: '$inscrits' },
                },
            },
            {
                $match: {
                    $expr: { $gte: ['$nb_inscrits', '$max_participants'] },
                },
            },
        ]);

        // Note moyenne globale sur les Reviews de la période
        const noteGlobaleAgg = await Review.aggregate([
            { $match: { createdAt: { $gte: debut, $lte: fin } } },
            { $group: { _id: null, moyenne: { $avg: '$note' } } },
        ]);
        const note_moyenne_globale = arrondir(noteGlobaleAgg[0]?.moyenne || 0);

        // Répartition des événements par rôle du créateur
        const evParCreateurAgg = await Evenement.aggregate([
            { $match: { created_at: { $gte: debut, $lte: fin } } },
            {
                $lookup: {
                    from: 'utilisateur', // La collection s'appelle bien "utilisateur" (singulier)
                    localField: 'createur',
                    foreignField: '_id',
                    as: 'createurInfo',
                },
            },
            { $unwind: { path: '$createurInfo', preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: { $ifNull: ['$createurInfo.role', 'inconnu'] },
                    count: { $sum: 1 },
                },
            },
        ]);
        const evenements_par_createur = { user: 0, organisateur: 0, admin: 0 };
        evParCreateurAgg.forEach(r => {
            if (r._id in evenements_par_createur) {
                evenements_par_createur[r._id] = r.count;
            }
        });

        // ── SECTION 3 : UTILISATEURS ──────────────────────────────

        const total_inscrits = await Utilisateur.countDocuments();

        // Nouveaux utilisateurs inscrits sur la période
        const nouveaux_periode = await Utilisateur.countDocuments({
            created_at: { $gte: debut, $lte: fin },
        });

        // Taux d'activation = % comptes ayant au moins 1 participation (toutes périodes)
        const usersAvecPart = await Participation.distinct('utilisateur');
        const taux_activation = total_inscrits > 0
            ? arrondir((usersAvecPart.length / total_inscrits) * 100)
            : 0;

        // Répartition par niveau de points (gamification)
        // Débutant < 100 | Actif 100-499 | Avancé 500-999 | Champion 1000+
        const niveauxAgg = await Utilisateur.aggregate([
            {
                $group: {
                    _id: null,
                    debutant:  { $sum: { $cond: [{ $lt: ['$cumul_points', 100] }, 1, 0] } },
                    actif:     { $sum: { $cond: [{ $and: [{ $gte: ['$cumul_points', 100] }, { $lt: ['$cumul_points', 500] }] }, 1, 0] } },
                    avance:    { $sum: { $cond: [{ $and: [{ $gte: ['$cumul_points', 500] }, { $lt: ['$cumul_points', 1000] }] }, 1, 0] } },
                    champion:  { $sum: { $cond: [{ $gte: ['$cumul_points', 1000] }, 1, 0] } },
                },
            },
        ]);
        const repartition_niveaux = niveauxAgg[0]
            ? { debutant: niveauxAgg[0].debutant, actif: niveauxAgg[0].actif, avance: niveauxAgg[0].avance, champion: niveauxAgg[0].champion }
            : { debutant: 0, actif: 0, avance: 0, champion: 0 };

        // Score de fiabilité moyen de tous les utilisateurs
        const fiabiliteAgg = await Utilisateur.aggregate([
            { $group: { _id: null, moyenne: { $avg: '$reliabilite_score' } } },
        ]);
        const score_fiabilite_moyen = arrondir(fiabiliteAgg[0]?.moyenne || 0);

        // Utilisateurs inactifs depuis 30 jours (indépendant de la période choisie)
        // = utilisateurs qui ont déjà participé mais pas dans les 30 derniers jours
        const seuil30j = new Date(maintenant.getTime() - 30 * 24 * 60 * 60 * 1000);
        const inactifsAgg = await Participation.aggregate([
            // Date de leur dernière participation (toutes périodes confondues)
            { $group: { _id: '$utilisateur', derniere: { $max: '$registered_at' } } },
            // Garder uniquement ceux dont la dernière participation < 30 jours
            { $match: { derniere: { $lt: seuil30j } } },
            {
                $lookup: {
                    from: 'utilisateur',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user',
                },
            },
            { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: '$user._id',
                    first_name: '$user.first_name',
                    last_name:  '$user.last_name',
                    email:      '$user.email',
                    derniere_participation: '$derniere',
                },
            },
        ]).limit(50); // limité pour ne pas surcharger l'API

        // Top 10 utilisateurs actifs sur la période (par nb présences confirmées)
        const top10_actifs = await Participation.aggregate([
            {
                $match: {
                    registered_at: { $gte: debut, $lte: fin },
                    is_present: true,
                },
            },
            { $group: { _id: '$utilisateur', nb_presences: { $sum: 1 } } },
            { $sort: { nb_presences: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: 'utilisateur',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user',
                },
            },
            { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: '$user._id',
                    first_name:       '$user.first_name',
                    last_name:        '$user.last_name',
                    cumul_points:     '$user.cumul_points',
                    reliabilite_score: '$user.reliabilite_score',
                    nb_presences: 1,
                },
            },
        ]);

        // Répartition des utilisateurs par langue préférée
        const languesAgg = await Utilisateur.aggregate([
            { $group: { _id: '$langue', count: { $sum: 1 } } },
        ]);
        const repartition_langues = { fr: 0, en: 0, ar: 0, 'ar-tn': 0 };
        languesAgg.forEach(l => {
            if (l._id in repartition_langues) repartition_langues[l._id] = l.count;
        });

        // ── SECTION 4 : SOCIAL ────────────────────────────────────

        const connexions_creees = await Connexion.countDocuments({
            created_at: { $gte: debut, $lte: fin },
        });

        // Taux d'acceptation des demandes de partenariat
        const partStats = await Connexion.aggregate([
            { $match: { type: 'partenaire', created_at: { $gte: debut, $lte: fin } } },
            {
                $group: {
                    _id: null,
                    total:    { $sum: 1 },
                    acceptes: { $sum: { $cond: [{ $eq: ['$statut', 'accepte'] }, 1, 0] } },
                },
            },
        ]);
        const taux_acceptation_partenariats = partStats[0]?.total > 0
            ? arrondir((partStats[0].acceptes / partStats[0].total) * 100)
            : 0;

        // Note de collaboration moyenne (note_collab sur les connexions)
        const collabAgg = await Connexion.aggregate([
            { $match: { note_collab: { $ne: null } } },
            { $group: { _id: null, moyenne: { $avg: '$note_collab' } } },
        ]);
        const note_collaboration_moyenne = arrondir(collabAgg[0]?.moyenne || 0);

        // % utilisateurs ayant au moins 1 connexion (demandeur ou receveur)
        const [demandeursIds, receveursIds] = await Promise.all([
            Connexion.distinct('demandeur'),
            Connexion.distinct('receveur'),
        ]);
        const usersConnectes = new Set([
            ...demandeursIds.map(String),
            ...receveursIds.map(String),
        ]);
        const participants_avec_connexion = total_inscrits > 0
            ? arrondir((usersConnectes.size / total_inscrits) * 100)
            : 0;

        const equipes_formees = await Equipe.countDocuments({
            created_at: { $gte: debut, $lte: fin },
        });

        // ── SECTION 5 : IA & RÉCOMPENSES ─────────────────────────

        // Vouchers générés sur la période (champ date_coupon)
        const vouchers_generes = await Discount.countDocuments({
            date_coupon: { $gte: debut, $lte: fin },
        });

        // Vouchers utilisés sur la période (status='utilisé')
        const vouchers_utilises = await Discount.countDocuments({
            date_coupon: { $gte: debut, $lte: fin },
            status: 'utilisé',
        });

        const taux_utilisation_vouchers = vouchers_generes > 0
            ? arrondir((vouchers_utilises / vouchers_generes) * 100)
            : 0;

        // Remise moyenne des règles de récompense actives
        const remiseAgg = await RegleRecompense.aggregate([
            { $match: { est_active: true, remise_pourcentage: { $gt: 0 } } },
            { $group: { _id: null, moyenne: { $avg: '$remise_pourcentage' } } },
        ]);
        const remise_moyenne = arrondir(remiseAgg[0]?.moyenne || 0);

        // Suggestions converties : approximation impossible sans tracking spécifique
        // On retourne 0 en attendant un système de tracking dédié
        const suggestions_converties = 0;

        // ── SECTION 6 : MÉDIAS ───────────────────────────────────

        const mediasStats = await Media.aggregate([
            { $match: { uploaded_at: { $gte: debut, $lte: fin } } },
            {
                $group: {
                    _id: null,
                    total:      { $sum: 1 },
                    approuvees: { $sum: { $cond: [{ $eq: ['$statut', 'approuve'] }, 1, 0] } },
                    signalees:  { $sum: { $cond: ['$signale', 1, 0] } },
                },
            },
        ]);
        const photos_uploadees  = mediasStats[0]?.total     || 0;
        const photos_signalees  = mediasStats[0]?.signalees || 0;
        const taux_approbation  = photos_uploadees > 0
            ? arrondir((mediasStats[0].approuvees / photos_uploadees) * 100)
            : 0;

        // Moyenne de photos par événement (photos liées à un événement uniquement)
        const photosParEvAgg = await Media.aggregate([
            {
                $match: {
                    uploaded_at: { $gte: debut, $lte: fin },
                    evenement: { $ne: null },
                },
            },
            { $group: { _id: '$evenement', count: { $sum: 1 } } },
            { $group: { _id: null, moyenne: { $avg: '$count' } } },
        ]);
        const photos_par_evenement_moyen = arrondir(photosParEvAgg[0]?.moyenne || 0);

        // ── SECTION 7 : INFO PÉRIODE ──────────────────────────────
        const periode_info = {
            dateDebut: debut.toISOString().split('T')[0],
            dateFin:   fin.toISOString().split('T')[0],
            periode:   periode || '30j',
            nb_jours,
        };

        // ── Réponse finale ────────────────────────────────────────
        return res.json({
            success: true,
            participation: {
                taux_presence_global,
                taux_abandon,
                evolution_mensuelle,
                recurrence,
                temps_moyen_entre_participations,
            },
            evenements: {
                total_crees,
                total_publies,
                total_annules,
                taux_annulation,
                top5_categories,
                events_liste_attente: eventsListeAttente,
                note_moyenne_globale,
                repartition_statuts,
                evenements_par_createur,
            },
            utilisateurs: {
                total_inscrits,
                nouveaux_periode,
                taux_activation,
                repartition_niveaux,
                score_fiabilite_moyen,
                inactifs_30j: inactifsAgg,
                top10_actifs,
                repartition_langues,
            },
            social: {
                connexions_creees,
                taux_acceptation_partenariats,
                note_collaboration_moyenne,
                participants_avec_connexion,
                equipes_formees,
            },
            ia_recompenses: {
                suggestions_converties,
                vouchers_generes,
                vouchers_utilises,
                taux_utilisation_vouchers,
                remise_moyenne,
            },
            medias: {
                photos_uploadees,
                taux_approbation,
                photos_signalees,
                photos_par_evenement_moyen,
            },
            periode_info,
        });
    } catch (error) {
        console.error('getStatsAdmin:', error);
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};

// ─────────────────────────────────────────────────────────────
// GET /api/stats/organisateur
// Vue limitée aux événements créés par l'organisateur connecté.
// Accepte les mêmes query params de période que getStatsAdmin.
// ─────────────────────────────────────────────────────────────
const getStatsOrganisateur = async (req, res) => {
    try {
        const { dateDebut, dateFin, periode } = req.query;
        const { debut, fin, nb_jours } = calcPeriode(dateDebut, dateFin, periode || '30j');
        const orgaId = req.utilisateur._id;

        // IDs des événements créés par cet organisateur sur la période
        const mesEvents = await Evenement.find({
            createur:   orgaId,
            created_at: { $gte: debut, $lte: fin },
        }).select('_id title_event max_participants');

        const mesEventIds = mesEvents.map(e => e._id);

        if (mesEventIds.length === 0) {
            return res.json({
                success: true,
                taux_presence_mes_events: 0,
                note_moyenne_recue: 0,
                mes_top_events: [],
                nb_equipes_formees: 0,
                nb_connexions_generees: 0,
                evolution_presence: [],
                periode_info: { dateDebut: debut.toISOString().split('T')[0], dateFin: fin.toISOString().split('T')[0], periode: periode || '30j', nb_jours },
            });
        }

        // Taux de présence moyen sur ses événements
        const presenceAgg = await Participation.aggregate([
            { $match: { evenement: { $in: mesEventIds } } },
            {
                $group: {
                    _id: '$evenement',
                    total:    { $sum: 1 },
                    presences: { $sum: { $cond: ['$is_present', 1, 0] } },
                },
            },
            {
                $project: {
                    taux: {
                        $cond: [
                            { $gt: ['$total', 0] },
                            { $multiply: [{ $divide: ['$presences', '$total'] }, 100] },
                            0,
                        ],
                    },
                },
            },
            { $group: { _id: null, moyenne: { $avg: '$taux' } } },
        ]);
        const taux_presence_mes_events = arrondir(presenceAgg[0]?.moyenne || 0);

        // Note moyenne reçue sur ses événements
        const noteAgg = await Review.aggregate([
            { $match: { evenement: { $in: mesEventIds } } },
            { $group: { _id: null, moyenne: { $avg: '$note' } } },
        ]);
        const note_moyenne_recue = arrondir(noteAgg[0]?.moyenne || 0);

        // Top 3 événements par taux de présence
        const top3Agg = await Participation.aggregate([
            { $match: { evenement: { $in: mesEventIds } } },
            {
                $group: {
                    _id:      '$evenement',
                    total:    { $sum: 1 },
                    presences: { $sum: { $cond: ['$is_present', 1, 0] } },
                },
            },
            {
                $project: {
                    taux: {
                        $cond: [
                            { $gt: ['$total', 0] },
                            { $multiply: [{ $divide: ['$presences', '$total'] }, 100] },
                            0,
                        ],
                    },
                    total: 1,
                    presences: 1,
                },
            },
            { $sort: { taux: -1 } },
            { $limit: 3 },
            {
                $lookup: {
                    from: 'evenements',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'ev',
                },
            },
            { $unwind: '$ev' },
            {
                $project: {
                    _id: '$ev._id',
                    titre: '$ev.title_event',
                    taux:  { $round: ['$taux', 1] },
                    total: 1,
                    presences: 1,
                },
            },
        ]);

        const nb_equipes_formees = await Equipe.countDocuments({
            evenement: { $in: mesEventIds },
        });

        const nb_connexions_generees = await Connexion.countDocuments({
            evenement: { $in: mesEventIds },
        });

        // Évolution mensuelle des présences sur ses événements
        const evolution_presence = await Participation.aggregate([
            { $match: { evenement: { $in: mesEventIds } } },
            {
                $group: {
                    _id: {
                        annee: { $year: '$registered_at' },
                        mois:  { $month: '$registered_at' },
                    },
                    nb_inscrits:  { $sum: 1 },
                    nb_presences: { $sum: { $cond: ['$is_present', 1, 0] } },
                },
            },
            { $sort: { '_id.annee': 1, '_id.mois': 1 } },
            {
                $project: {
                    _id: 0,
                    mois:  '$_id.mois',
                    annee: '$_id.annee',
                    nb_inscrits: 1,
                    nb_presences: 1,
                },
            },
        ]);

        return res.json({
            success: true,
            taux_presence_mes_events,
            note_moyenne_recue,
            mes_top_events: top3Agg,
            nb_equipes_formees,
            nb_connexions_generees,
            evolution_presence,
            periode_info: {
                dateDebut: debut.toISOString().split('T')[0],
                dateFin:   fin.toISOString().split('T')[0],
                periode:   periode || '30j',
                nb_jours,
            },
        });
    } catch (error) {
        console.error('getStatsOrganisateur:', error);
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};

// ─────────────────────────────────────────────────────────────
// GET /api/stats/utilisateur
// Statistiques personnelles de l'utilisateur connecté.
// Pas de filtre de période (toutes périodes confondues),
// sauf l'évolution des 6 derniers mois.
// ─────────────────────────────────────────────────────────────
const getStatsUtilisateur = async (req, res) => {
    try {
        const userId = req.utilisateur._id;

        // Données de base directement sur le document utilisateur
        const user = await Utilisateur.findById(userId)
            .select('cumul_points cumul_heures_participation reliabilite_score');

        // Nombre total de participations (inscriptions)
        const nb_participations_total = await Participation.countDocuments({
            utilisateur: userId,
        });

        // Nombre d'événements créés
        const nb_events_crees = await Evenement.countDocuments({
            createur: userId,
        });

        // Top 3 sports pratiqués (depuis le modèle Interest)
        const top3Sports = await Interest.find({ utilisateur: userId })
            .sort({ nb_participations: -1 })
            .limit(3)
            .populate('categorie', 'event_type event_categ');

        const top3_sports_pratiques = top3Sports.map(i => ({
            sport:         i.categorie?.event_type || 'Inconnu',
            groupe:        i.categorie?.event_categ || '',
            nb_presences:  i.nb_participations,
            note:          i.note,
        }));

        // Évolution personnelle : 6 derniers mois (participations mensuelles)
        const il_y_a_6_mois = new Date();
        il_y_a_6_mois.setMonth(il_y_a_6_mois.getMonth() - 6);

        const evolution_personnelle = await Participation.aggregate([
            {
                $match: {
                    utilisateur:  new mongoose.Types.ObjectId(userId),
                    registered_at: { $gte: il_y_a_6_mois },
                },
            },
            {
                $group: {
                    _id: {
                        annee: { $year: '$registered_at' },
                        mois:  { $month: '$registered_at' },
                    },
                    nb_inscrits:  { $sum: 1 },
                    nb_presences: { $sum: { $cond: ['$is_present', 1, 0] } },
                },
            },
            { $sort: { '_id.annee': 1, '_id.mois': 1 } },
            {
                $project: {
                    _id: 0,
                    mois:  '$_id.mois',
                    annee: '$_id.annee',
                    nb_inscrits: 1,
                    nb_presences: 1,
                },
            },
        ]);

        // Vouchers actifs (non utilisés, non expirés)
        const vouchers_actifs = await Discount.countDocuments({
            status: 'actif',
        });

        return res.json({
            success: true,
            cumul_points:              user?.cumul_points || 0,
            cumul_heures:              user?.cumul_heures_participation || 0,
            reliabilite_score:         user?.reliabilite_score || 0,
            nb_participations_total,
            nb_events_crees,
            top3_sports_pratiques,
            evolution_personnelle,
            vouchers_actifs,
        });
    } catch (error) {
        console.error('getStatsUtilisateur:', error);
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};

module.exports = { getStatsAdmin, getStatsOrganisateur, getStatsUtilisateur };
