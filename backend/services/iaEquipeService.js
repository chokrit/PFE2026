// ============================================================
// services/iaEquipeService.js
//
// MODULE IA — ALGORITHME DE FORMATION AUTOMATIQUE D'ÉQUIPES
//
// Calcule un score d'affinité entre chaque paire de participants
// d'un événement, puis regroupe les participants en équipes
// via un algorithme glouton qui maximise la cohésion interne.
//
// score_affinite(A, B) =
//     (partenariat_accepte × 0.40)
//   + (likes_mutuels       × 0.20)
//   + (note_collaboration  × 0.25)
//   + (meme_niveau         × 0.15)
//
// RÈGLE D'EXCLUSION STRICTE (prioritaire sur tout calcul) :
//   type=partenaire, statut=refuse entre A et B
//   → ils ne seront JAMAIS placés dans la même équipe
//   → score forcé à -Infinity pour cet algorithme
//
// Collections utilisées :
//   - "participations" : liste des inscrits à l'événement
//   - "connexion"      : historique all-time des liens entre users
//
// IMPORTANT : genererEquipesSuggeres() ne sauvegarde RIEN.
//   Elle retourne uniquement une proposition.
//   La sauvegarde dans la collection "equipe" se fait
//   séparément via POST /api/equipes/manuelle après
//   validation manuelle par l'organisateur.
// ============================================================

const Participation = require('../models/Participation');
const Connexion     = require('../models/Connexion');

// ─────────────────────────────────────────────────────────────
// NIVEAUX — mapping cumul_points → indice de niveau
//
// Indice numérique pour comparer les niveaux entre eux :
//   0 → Débutant  ( 0   – 49  pts)
//   1 → Actif     ( 50  – 199 pts)
//   2 → Avancé    ( 200 – 499 pts)
//   3 → Champion  ( 500+       pts)
//
// Labels humains correspondants (pour l'affichage frontend)
// ─────────────────────────────────────────────────────────────
const LABELS_NIVEAUX = ['Débutant', 'Actif', 'Avancé', 'Champion'];

const getNiveauIndex = (pts) => {
    if (pts >= 500) return 3;
    if (pts >= 200) return 2;
    if (pts >= 50)  return 1;
    return 0;
};

// ─────────────────────────────────────────────────────────────
// PARAMÈTRE 1 — partenariat_accepte (poids 0.40)
//
// Signal le plus fort : A et B ont formalisé un partenariat
// sportif (relation bidirectionnelle confirmée des deux côtés).
//
// Source : collection "connexion"
//   type = 'partenaire', statut = 'accepte'
//   dans les deux sens (demandeur→receveur OU receveur→demandeur)
//
// Historique ALL-TIME : on regarde toutes les connexions passées,
// pas seulement celles liées à l'événement actuel.
//
// 1.0 → partenariat accepté entre A et B
// 0.0 → aucun partenariat (ou partenariat en attente)
// ─────────────────────────────────────────────────────────────
const getPartenariatAccepte = (aId, bId, connexions) => {
    const existe = connexions.some(c =>
        c.type === 'partenaire' &&
        c.statut === 'accepte' &&
        ((c.demandeur.toString() === aId && c.receveur.toString() === bId) ||
         (c.demandeur.toString() === bId && c.receveur.toString() === aId))
    );
    return existe ? 1.0 : 0.0;
};

// ─────────────────────────────────────────────────────────────
// PARAMÈTRE 2 — likes_mutuels (poids 0.20)
//
// Un like mutuel signale que chacun a manifesté un intérêt
// pour l'autre — signal d'affinité interpersonnelle positif
// même en l'absence de partenariat formalisé.
//
// Source : collection "connexion", type = 'like'
//
// 1.0 → like mutuel   (A→B ET B→A)
// 0.5 → like unilat.  (A→B OU  B→A, un seul sens)
// 0.0 → aucun like dans aucun sens
// ─────────────────────────────────────────────────────────────
const getLikesMutuels = (aId, bId, connexions) => {
    const likeAversB = connexions.some(c =>
        c.type === 'like' &&
        c.demandeur.toString() === aId &&
        c.receveur.toString() === bId
    );
    const likeBversA = connexions.some(c =>
        c.type === 'like' &&
        c.demandeur.toString() === bId &&
        c.receveur.toString() === aId
    );

    if (likeAversB && likeBversA) return 1.0; // mutuel
    if (likeAversB || likeBversA) return 0.5; // unilatéral
    return 0.0;
};

