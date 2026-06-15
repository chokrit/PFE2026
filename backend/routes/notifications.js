// ============================================================
// routes/notifications.js
// Préfixe : /api/notifications
// ============================================================

const express = require('express');
const router  = express.Router();
const { verifyToken, isAdmin } = require('../middleware/auth');
const Notification = require('../models/Notification');
const Utilisateur  = require('../models/Utilisateur');

// GET /api/notifications — mes notifications (les 30 dernières)
router.get('/', verifyToken, async (req, res) => {
    try {
        const notifs = await Notification.find({ utilisateur: req.utilisateur._id })
            .populate('evenement', 'title_event ev_start_time')
            .sort({ created_at: -1 })
            .limit(30);

        const nonLues = notifs.filter(n => !n.lu).length;
        return res.json({ success: true, notifications: notifs, nonLues });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// PUT /api/notifications/:id/lu — marquer une notification comme lue
router.put('/:id/lu', verifyToken, async (req, res) => {
    try {
        const notif = await Notification.findOneAndUpdate(
            { _id: req.params.id, utilisateur: req.utilisateur._id },
            { lu: true },
            { new: true }
        );
        if (!notif) return res.status(404).json({ success: false, message: 'Notification introuvable' });
        return res.json({ success: true, notification: notif });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// PUT /api/notifications/tout-lire — marquer toutes comme lues
router.put('/tout-lire', verifyToken, async (req, res) => {
    try {
        await Notification.updateMany(
            { utilisateur: req.utilisateur._id, lu: false },
            { lu: true }
        );
        return res.json({ success: true, message: 'Toutes les notifications marquées comme lues' });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// DELETE /api/notifications/:id — supprimer une notification
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        await Notification.findOneAndDelete({ _id: req.params.id, utilisateur: req.utilisateur._id });
        return res.json({ success: true });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// POST /api/notifications/reactivation
// Accessible à l'admin uniquement.
// Body : { userIds: [ObjectId, ...] }
// Crée une notification de réactivation personnalisée pour chaque utilisateur inactif.
router.post('/reactivation', verifyToken, isAdmin, async (req, res) => {
    try {
        const { userIds } = req.body;

        if (!Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'userIds doit être un tableau non vide',
            });
        }

        // Récupérer les prénoms pour personnaliser les messages
        const users = await Utilisateur.find({ _id: { $in: userIds } })
            .select('_id first_name');

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Aucun utilisateur trouvé pour les IDs fournis',
            });
        }

        // Générer un message personnalisé par prénom
        const genMessage = (prenom) =>
            `Bonjour ${prenom} ! 👋 Cela fait un moment que nous ne vous avons pas vu sur EVENT. ` +
            `De nouveaux événements sportifs vous attendent. ` +
            `Venez participer et retrouvez votre communauté ! ` +
            `Votre score de fidélité vous attend. 🏆`;

        // Construire les documents de notification (1 par utilisateur)
        const notifDocs = users.map(u => ({
            utilisateur: u._id,
            type:    'absence_evenement',
            titre:   'Vous nous manquez ! 💙',
            message: genMessage(u.first_name),
            lu:      false,
        }));

        // Insertion en masse — ordered:false pour ne pas bloquer si un doc échoue
        await Notification.insertMany(notifDocs, { ordered: false });

        console.log(`📬 Réactivation : ${users.length} notification(s) envoyée(s) par ${req.utilisateur.email}`);

        return res.json({
            success: true,
            message: `${users.length} notification(s) de réactivation envoyée(s)`,
            nb_notifies: users.length,
        });
    } catch (err) {
        console.error('reactivation:', err);
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

module.exports = router;
