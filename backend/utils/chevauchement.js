// Détection de chevauchement : un utilisateur ne peut pas avoir deux événements
// (créés ou en participation) en même temps.
// Durée par défaut quand ev_end_time est absent : 2h (identique au cron de clôture).

const Evenement     = require('../models/Evenement');
const Participation = require('../models/Participation');

const DUREE_PAR_DEFAUT_MS = 2 * 60 * 60 * 1000;

const fmtDate = (d) =>
    new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });

/**
 * Vérifie si userId a déjà un événement (créé ou en participation) qui chevauche [start, end].
 *
 * @param {string} userId
 * @param {Date|string} start    - début du créneau à vérifier
 * @param {Date|string|null} end - fin du créneau (null → start + 2h)
 * @param {string|null} excludeEventId - exclure cet événement du contrôle (modification en cours)
 * @returns {{ type: 'creation'|'participation', evenement: object, message: string } | null}
 */
const verifierChevauchement = async (userId, start, end, excludeEventId = null) => {
    const debut = new Date(start);
    const fin   = end ? new Date(end) : new Date(debut.getTime() + DUREE_PAR_DEFAUT_MS);

    // Chevauchement : fin_nouveau > debut_existant ET debut_nouveau < fin_existant
    // Si fin_existant absente → on suppose debut_existant + 2h
    const condTemps = {
        stat_event: { $in: ['brouillon', 'publié'] },
        $expr: {
            $and: [
                { $gt: [fin, '$ev_start_time'] },
                {
                    $lt: [
                        debut,
                        {
                            $ifNull: [
                                '$ev_end_time',
                                { $add: ['$ev_start_time', DUREE_PAR_DEFAUT_MS] },
                            ],
                        },
                    ],
                },
            ],
        },
    };

    const excludeFilter = excludeEventId ? { _id: { $ne: excludeEventId } } : {};

    // ── 1. Événements créés par l'utilisateur ──
    const evCreee = await Evenement.findOne({
        ...condTemps,
        ...excludeFilter,
        createur: userId,
    }).select('title_event ev_start_time ev_end_time');

    if (evCreee) {
        return {
            type: 'creation',
            evenement: evCreee,
            message: `Vous organisez déjà un événement durant ce créneau : "${evCreee.title_event}" (${fmtDate(evCreee.ev_start_time)}).`,
        };
    }

    // ── 2. Participations actives de l'utilisateur ──
    const participations = await Participation.find({ utilisateur: userId }).select('evenement');
    if (participations.length === 0) return null;

    const idsInscrits = participations.map(p => p.evenement);
    const idFilter    = excludeEventId
        ? { $in: idsInscrits, $ne: excludeEventId }
        : { $in: idsInscrits };

    const evInscrit = await Evenement.findOne({
        ...condTemps,
        _id: idFilter,
    }).select('title_event ev_start_time ev_end_time');

    if (evInscrit) {
        return {
            type: 'participation',
            evenement: evInscrit,
            message: `Vous êtes déjà inscrit à un événement durant ce créneau : "${evInscrit.title_event}" (${fmtDate(evInscrit.ev_start_time)}).`,
        };
    }

    return null;
};

module.exports = { verifierChevauchement };
