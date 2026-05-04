// ============================================================
// cron/rappelEvenements.js
// Tâche planifiée : envoie un rappel aux participants et à
// l'organisateur 2 heures avant le début de chaque événement.
//
// Cadence : toutes les 15 minutes
// Fenêtre  : événements débutant dans [1h45 ; 2h15] à partir de maintenant
//            (marge de 30 min pour absorber les décalages de planification)
// ============================================================

const cron = require('node-cron');
const Evenement     = require('../models/Evenement');
const Participation = require('../models/Participation');
const Notification  = require('../models/Notification');
const { terminerEvenementsExpires } = require('../controllers/evenementController');

const FENETRE_MIN = 105; // 1h45
const FENETRE_MAX = 135; // 2h15

async function envoyerRappels() {
    const maintenant = new Date();
    const debut  = new Date(maintenant.getTime() + FENETRE_MIN * 60 * 1000);
    const fin    = new Date(maintenant.getTime() + FENETRE_MAX * 60 * 1000);

    const evenements = await Evenement.find({
        stat_event: 'publié',
        notif_rappel_envoyee: false,
        ev_start_time: { $gte: debut, $lte: fin },
    }).populate('createur', 'first_name last_name');

    if (evenements.length === 0) return;

    console.log(`\n🔔 Cron rappels : ${evenements.length} événement(s) à notifier`);

    for (const ev of evenements) {
        const heureDebut = new Date(ev.ev_start_time).toLocaleTimeString('fr-FR', {
            hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Tunis',
        });
        const dateDebut = new Date(ev.ev_start_time).toLocaleDateString('fr-FR', {
            day: '2-digit', month: 'long', timeZone: 'Africa/Tunis',
        });

        const titre   = `⏰ Rappel : "${ev.title_event}" commence bientôt !`;
        const message = `Votre événement "${ev.title_event}" commence aujourd'hui à ${heureDebut} (${dateDebut}). Ne soyez pas absent — votre équipe compte sur vous !`;

        // Récupérer tous les participants inscrits
        const participations = await Participation.find({ evenement: ev._id });
        const destinataires  = participations.map(p => p.utilisateur);

        // Ajouter l'organisateur s'il n'est pas déjà dans la liste
        const idCreateur = ev.createur?._id?.toString();
        if (idCreateur && !destinataires.some(id => id.toString() === idCreateur)) {
            destinataires.push(ev.createur._id);
        }

        // Créer une notification par destinataire (éviter les doublons)
        const docs = destinataires.map(userId => ({
            utilisateur: userId,
            evenement:   ev._id,
            type:        'rappel_event',
            titre,
            message,
        }));

        await Notification.insertMany(docs, { ordered: false }).catch(() => {});

        // Marquer l'événement comme notifié
        await Evenement.findByIdAndUpdate(ev._id, { notif_rappel_envoyee: true });

        console.log(`  ✅ ${destinataires.length} notification(s) envoyée(s) pour "${ev.title_event}"`);
    }
}

function demarrerCron() {
    // Tâche 1 : rappels 2h avant chaque événement
    cron.schedule('*/15 * * * *', async () => {
        try {
            await envoyerRappels();
        } catch (err) {
            console.error('❌ Erreur cron rappels:', err.message);
        }
    });

    // Tâche 2 : passer en "terminé" les événements dont ev_end_time est dépassé.
    // Exécutée toutes les 15 min en même temps que les rappels.
    cron.schedule('*/15 * * * *', async () => {
        try {
            await terminerEvenementsExpires();
        } catch (err) {
            console.error('❌ Erreur cron terminé:', err.message);
        }
    });

    console.log('⏱  Cron démarré : rappels + clôture automatique (toutes les 15 min)');
}

module.exports = { demarrerCron };
