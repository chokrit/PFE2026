// ============================================================
// routes/medias.js — Gestion des médias avec Cloudinary
// Préfixe : /api/medias
// ============================================================

const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { verifyToken, isOrganisateur } = require('../middleware/auth');
const Media = require('../models/Media');
const Participation = require('../models/Participation');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer en mémoire — on upload ensuite via stream vers Cloudinary
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 Mo max
    fileFilter: (req, file, cb) => {
        const ok = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        cb(null, ok.includes(file.mimetype));
    },
});

// ── Helper : dossier Cloudinary selon type_media ──
const dossier = (type) => ({
    photo_profil:     'event-app/profils',
    photo_evenement:  'event-app/evenements',
    photo_officielle: 'event-app/officielles',
}[type] || 'event-app/divers');

// ── Helper : upload buffer vers Cloudinary v2 ──
const uploadVersCloudinary = (buffer, folder, publicId) => new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
        {
            folder,
            public_id: publicId,
            overwrite: true,
            transformation: [{ width: 1200, quality: 'auto', fetch_format: 'auto' }],
        },
        (err, result) => { if (err) reject(err); else resolve(result); }
    );
    stream.end(buffer);
});

// ── Helper : générer URL thumbnail depuis public_id ──
const thumbnail = (publicId) => cloudinary.url(publicId, {
    width: 300, height: 300, crop: 'fill', quality: 'auto', fetch_format: 'auto',
});

// ─────────────────────────────────────────────────────────────
// GET /api/medias/moderation — Admin: médias en attente + signalés
// ─────────────────────────────────────────────────────────────
const { isAdmin } = require('../middleware/auth');

router.get('/moderation', verifyToken, isAdmin, async (req, res) => {
    try {
        const medias = await Media.find({
            $or: [{ statut: 'en_attente' }, { signale: true }],
        })
            .populate('utilisateur', 'first_name last_name')
            .populate('evenement', 'title_event')
            .sort({ uploaded_at: -1 });
        return res.json({ success: true, count: medias.length, medias });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// ─────────────────────────────────────────────────────────────
// POST /api/medias/upload
// ─────────────────────────────────────────────────────────────
router.post('/upload', verifyToken, upload.single('photo'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'Aucune image reçue' });

        const { type_media, evenement_id } = req.body;
        const typesValides = ['photo_profil', 'photo_evenement', 'photo_officielle'];
        if (!typesValides.includes(type_media)) {
            return res.status(400).json({ success: false, message: 'type_media invalide' });
        }

        // Vérification droits selon type
        if (type_media === 'photo_officielle') {
            if (!['admin', 'organisateur'].includes(req.utilisateur.role)) {
                return res.status(403).json({ success: false, message: 'Droits organisateur requis' });
            }
        }
        if (type_media === 'photo_evenement') {
            if (!evenement_id) return res.status(400).json({ success: false, message: 'evenement_id requis' });
            const inscrit = await Participation.findOne({ utilisateur: req.utilisateur._id, evenement: evenement_id });
            if (!inscrit && !['admin', 'organisateur'].includes(req.utilisateur.role)) {
                return res.status(403).json({ success: false, message: 'Vous devez être inscrit à cet événement' });
            }
        }

        const publicId = `${Date.now()}_${req.utilisateur._id}`;
        const result = await uploadVersCloudinary(req.file.buffer, dossier(type_media), publicId);

        const media = await Media.create({
            file_url:       result.secure_url,
            thumbnail_url:  thumbnail(result.public_id),
            public_id:      result.public_id,
            utilisateur:    req.utilisateur._id,
            evenement:      evenement_id || null,
            type_media,
            taille_fichier: req.file.size,
            format:         result.format,
        });

        console.log(`✅ Media uploadé : ${result.public_id}`);
        return res.status(201).json({ success: true, media });
    } catch (error) {
        console.error('❌ Erreur upload media:', error.message);
        return res.status(500).json({ success: false, message: 'Erreur upload' });
    }
});

