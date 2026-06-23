// ============================================================
// services/iaSuggestionService.js
//
// MODULE IA — ALGORITHME DE RECOMMANDATION D'ÉVÉNEMENTS
//
// Calcule un score de pertinence pour chaque événement publié
// à venir, en combinant 4 signaux pondérés :
//
//   score_total = (affinite_categorie  × 0.35)
//               + (presence_sociale    × 0.30)
//               + (reputation_event    × 0.20)
//               + (fiabilite_org       × 0.15)
//
// Chaque paramètre varie entre 0.0 et 1.0.
// Un événement "parfait" pour l'utilisateur aurait score = 1.0.
//
// Collections utilisées :
//   - "evenements"    : événements publiés à venir
//   - "participations": inscriptions de l'utilisateur
//   - "connexion"     : partenaires acceptés de l'utilisateur
//   - "reviews"       : avis déposés sur les événements
//   - "interests"     : historique de participations par catégorie
//                       (mis à jour automatiquement à chaque scan QR)
// ============================================================

const Evenement     = require('../models/Evenement');
const Participation = require('../models/Participation');
const Connexion     = require('../models/Connexion');
const Review        = require('../models/Review');
const Interest      = require('../models/Interest');

// ─────────────────────────────────────────────────────────────
// PARAMÈTRE 1 — affinite_categorie (poids 0.35)
//
// Mesure la compatibilité entre le profil sportif de
// l'utilisateur et les catégories de l'événement évalué.
//
// Source : collection "interests"
//   → nb_participations par catégorie, incrémenté à chaque
//     scan QR confirmé (evenementController.qrScan)
//
// Formule (pour un événement multi-catégories, on prend le max) :
//   max_sur_categories( nb_participations_categorie_i
//                       / total_participations_utilisateur )
//
// Cas limite :
//   total_participations = 0 (nouvel inscrit) → 0.5 (neutre)
//     → on ne pénalise pas les nouveaux, ils voient des suggestions
//   événement sans catégorie → 0.5 (neutre)
//
// Paramètres :
//   event               — document Evenement (categories[] populé)
//   interestMap         — { categorieId: nb_participations }
//   totalParticipations — somme de tous les nb_participations (toutes catégories)
// ─────────────────────────────────────────────────────────────
const calculerAffiniteCategorie = (event, interestMap, totalParticipations) => {
    // Pas d'historique → neutre (ne bloque pas les suggestions aux nouveaux)
    if (totalParticipations === 0) return 0.5;

    const categories = event.categories || [];
    if (categories.length === 0) return 0.5;

    // Pour un événement multi-catégories, prendre l'affinité maximale
    // Ex : event [Football, Futsal], user fort en Football → ratio Football
    let maxRatio = 0;
    for (const cat of categories) {
        const nbCat = interestMap[cat._id.toString()] || 0;
        const ratio = nbCat / totalParticipations;
        if (ratio > maxRatio) maxRatio = ratio;
    }

    return Math.min(maxRatio, 1.0); // plafonner à 1.0 (jamais > 100%)
};

// ─────────────────────────────────────────────────────────────
// PARAMÈTRE 2 — presence_sociale (poids 0.30)
//
// Mesure combien de partenaires (connexions acceptées) de
// l'utilisateur sont déjà inscrits à cet événement.
// "Mes amis y vont" → signal fort de pertinence sociale.
//
// Source :
//   - "connexion" : type=partenaire, statut=accepte
//   - "participations" : inscrits à cet événement
//
// Formule :
//   nb_connexions_inscrites_à_cet_event / nb_connexions_totales
//
// Cas limite :
//   0 connexion → 0 (pas de signal social, paramètre muet)
//
// Paramètres :
//   event               — document Evenement
//   idConnexions        — tableau d'ObjectId des partenaires acceptés
//   nbConnexionsTotales — longueur de idConnexions
// ─────────────────────────────────────────────────────────────
const calculerPresenceSociale = async (event, idConnexions, nbConnexionsTotales) => {
    // Pas de réseau social → ce paramètre ne joue pas
    if (nbConnexionsTotales === 0) return 0;

    // Combien de mes partenaires sont inscrits à cet événement ?
    const nbInscritesConnectees = await Participation.countDocuments({
        evenement:    event._id,
        utilisateur:  { $in: idConnexions },
    });

    return Math.min(nbInscritesConnectees / nbConnexionsTotales, 1.0);
};