// ─────────────────────────────────────────────────────────────
// PARAMÈTRE 3 — note_collaboration (poids 0.25)
//
// Qualité perçue des collaborations passées entre A et B.
// Basée sur le champ note_collab des connexions entre eux.
//
// Source : collection "connexion"
//   champ note_collab (1-5) — les deux sens de la relation
//
// Formule : moyenne(note_collab A↔B) / 5
//
// Cas limite :
//   aucune note_collab échangée → 0.5 (neutre)
//   → pas de pénalité si les deux ne se sont jamais notés
// ─────────────────────────────────────────────────────────────
const getNoteCollaboration = (aId, bId, connexions) => {
    // Toutes les connexions entre A et B dans les deux sens
    // qui ont une note_collab renseignée (non nulle)
    const avecNote = connexions.filter(c =>
        c.note_collab !== null &&
        c.note_collab !== undefined &&
        ((c.demandeur.toString() === aId && c.receveur.toString() === bId) ||
         (c.demandeur.toString() === bId && c.receveur.toString() === aId))
    );

    if (avecNote.length === 0) return 0.5; // pas d'historique → neutre

    const somme  = avecNote.reduce((acc, c) => acc + c.note_collab, 0);
    const moy    = somme / avecNote.length;
    return Math.min(moy / 5, 1.0);
};

// ─────────────────────────────────────────────────────────────
// PARAMÈTRE 4 — meme_niveau (poids 0.15)
//
// Deux joueurs de niveau similaire s'équilibrent mieux en équipe
// (compétences proches → meilleure coopération et fair-play).
//
// Basé sur cumul_points → getNiveauIndex (0 à 3)
//
// Distance entre niveaux :
//   0 (identiques)  → 1.0 (parfaitement assortis)
//   1 (adjacents)   → 0.5 (proches, bonne compatibilité)
//   2+ (éloignés)   → 0.0 (trop de décalage de niveau)
//
// Exemples :
//   Débutant + Actif    → distance 1 → 0.5
//   Actif + Champion    → distance 2 → 0.0
//   Débutant + Champion → distance 3 → 0.0
// ─────────────────────────────────────────────────────────────
const getMemeNiveau = (a, b) => {
    const niveauA   = getNiveauIndex(a.cumul_points || 0);
    const niveauB   = getNiveauIndex(b.cumul_points || 0);
    const distance  = Math.abs(niveauA - niveauB);

    if (distance === 0) return 1.0; // même niveau
    if (distance === 1) return 0.5; // niveaux adjacents
    return 0.0;                     // trop éloignés
};

// ─────────────────────────────────────────────────────────────
// SCORE D'AFFINITÉ — calculerScoreAffinite(A, B, connexions)
//
// Combine les 4 paramètres en un score entre 0.0 et 1.0.
// Retourne -Infinity si une règle d'exclusion s'applique.
//
// RÈGLE D'EXCLUSION STRICTE :
//   type=partenaire, statut=refuse entre A et B
//   → retourne -Infinity
//   → l'algorithme glouton garantit qu'ils ne seront jamais
//     dans la même équipe, quelle que soit leur affinité ailleurs
// ─────────────────────────────────────────────────────────────
const calculerScoreAffinite = (a, b, connexions) => {
    const aId = a._id.toString();
    const bId = b._id.toString();

    // Vérifier AVANT tout calcul si un refus de partenariat existe
    const refuse = connexions.some(c =>
        c.type === 'partenaire' &&
        c.statut === 'refuse' &&
        ((c.demandeur.toString() === aId && c.receveur.toString() === bId) ||
         (c.demandeur.toString() === bId && c.receveur.toString() === aId))
    );
    if (refuse) return -Infinity; // exclusion absolue, prime sur tout

    // Calculer les 4 paramètres
    const partenariat   = getPartenariatAccepte(aId, bId, connexions);
    const likes         = getLikesMutuels(aId, bId, connexions);
    const collaboration = getNoteCollaboration(aId, bId, connexions);
    const niveau        = getMemeNiveau(a, b);

    // Formule pondérée (somme des poids = 1.0)
    return (partenariat   * 0.40)
         + (likes         * 0.20)
         + (collaboration * 0.25)
         + (niveau        * 0.15);
};

