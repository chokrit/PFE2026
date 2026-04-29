// ============================================================
// routes/notifications.js
// Préfixe : /api/notifications
// ============================================================

const express = require('express');
const router  = express.Router();
const { verifyToken } = require('../middleware/auth');
const Notification = require('../models/Notification');

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

module.exports = router;