// ─────────────────────────────────────────────────────────────
// PARAMÈTRE 3 — reputation_event (poids 0.20)
//
// Note de réputation de l'événement, calculée à partir des
// avis laissés par les participants passés.
// Pertinent pour les événements récurrents ou saisonniers.
//
// Source : collection "reviews" (champ "note", 0-5)
//
// Formule : moyenne(reviews.note) / 5
//
// Cas limite :
//   aucune review → 0.5 (neutre)
//   → un nouvel événement sans avis n'est pas pénalisé
// ─────────────────────────────────────────────────────────────
const calculerReputationEvent = async (eventId) => {
    // Sélectionner uniquement le champ note (optimisation réseau)
    const reviews = await Review.find({ evenement: eventId }).select('note');

    if (reviews.length === 0) return 0.5; // pas d'historique → neutre

    const somme   = reviews.reduce((acc, r) => acc + (r.note || 0), 0);
    const moyenne = somme / reviews.length;

    return Math.min(moyenne / 5, 1.0);
};

// ─────────────────────────────────────────────────────────────
// PARAMÈTRE 4 — fiabilite_org (poids 0.15)
//
// Fiabilité de l'organisateur créateur de l'événement.
// Un organisateur très fiable (présent à ses propres événements,
// ne les annule pas de dernière minute) mérite plus de confiance.
//
// Source : Utilisateur.reliabilite_score (0-100)
//   → recalculé automatiquement après chaque scan QR
//     (voir iaFiabiliteService.recalculerFiabilite)
//
// Formule : reliabilite_score / 100
//
// Cas limite :
//   champ absent → 0.7 (défaut bienveillant)
//   → les nouveaux organisateurs sans score ne sont pas pénalisés
// ─────────────────────────────────────────────────────────────
const calculerFiabiliteOrg = (event) => {
    const score = event.createur?.reliabilite_score;
    // null, undefined ou 0 explicite sont différents → on vérifie null/undefined
    if (score === undefined || score === null) return 0.7;
    return score / 100;
};