// ─────────────────────────────────────────────────────────────
// ALGORITHME GLOUTON — formerEquipes(participants, taille, connexions)
//
// Regroupe les participants en équipes de "tailleEquipe" membres.
//
// Principe (glouton maximal) :
//   1. Trouver la paire avec le score d'affinité le plus élevé
//      → ce sont les 2 fondateurs du noyau de l'équipe
//   2. Ajouter itérativement le participant restant dont le
//      score moyen avec tous les membres actuels de l'équipe
//      est le plus élevé
//   3. Répéter jusqu'à tailleEquipe atteinte
//   4. Recommencer avec les participants non encore affectés
//   5. Les participants en surnombre forment une équipe incomplète
//
// Gestion des exclusions :
//   Si tous les candidats restants ont un refus avec au moins
//   un membre de l'équipe en cours, on prend le premier disponible
//   (on ne laisse personne sans équipe).
//
// RETOURNE la liste des équipes, sans sauvegarder en base.
// ─────────────────────────────────────────────────────────────
const formerEquipes = (participants, tailleEquipe, connexions) => {
    let restants     = [...participants]; // copie pour ne pas muter le tableau source
    const equipes    = [];
    let numeroEquipe = 1;

    while (restants.length > 0) {

        // Cas limite : 1 participant restant → équipe incomplète
        if (restants.length === 1) {
            equipes.push({
                nom:         `Équipe suggérée ${numeroEquipe}`,
                membres:     restants.map(u => formaterMembre(u)),
                score_moyen: 0,
                complet:     false, // signale que l'équipe est sous-dimensionnée
            });
            break;
        }

        // ── Étape A : Trouver la meilleure paire (noyau) ───────
        // On cherche les 2 participants avec le score d'affinité maximal.
        let meilleurScore  = -Infinity;
        let indiceA = 0, indiceB = 1;

        for (let i = 0; i < restants.length; i++) {
            for (let j = i + 1; j < restants.length; j++) {
                const s = calculerScoreAffinite(restants[i], restants[j], connexions);
                if (s > meilleurScore) {
                    meilleurScore = s;
                    indiceA = i;
                    indiceB = j;
                }
            }
        }

        // Construire l'équipe avec le noyau (les 2 meilleurs)
        const equipe = [];
        const scoresInternes = [Math.max(0, meilleurScore)]; // pour calculer score_moyen

        // Retirer du pool dans l'ordre décroissant (pour ne pas décaler les indices)
        const [iMax, iMin] = indiceA > indiceB
            ? [indiceA, indiceB]
            : [indiceB, indiceA];
        equipe.push(restants[iMax]);
        equipe.push(restants[iMin]);
        restants.splice(iMax, 1);
        restants.splice(iMin, 1);

        // ── Étape B : Compléter l'équipe ────────────────────────
        // Ajouter des membres jusqu'à atteindre tailleEquipe
        while (equipe.length < tailleEquipe && restants.length > 0) {

            let meilleurCandidatIdx = -1;
            let meilleurScoreMoyen  = -Infinity;

            for (let k = 0; k < restants.length; k++) {
                // Calculer le score de ce candidat avec chaque membre de l'équipe
                const scoresAvecEquipe = equipe.map(m =>
                    calculerScoreAffinite(restants[k], m, connexions)
                );

                // Si le candidat a un refus avec au moins un membre → incompatible
                if (scoresAvecEquipe.includes(-Infinity)) continue;

                // Score moyen du candidat avec l'équipe actuelle
                const scoreMoyen = scoresAvecEquipe.reduce((a, b) => a + b, 0) / scoresAvecEquipe.length;
                if (scoreMoyen > meilleurScoreMoyen) {
                    meilleurScoreMoyen  = scoreMoyen;
                    meilleurCandidatIdx = k;
                }
            }

            if (meilleurCandidatIdx === -1) {
                // Aucun candidat compatible (tous en conflit) → prendre le premier par défaut
                // On ne laisse personne sans équipe même en cas de conflit généralisé
                equipe.push(restants[0]);
                scoresInternes.push(0);
                restants.splice(0, 1);
            } else {
                equipe.push(restants[meilleurCandidatIdx]);
                scoresInternes.push(Math.max(0, meilleurScoreMoyen));
                restants.splice(meilleurCandidatIdx, 1);
            }
        }

        // Calculer le score moyen de cohésion de l'équipe
        const scoreMoyenEquipe = scoresInternes.length > 0
            ? scoresInternes.reduce((a, b) => a + b, 0) / scoresInternes.length
            : 0;

        equipes.push({
            nom:         `Équipe suggérée ${numeroEquipe}`,
            membres:     equipe.map(u => formaterMembre(u)),
            score_moyen: +scoreMoyenEquipe.toFixed(3),
            complet:     equipe.length === tailleEquipe,
        });

        numeroEquipe++;
    }

    return equipes;
};