// ─────────────────────────────────────────────────────────────
// GET /api/medias/evenement/:eventId
// Participants → approuvé seulement / Orga+Admin → tout
// ─────────────────────────────────────────────────────────────
router.get('/evenement/:eventId', verifyToken, async (req, res) => {
    try {
        const estOrga = ['admin', 'organisateur'].includes(req.utilisateur.role);
        const filtre = { evenement: req.params.eventId, type_media: { $in: ['photo_evenement', 'photo_officielle'] } };
        if (!estOrga) filtre.statut = 'approuve';

        const medias = await Media.find(filtre)
            .populate('utilisateur', 'first_name last_name')
            .sort({ uploaded_at: -1 });

        return res.json({ success: true, count: medias.length, medias });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// ─────────────────────────────────────────────────────────────
// GET /api/medias/profil/:userId
// Retourne la dernière photo_profil approuvée
// ─────────────────────────────────────────────────────────────
router.get('/profil/:userId', verifyToken, async (req, res) => {
    try {
        const media = await Media.findOne({
            utilisateur: req.params.userId,
            type_media: 'photo_profil',
            statut: 'approuve',
        }).sort({ uploaded_at: -1 });

        return res.json({ success: true, media: media || null });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// ─────────────────────────────────────────────────────────────
// PUT /api/medias/:mediaId/valider
// isOrganisateur — Body: { statut: 'approuve' | 'refuse' }
// ─────────────────────────────────────────────────────────────
router.put('/:mediaId/valider', verifyToken, isOrganisateur, async (req, res) => {
    try {
        const { statut } = req.body;
        if (!['approuve', 'refuse'].includes(statut)) {
            return res.status(400).json({ success: false, message: 'Statut invalide' });
        }
        const media = await Media.findByIdAndUpdate(
            req.params.mediaId,
            { statut, approuve_par: req.utilisateur._id, approuve_at: new Date() },
            { new: true }
        );
        if (!media) return res.status(404).json({ success: false, message: 'Média introuvable' });
        return res.json({ success: true, media });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// ─────────────────────────────────────────────────────────────
// POST /api/medias/:mediaId/signaler
// Tout utilisateur connecté
// ─────────────────────────────────────────────────────────────
router.post('/:mediaId/signaler', verifyToken, async (req, res) => {
    try {
        const media = await Media.findById(req.params.mediaId);
        if (!media) return res.status(404).json({ success: false, message: 'Média introuvable' });

        const userId = req.utilisateur._id.toString();
        const dejaSignale = media.signale_par.map(id => id.toString()).includes(userId);
        if (!dejaSignale) {
            media.signale_par.push(req.utilisateur._id);
        }

        if (media.signale_par.length >= 3) {
            media.statut = 'en_attente';
            media.signale = true;
        }

        await media.save();
        return res.json({ success: true, message: 'Signalement enregistré', nb_signalements: media.signale_par.length });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// ─────────────────────────────────────────────────────────────
// DELETE /api/medias/:mediaId
// Utilisateur → ses propres / Orga → ses événements / Admin → tout
// ─────────────────────────────────────────────────────────────
router.delete('/:mediaId', verifyToken, async (req, res) => {
    try {
        const media = await Media.findById(req.params.mediaId).populate('evenement', 'createur');
        if (!media) return res.status(404).json({ success: false, message: 'Média introuvable' });

        const estProprietaire = media.utilisateur.toString() === req.utilisateur._id.toString();
        const estAdmin = req.utilisateur.role === 'admin';
        const estOrgaDuEvent = req.utilisateur.role === 'organisateur' &&
            media.evenement?.createur?.toString() === req.utilisateur._id.toString();

        if (!estProprietaire && !estAdmin && !estOrgaDuEvent) {
            return res.status(403).json({ success: false, message: 'Non autorisé' });
        }

        if (media.public_id) {
            await cloudinary.uploader.destroy(media.public_id);
        }
        await Media.findByIdAndDelete(req.params.mediaId);

        return res.json({ success: true, message: 'Média supprimé' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

module.exports = router;