// ─────────────────────────────────────────────────────────────
// FONCTION PRINCIPALE — getSuggestionsPourUtilisateur
//
// Évalue tous les événements publiés à venir auxquels
// l'utilisateur n'est PAS encore inscrit, calcule le score IA
// pour chacun, et retourne les "limit" meilleurs.
//
// Paramètres :
//   userId  — ObjectId de l'utilisateur connecté (req.utilisateur._id)
//   limit   — nombre max de suggestions à retourner (défaut 5)
//
// Retourne un tableau trié par score_total décroissant :
//   [
//     {
//       ev          : <document Evenement>,
//       score_total : 0.782,
//       detail      : {
//         affinite_categorie : 0.750,
//         presence_sociale   : 0.333,
//         reputation_event   : 0.800,
//         fiabilite_org      : 0.950,
//         score_total        : 0.782,
//       }
//     },
//     ...
//   ]
//
// Le champ "detail" permet :
//   - le débogage en développement
//   - d'afficher "Pourquoi ce conseil ?" dans le futur frontend IA
// ─────────────────────────────────────────────────────────────
const getSuggestionsPourUtilisateur = async (userId, limit = 5) => {
    const maintenant = new Date();

    // ── ÉTAPE 1 : Récupérer les événements candidats ─────────
    // Publiés, dont la date de début est dans le futur.
    // On charge les catégories et le créateur pour le calcul.
    // Limite à 100 pour éviter des requêtes trop lourdes.
    const evs = await Evenement.find({
        stat_event:    'publié',
        ev_start_time: { $gt: maintenant },
    })
        .populate('categories', '_id')           // pour affinite_categorie
        .populate('createur', 'reliabilite_score') // pour fiabilite_org
        .limit(100);

    // ── ÉTAPE 2 : Exclure les events où l'user est déjà inscrit ──
    // Inutile de suggérer un événement que l'utilisateur a
    // déjà réservé — ce serait redondant et intrusif.
    const dejaInscrits = await Participation.find({ utilisateur: userId })
        .select('evenement');
    const idsDejaInscrits = new Set(
        dejaInscrits.map(p => p.evenement.toString())
    );
    const candidats = evs.filter(ev => !idsDejaInscrits.has(ev._id.toString()));

    // ── ÉTAPE 3 : Préparer le profil sportif de l'utilisateur ─

    // Intérêts : map { categorieId → nb_participations }
    // Ce champ est mis à jour à chaque scan QR dans qrScan
    const mesInterests = await Interest.find({ utilisateur: userId });
    const interestMap  = {};
    let totalParticipations = 0;
    for (const i of mesInterests) {
        interestMap[i.categorie.toString()] = i.nb_participations;
        totalParticipations += i.nb_participations;
    }

    // Connexions partenaires acceptées (bi-directionnelles)
    const mesConnexions = await Connexion.find({
        $or: [{ demandeur: userId }, { receveur: userId }],
        type:   'partenaire',
        statut: 'accepte',
    });
    // Extraire l'ID du partenaire (l'autre côté de la relation)
    const idConnexions = mesConnexions.map(c =>
        c.demandeur.toString() === userId.toString() ? c.receveur : c.demandeur
    );
    const nbConnexionsTotales = idConnexions.length;

    // ── ÉTAPE 4 : Calculer le score IA pour chaque événement ─
    const scores = await Promise.all(candidats.map(async (ev) => {

        // Calculer les 4 paramètres indépendamment
        const affinite_categorie = calculerAffiniteCategorie(ev, interestMap, totalParticipations);
        const presence_sociale   = await calculerPresenceSociale(ev, idConnexions, nbConnexionsTotales);
        const reputation_event   = await calculerReputationEvent(ev._id);
        const fiabilite_org      = calculerFiabiliteOrg(ev);

        // ── Formule pondérée principale ────────────────────────
        //   0.35 + 0.30 + 0.20 + 0.15 = 1.00 (poids normalisés)
        const score_total = (affinite_categorie * 0.35)
                          + (presence_sociale   * 0.30)
                          + (reputation_event   * 0.20)
                          + (fiabilite_org      * 0.15);

        return {
            ev,
            score_total,
            // Détail : chaque composante arrondie à 3 décimales
            // Permet de déboguer ou d'expliquer la recommandation
            detail: {
                affinite_categorie: +affinite_categorie.toFixed(3),
                presence_sociale:   +presence_sociale.toFixed(3),
                reputation_event:   +reputation_event.toFixed(3),
                fiabilite_org:      +fiabilite_org.toFixed(3),
                score_total:        +score_total.toFixed(3),
            },
        };
    }));

    // ── ÉTAPE 5 : Trier par score décroissant, retourner les N meilleurs ──
    return scores
        .sort((a, b) => b.score_total - a.score_total)
        .slice(0, limit);
};

// ── Exports ──────────────────────────────────────────────────
// Fonction principale utilisée par evenementController.getSuggestions
// + sous-fonctions individuelles pour les tests unitaires
module.exports = {
    getSuggestionsPourUtilisateur,
    calculerAffiniteCategorie,
    calculerPresenceSociale,
    calculerReputationEvent,
    calculerFiabiliteOrg,
};
