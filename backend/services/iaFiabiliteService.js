// ============================================================
// services/iaFiabiliteService.js
//
// MODULE IA — SCORE DE FIABILITÉ UTILISATEUR
//
// Calcule et met à jour le score de fiabilité d'un utilisateur.
// Ce score mesure son engagement réel : s'inscrit-il aux
// événements et y vient-il vraiment ?
//
// Formule :
//   nb_inscriptions > 0
//     → reliabilite_score = (nb_presences / nb_inscriptions) × 100
//   nb_inscriptions = 0
//     → reliabilite_score = 100 (nouvel utilisateur, pas pénalisé)
//
// Échelle :
//   100 → très fiable  (présent à chaque inscription)
//    50 → moyen        (absent 1 fois sur 2)
//     0 → peu fiable   (ne vient jamais)
//
// Ce score est :
//   - Utilisé comme paramètre "fiabilite_org" dans iaSuggestionService
//     pour pondérer la confiance dans un organisateur
//   - Affiché dans les dashboards (admin, organisateur)
//   - Stocké dans StatistiquePresence (snapshot avant/après)
//
// Appelé automatiquement dans evenementController.qrScan
// après chaque scan de présence QR réussi.
// ============================================================

const Participation = require('../models/Participation');
const Utilisateur   = require('../models/Utilisateur');

// ─────────────────────────────────────────────────────────────
// recalculerFiabilite(userId)
//
// Recompte TOUTES les participations depuis la base pour
// garantir l'exactitude (pas de cumul incrémental qui dériverait).
//
// Paramètre :
//   userId — ObjectId de l'utilisateur à mettre à jour
//
// Retourne :
//   {
//     reliabilite_score : 85,   (valeur entre 0 et 100)
//     nb_inscriptions   : 20,   (total inscriptions de l'user)
//     nb_presences      : 17,   (dont présences confirmées QR)
//   }
//
// Les valeurs retournées permettent à l'appelant de :
//   - Logger l'évolution du score
//   - Alimenter un snapshot StatistiquePresence (fiabilite_avant/apres)
//   - Déclencher des alertes ou récompenses selon le seuil
// ─────────────────────────────────────────────────────────────
const recalculerFiabilite = async (userId) => {

    // Nombre total d'inscriptions de l'utilisateur (tous événements)
    const nb_inscriptions = await Participation.countDocuments({
        utilisateur: userId,
    });

    // Nombre de présences confirmées (is_present = true, après scan QR)
    const nb_presences = await Participation.countDocuments({
        utilisateur: userId,
        is_present:  true,
    });

    // Formule :
    //   Si l'utilisateur n'a jamais participé → 100 (pas encore pénalisé)
    //   Sinon → ratio (presences/inscriptions) × 100, arrondi à l'entier
    const reliabilite_score = nb_inscriptions > 0
        ? Math.round((nb_presences / nb_inscriptions) * 100)
        : 100;

    // Écrire le score calculé dans la collection utilisateur
    // (uniquement le champ reliabilite_score, sans toucher au reste)
    await Utilisateur.findByIdAndUpdate(userId, { reliabilite_score });

    return { reliabilite_score, nb_inscriptions, nb_presences };
};

// ── Export ────────────────────────────────────────────────────
module.exports = {
    recalculerFiabilite,
};
