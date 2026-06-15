// ============================================================
// routes/stats.js — Statistiques agrégées
// Préfixe : /api/stats
//
// ROUTES :
//   GET /api/stats/admin        → Vue globale (admin uniquement)
//   GET /api/stats/organisateur → Vue limitée (orga/admin)
//   GET /api/stats/utilisateur  → Données perso (tout utilisateur)
//
// CACHE EN MÉMOIRE :
//   Les stats admin exécutent beaucoup de requêtes MongoDB.
//   Le résultat est mis en cache 10 minutes en mémoire Node.js.
//   La clé de cache = "${dateDebut}_${dateFin}".
//   Si la période change → le cache est automatiquement invalidé.
//   Le bouton "Actualiser" du frontend peut forcer le rechargement
//   en ajoutant le query param &force=1.
// ============================================================

const express = require('express');
const router  = express.Router();

const { verifyToken, isAdmin, isOrganisateur } = require('../middleware/auth');
const {
    getStatsAdmin,
    getStatsOrganisateur,
    getStatsUtilisateur,
} = require('../controllers/statsController');

// Cache simple en mémoire (suffisant pour une appli monoprocessus)
// Pour une architecture multi-instances, utiliser Redis à la place.
const cache = {
    data: null,   // Résultat de la dernière requête
    key:  null,   // Clé = "${dateDebut}_${dateFin}" de la dernière requête
    ts:   0,      // Timestamp en ms de la dernière mise en cache
};
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes en millisecondes

// ── Middleware de cache pour /admin uniquement ──
// Wrappe getStatsAdmin pour intercepter la réponse et la mettre en cache.
const avecCache = async (req, res) => {
    const { dateDebut, dateFin, periode, force } = req.query;

    // Calculer la clé de cache à partir de la période résolue
    // On utilise un identifiant simple dateDebut_dateFin ou bien le code periode.
    const cacheKey = dateDebut && dateFin
        ? `${dateDebut}_${dateFin}`
        : `periode_${periode || '30j'}`;

    const maintenant  = Date.now();
    const cacheValide = cache.data
        && cache.key === cacheKey
        && (maintenant - cache.ts) < CACHE_TTL_MS
        && force !== '1'; // Le param force=1 invalide le cache

    if (cacheValide) {
        // Retourner les données mises en cache sans interroger MongoDB
        console.log(`📊 Stats admin servies depuis le cache (${Math.round((maintenant - cache.ts) / 1000)}s)`);
        return res.json({
            ...cache.data,
            _cache: {
                servi_depuis_cache: true,
                age_secondes: Math.round((maintenant - cache.ts) / 1000),
            },
        });
    }

    // Le cache est invalide ou absent : exécuter la vraie requête
    // On remplace res.json pour intercepter la réponse avant de l'envoyer
    const jsonOriginal = res.json.bind(res);
    res.json = (data) => {
        // Ne mettre en cache que si la requête a réussi
        if (data && data.success) {
            cache.data = data;
            cache.key  = cacheKey;
            cache.ts   = Date.now();
            console.log(`📊 Stats admin calculées et mises en cache (clé: ${cacheKey})`);
        }
        // Appeler le vrai res.json pour envoyer la réponse au client
        return jsonOriginal(data);
    };

    return getStatsAdmin(req, res);
};

// ─────────────────────────────────────────────────────────────
// GET /api/stats/admin
// Accès : admin uniquement
// Query params : dateDebut, dateFin, periode, force
// ─────────────────────────────────────────────────────────────
router.get('/admin', verifyToken, isAdmin, avecCache);

// ─────────────────────────────────────────────────────────────
// GET /api/stats/organisateur
// Accès : organisateur ou admin
// Query params : dateDebut, dateFin, periode
// Pas de cache (les données varient par utilisateur connecté)
// ─────────────────────────────────────────────────────────────
router.get('/organisateur', verifyToken, isOrganisateur, getStatsOrganisateur);

// ─────────────────────────────────────────────────────────────
// GET /api/stats/utilisateur
// Accès : tout utilisateur connecté
// Pas de filtre de période — données personnelles toutes périodes
// ─────────────────────────────────────────────────────────────
router.get('/utilisateur', verifyToken, getStatsUtilisateur);

module.exports = router;