// ─────────────────────────────────────────────────────────────
// Formatage d'un membre pour la réponse JSON
// Ajoute le label de niveau calculé depuis cumul_points
// ─────────────────────────────────────────────────────────────
const formaterMembre = (u) => ({
    _id:          u._id,
    first_name:   u.first_name,
    last_name:    u.last_name,
    photo:        u.photo || '',
    cumul_points: u.cumul_points || 0,
    // Label lisible du niveau (ex: "Actif")
    niveau:       LABELS_NIVEAUX[getNiveauIndex(u.cumul_points || 0)],
});

// ─────────────────────────────────────────────────────────────
// FONCTION PRINCIPALE — genererEquipesSuggeres
//
// Génère une proposition d'équipes pour un événement.
// NE SAUVEGARDE RIEN — retourne uniquement la suggestion.
// L'organisateur valide manuellement via POST /api/equipes/manuelle.
//
// Paramètres :
//   eventId      — ObjectId de l'événement
//   tailleEquipe — nombre de membres par équipe (défaut 4, min 2)
//
// Retourne :
//   {
//     equipes_suggerees : [{ nom, membres[], score_moyen, complet }],
//     nb_participants   : 12,
//     nb_equipes        : 3,
//     taille_equipe     : 4,
//   }
// ─────────────────────────────────────────────────────────────
const genererEquipesSuggeres = async (eventId, tailleEquipe = 4) => {

    // ── 1. Récupérer tous les participants inscrits ───────────
    // On travaille sur les inscrits (is_present peut être false)
    // — la formation d'équipes se fait AVANT l'événement.
    const participations = await Participation.find({ evenement: eventId })
        .populate('utilisateur', 'first_name last_name photo cumul_points reliabilite_score');

    const participants = participations
        .map(p => p.utilisateur)
        .filter(Boolean); // exclure les refs nulles (utilisateur supprimé)

    if (participants.length < 2) {
        throw new Error('Pas assez de participants pour former des équipes (minimum 2 inscrits)');
    }

    // ── 2. Charger les connexions ALL-TIME entre ces participants ──
    // CRITIQUE : on ne filtre PAS sur l'événement.
    // L'historique complet de la relation entre deux participants
    // est plus riche que les connexions d'un seul événement.
    const participantIds = participants.map(p => p._id);
    const connexions = await Connexion.find({
        demandeur: { $in: participantIds },
        receveur:  { $in: participantIds },
    });

    // ── 3. Algorithme glouton de formation ────────────────────
    const equipes = formerEquipes(participants, tailleEquipe, connexions);

    return {
        equipes_suggerees: equipes,
        nb_participants:   participants.length,
        nb_equipes:        equipes.length,
        taille_equipe:     tailleEquipe,
    };
};

// ── Exports ──────────────────────────────────────────────────
// Fonction principale utilisée par routes/equipes.js
// + sous-fonctions pour les tests unitaires
module.exports = {
    genererEquipesSuggeres,
    calculerScoreAffinite,
    getPartenariatAccepte,
    getLikesMutuels,
    getNoteCollaboration,
    getMemeNiveau,
    getNiveauIndex,
};
