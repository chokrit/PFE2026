# PRÉPARATION SOUTENANCE — APPLICATION EVENT (PFE)
> Document généré à partir du code réel. Basé sur lecture directe des fichiers source.

---

## 1. ARBORESCENCE COMMENTÉE

```
event-app/
├── backend/                         Serveur Node.js/Express + MongoDB
│   ├── server.js                    Point d'entrée : Express, routes, cron job 24h
│   ├── config/
│   │   └── db.js                    Connexion MongoDB Atlas via Mongoose
│   ├── middleware/
│   │   └── auth.js                  verifyToken, isAdmin, isOrganisateur
│   ├── controllers/
│   │   ├── authController.js        register, login, forgotPassword
│   │   ├── evenementController.js   CRUD événements + cycle de vie + QR scan
│   │   └── statsController.js       KPI admin/orga/utilisateur
│   ├── routes/
│   │   ├── auth.js                  /api/auth (register, login, forgot-password)
│   │   ├── utilisateurs.js          /api/utilisateurs (inline handlers, pas de controller)
│   │   ├── evenements.js            /api/evenements
│   │   ├── participations.js        /api/participations (inscription, scan QR, absents)
│   │   ├── connexions.js            /api/connexions (likes, partenaires)
│   │   ├── categories.js            /api/categories (suggestions sport)
│   │   ├── locations.js             /api/locations (suggestions lieu)
│   │   ├── medias.js                /api/medias (upload Cloudinary)
│   │   ├── equipes.js               /api/equipes (formation manuelle + IA)
│   │   ├── notifications.js         /api/notifications
│   │   ├── recompenses.js           /api/recompenses (coupons + règles admin)
│   │   └── stats.js                 /api/stats
│   ├── models/                      17 modèles Mongoose (voir section 2)
│   ├── services/
│   │   ├── iaSuggestionService.js   Algorithme de recommandation d'événements (4 paramètres)
│   │   ├── iaFiabiliteService.js    Calcul score de fiabilité utilisateur
│   │   └── iaEquipeService.js       Algorithme glouton de formation d'équipes (4 paramètres)
│   └── utils/
│       ├── chevauchement.js         Vérifie si un utilisateur a un conflit de créneau
│       └── token.js                 Utilitaire JWT
│
└── frontend/                        React 18 + Vite + Axios
    └── src/
        ├── app.jsx                  Router principal (routes publiques/protégées)
        ├── api.js                   Instance Axios centralisée (JWT auto + redirect 401)
        ├── main.jsx                 Point d'entrée React
        ├── context/
        │   ├── LanguageContext.jsx  Context multilingue (fr/en/ar/ar-tn)
        │   └── ThemeContext.jsx     Context thème clair/sombre
        ├── components/
        │   ├── ProtectedRoute.jsx   Garde les routes (vérifie JWT en localStorage)
        │   ├── RecompensesModal.jsx CRUD règles de récompenses (admin)
        │   ├── PhotoGallery.jsx     Galerie médias
        │   └── dashboard/           Sous-composants des dashboards (EventCard, QRModal…)
        ├── pages/
        │   ├── Login.jsx            Formulaire connexion
        │   ├── Register.jsx         Formulaire inscription
        │   ├── SplashScreen.jsx     Écran d'accueil
        │   └── dashboards/
        │       ├── DashboardUser.jsx         Interface utilisateur connecté
        │       ├── DashboardOrganisateur.jsx Interface organisateur
        │       └── DashboardAdmin.jsx        Interface administrateur
        ├── styles/                  CSS par module (global, dashboard, animations)
        ├── translations/
        │   └── translations.js      Dictionnaire i18n statique (fr/en/ar/ar-tn)
        └── utils/
            └── dates.js             Helpers de formatage de dates
```

---

## 2. MODÈLES DE DONNÉES

### 2.1 Vue d'ensemble

| Fichier | Modèle | Collection | Rôle |
|---|---|---|---|
| Utilisateur.js | Utilisateur | `utilisateur` | Comptes utilisateurs, rôles, gamification |
| Evenement.js | Evenement | `evenements` | Événements sportifs avec cycle de vie complet |
| Participation.js | Participation | `participations` | Inscription d'un user à un event (table de jointure) |
| Categorie.js | Categorie | `categories` | Types de sport (Football, Natation…) |
| Location.js | Location | `locations` | Lieux physiques des événements |
| Notification.js | Notification | `notification` | Notifications in-app (pas d'email) |
| Connexion.js | Connexion | `connexion` | Liens sociaux : like ou partenariat |
| Media.js | Media | `media` | Photos/vidéos uploadées sur Cloudinary |
| Equipe.js | Equipe | `equipe` | Équipes formées pour un événement |
| Discount.js | Discount | `discounts` | Coupons de réduction générés |
| RegleRecompence.js | RegleRecompense | `regles_recompenses` | Règles de déclenchement des coupons |
| Appartenir.js | Appartenir | `appartenir` | Association utilisateur ↔ coupon (table de jointure) |
| Equipment.js | Equipment | `equipments` | Équipements sportifs disponibles |
| Equiper.js | Equiper | `equiper` | Événement ↔ équipements requis (table de jointure) |
| Review.js | Review | `reviews` | Avis et notes laissés sur les événements |
| StatistiquePresence.js | StatistiquePresence | `statistique_presence` | Snapshot à chaque scan QR (données IA) |
| Interest.js | Interest | `interests` | Affinités utilisateur ↔ catégorie (table de jointure) |

---

### 2.2 Détail des modèles clés

#### Utilisateur (`utilisateur`)
```
first_name         String  [required, trim, maxlength:50]
last_name          String  [required, trim, maxlength:50]
email              String  [required, unique, lowercase]
password_hash      String  [required, minlength:6, select:false]
role               Enum    ['user','admin','organisateur']  default:'user'
photo              String  default:''
telephone          String
langue             Enum    ['fr','en','ar','ar-tn']  default:'fr'
sexe               Enum    ['homme','femme']
date_naissance     Date
visibilite_profil  Enum    ['public','prive','masque']  default:'public'
bio_sportive       String
sports_preferes    [ObjectId → Categorie]
disponibilites     [Enum: 'weekend','soir_semaine','matin','apres_midi']
score_social       Number  default:0
cumul_heures_participation  Number  default:0
cumul_points       Number  default:0
cumul_points_remise Number  default:0
reliabilite_score  Number  default:100  [0–100]
created_at         Date    default:Date.now
```
**Hook :** `pre('save')` → bcrypt hash le `password_hash` (12 rounds)  
**Méthodes :** `comparePassword()`, `toPublicJSON()`

---

#### Evenement (`evenements`)
```
title_event              String  [required, trim, maxlength:100]
event_description        String  [maxlength:2000]
ev_start_time            Date    [required]
ev_end_time              Date    [validator: > ev_start_time]
stat_event               Enum    ['brouillon','publié','annulé','terminé']  default:'brouillon'
max_participants         Number  default:30  min:1
qr_code_token            String  [unique, sparse]
createur                 ObjectId → Utilisateur  [required]
location                 ObjectId → Location
categories               [ObjectId → Categorie]
notif_rappel_envoyee     Boolean  default:false
modification_en_attente  Boolean  default:false
modification_proposee    Object imbriqué (titre, description, dates, location, categories, proposee_par, proposee_le)
annulation_en_attente    Boolean  default:false
annulation_proposee      Object imbriqué (raison, proposee_par, proposee_le)
raison_annulation        String
```
**Hook :** `pre('save')` → génère `qr_code_token` (crypto.randomBytes 32) quand `stat_event` passe à `'publié'`

---

#### Participation (`participations`)
```
utilisateur   ObjectId → Utilisateur  [required]
evenement     ObjectId → Evenement    [required]
is_present    Boolean  default:false
scanner_date  Date
registered_at Date     default:Date.now
qr_token      String   [unique, sparse]  — token PERSONNEL du participant (différent du qr_code_token de l'event)
qr_utilise    Boolean  default:false
```
**Index unique :** `{ utilisateur:1, evenement:1 }` → empêche double inscription

---

#### Connexion (`connexion`)
```
demandeur   ObjectId → Utilisateur  [required]
receveur    ObjectId → Utilisateur  [required]
evenement   ObjectId → Evenement    [required]
type        Enum    ['like','partenaire']  [required]
statut      Enum    ['en_attente','accepte','refuse']
note_collab Number  [1–5, default:null]
created_at  Date    default:Date.now
```
**Hook :** `pre('save')` → si `type==='like'` alors `statut='accepte'` automatiquement  
**Index unique :** `{ demandeur, receveur, evenement, type }`

---

#### StatistiquePresence (`statistique_presence`)
```
evenement       ObjectId → Evenement   [required]
utilisateur     ObjectId → Utilisateur [required]
categorie       ObjectId → Categorie
heure_scan      Date     [required]
heure_debut_ev  Date
heures_duree    Number   default:0
points_gagnes   Number   default:10
cumul_pts_avant Number   default:0
niveau_avant    Enum     ['Débutant','Actif','Avancé','Champion']
niveau_apres    Enum     (idem)
fiabilite_avant Number   [0–100]
fiabilite_apres Number   [0–100]
coupon_declenche Boolean  default:false
```
**Rôle :** Chaque document = un scan QR réussi. Ces données alimentent les algorithmes IA.

---

### 2.3 Pourquoi référence vs document embarqué

| Choix | Justification |
|---|---|
| `Participation` = collection séparée (pas subdoc dans Evenement) | Un utilisateur a ses participations indépendamment des événements. Permet `find({ utilisateur: id })` sans charger tous les événements. |
| `Connexion` = collection séparée | Les connexions existent entre deux utilisateurs dans le contexte d'un événement. Requêtes sociales fréquentes et indépendantes. |
| `modification_proposee` = subdoc embarqué dans Evenement | C'est un état temporaire d'un seul événement. Jamais requêtée séparément. |
| `StatistiquePresence` = collection séparée | Volume élevé, requêtes analytiques par utilisateur/catégorie/période sans charger les événements. |
| `Interest` = collection séparée | Mis à jour à chaque scan QR pour chaque catégorie. Index `{utilisateur,categorie}` unique nécessaire. |

---

## 3. ROUTES ET CONTRÔLEURS

### /api/auth
| Méthode | Chemin | Fonction | Auth | Description |
|---|---|---|---|---|
| POST | /register | authController.register | aucune | Crée un compte, hash le mdp, retourne JWT |
| POST | /login | authController.login | aucune | Vérifie mdp bcrypt, retourne JWT + rôle |
| POST | /forgot-password | authController.forgotPassword | aucune | **STUB** — retourne 200 sans rien faire (nodemailer non configuré) |

---

### /api/utilisateurs
> Routes implémentées en inline (pas de controller importé — l'ancien controller est commenté)

| Méthode | Chemin | Auth | Description |
|---|---|---|---|
| GET | / | verifyToken + isAdmin | Liste tous les utilisateurs sans password_hash |
| GET | /mes-interests | verifyToken | Intérêts sportifs de l'utilisateur connecté |
| PUT | /mes-interests | verifyToken | Remplace les préférences sportives (deleteMany + insertMany) |
| GET | /:id | verifyToken + isAdmin | Détail d'un utilisateur (admin) |
| PUT | /:id/role | verifyToken + isAdmin | Change le rôle (user/admin/organisateur). Bloqué si automodification |
| DELETE | /:id | verifyToken + isAdmin | Supprime l'utilisateur. Ne supprime PAS ses participations (TODO) |
| PUT | /profil | verifyToken | Modifie prénom, nom, téléphone, photo, langue |
| PUT | /mot-de-passe | verifyToken | Change le mdp après vérification de l'ancien |
| POST | /upload-photo | verifyToken | Upload photo profil vers Cloudinary (base64) |

---

### /api/evenements
| Méthode | Chemin | Fonction | Auth | Description |
|---|---|---|---|---|
| GET | / | getEvenements | aucune | Événements publiés (public) |
| GET | /all | getTousEvenements | verifyToken + isAdmin | Tous statuts |
| GET | /mes-evenements | getMesEvenements | verifyToken | Événements créés par moi |
| GET | /suggestions | getSuggestions | verifyToken | Top 5 par score IA |
| GET | /:id | getEvenement | aucune | Détail d'un événement |
| POST | / | creerEvenement | verifyToken | Crée un événement. user→brouillon, admin/orga→peut publier. Vérifie chevauchement créateur + conflit de lieu |
| PUT | /:id | modifierEvenement | verifyToken | user→modification soumise en attente. admin/orga→appliquée directement |
| DELETE | /:id | supprimerEvenement | verifyToken | user→ses brouillons. admin→tout |
| POST | /:id/qr-scan | qrScan | verifyToken | Confirme présence par token QR de l'événement |
| POST | /:id/noter | noterEvenement | verifyToken | Note 1–5 + commentaire (doit avoir is_present:true) |
| POST | /:id/annuler | annulerEvenement | verifyToken | user→demande annulation. admin/orga→direct |
| POST | /:id/approuver-modification | approuverModification | verifyToken + isOrganisateur | Applique modification_proposee |
| POST | /:id/refuser-modification | refuserModification | verifyToken + isOrganisateur | Vide modification_proposee, notifie créateur |
| POST | /:id/approuver-annulation | approuverAnnulation | verifyToken + isOrganisateur | Passe en 'annulé', notifie participants |
| POST | /:id/refuser-annulation | refuserAnnulation | verifyToken + isOrganisateur | Refuse la demande, notifie créateur |

---

### /api/participations
| Méthode | Chemin | Auth | Description |
|---|---|---|---|
| GET | /mes-inscriptions | verifyToken | Liste inscriptions avec détail événement et qr_token personnel |
| POST | /:eventId/inscription | verifyToken | Inscription. Vérifie places, doublon, chevauchement horaire. Génère qr_token unique |
| GET | /evenement/:eventId | verifyToken | Liste des participants d'un événement |
| DELETE | /:eventId/annuler | verifyToken | Annule inscription. Bloqué si < 24h avant l'event |
| POST | /marquer-present/:id | verifyToken | Marquage manuel (créateur ou admin). Sans contrainte horaire |
| POST | /valider-presence | verifyToken + isOrganisateur | Scan QR participant. Fenêtre horaire stricte. Met à jour points, fiabilité, interests, vouchers, StatistiquePresence, Notification |
| POST | /message-absents/:eventId | verifyToken + isOrganisateur | Envoie notification encouragement à tous les is_present:false après fin de l'event |

---

### /api/connexions
| Méthode | Chemin | Auth | Description |
|---|---|---|---|
| GET | /participants/:eventId | verifyToken | Liste participants avec statut connexion (like/partenaire) pour chacun |
| POST | /like | verifyToken | Toggle like (crée ou supprime). Score social du receveur +1/-1 |
| POST | /partenaire | verifyToken | Envoie demande partenariat (statut:'en_attente') |
| PUT | /partenaire/:id | verifyToken | Accepte ou refuse. Si accepté : score_social +2 pour les deux |
| POST | /noter-collaboration | verifyToken | Note la collaboration 1–5 sur une connexion acceptée |
| GET | /mes-connexions | verifyToken | Retourne demandes_recues, partenaires, likes_donnes, likes_recus |

---

### /api/categories et /api/locations
Même pattern pour les deux :

| Méthode | Auth | Description |
|---|---|---|
| GET / | public (categories) / verifyToken (locations) | Liste des éléments actifs |
| POST /suggerer | verifyToken | Soumet suggestion en statut 'en_attente', notifie admins/orgas |
| GET /suggestions | verifyToken + isOrganisateur | Liste des suggestions en attente |
| PUT /:id/valider | verifyToken + isOrganisateur | Passe en 'active', notifie suggéreur |
| PUT /:id/refuser | verifyToken + isOrganisateur | Passe en 'refusee', notifie suggéreur avec raison optionnelle |
| POST / | verifyToken + isOrganisateur | Crée directement (locations uniquement) |
| DELETE /:id | verifyToken + isAdmin | Supprime (locations : bloqué si des événements utilisent encore ce lieu) |

---

### /api/medias
| Méthode | Chemin | Auth | Description |
|---|---|---|---|
| GET | /galerie | verifyToken | Photos/vidéos approuvées de tous les événements |
| GET | /moderation | verifyToken + isAdmin | Médias en attente ou signalés |
| POST | /upload | verifyToken | Upload via Multer → mémoire → stream Cloudinary. Max 5Mo image, 100Mo vidéo |
| GET | /evenement/:id | verifyToken | Médias d'un événement (approuvés pour users, tout pour orga/admin) |
| GET | /profil/:userId | verifyToken | Dernière photo_profil approuvée d'un user |
| PUT | /:id/valider | verifyToken + isOrganisateur | Approuve ou refuse un média |
| POST | /:id/signaler | verifyToken | Signale un média. Après 3 signalements → statut 'en_attente' |
| DELETE | /:id | verifyToken | Owner/admin/orga-du-event peuvent supprimer. Supprime aussi de Cloudinary |

---

### /api/equipes
| Méthode | Chemin | Auth | Description |
|---|---|---|---|
| GET | /evenement/:id | verifyToken | Équipes d'un événement avec membres populés |
| GET | /suggestions/:id | verifyToken + isOrganisateur | Suggestion IA (iaEquipeService) — ne sauvegarde rien |
| POST | /manuelle | verifyToken + isOrganisateur | Crée une équipe en base directement |
| POST | /automatique | verifyToken + isOrganisateur | Algorithme inline (connexions event-scoped). Retourne suggestion sans sauvegarder |
| POST | /valider-lot | verifyToken + isOrganisateur | Sauvegarde toutes les équipes + notifie chaque membre |
| PUT | /:id | verifyToken + isOrganisateur | Modifie une équipe |
| POST | /:id/valider | verifyToken + isOrganisateur | Passe statut en 'validee' |
| DELETE | /:id/membre/:userId | verifyToken + isOrganisateur | Retire un membre |

---

### /api/recompenses
| Méthode | Chemin | Auth | Description |
|---|---|---|---|
| GET | /mes-coupons | verifyToken | Coupons de l'utilisateur connecté via Appartenir |
| GET | /regles | verifyToken + isAdmin | Liste toutes les règles de récompense |
| POST | /regles | verifyToken + isAdmin | Crée une règle |
| PUT | /regles/:id | verifyToken + isAdmin | Modifie une règle |
| PATCH | /regles/:id/statut | verifyToken + isAdmin | Toggle est_active |

---

### /api/notifications
| Méthode | Auth | Description |
|---|---|---|
| GET / | verifyToken | 30 dernières notifications de l'utilisateur |
| PUT /:id/lu | verifyToken | Marque une notification comme lue |
| PUT /tout-lire | verifyToken | Marque toutes comme lues |
| DELETE /:id | verifyToken | Supprime une notification |
| POST /reactivation | verifyToken + isAdmin | Envoie notification 'absence_evenement' à une liste de userIds |

---

### /api/stats
| Méthode | Chemin | Auth | Description |
|---|---|---|---|
| GET | /admin | verifyToken + isAdmin | KPI globaux. Résultat mis en cache mémoire 10 minutes |
| GET | /organisateur | verifyToken + isOrganisateur | Stats limitées aux événements de l'orga connecté |
| GET | /utilisateur | verifyToken | Stats personnelles (points, niveau, fiabilité, inscriptions) |

---

## 4. LOGIQUE MÉTIER CRITIQUE

### 4.1 Système d'authentification — flux complet

```
[Frontend]               [Backend]                [MongoDB]
   │                        │                         │
   ├─ POST /api/auth/login ─►                         │
   │   { email, password }  │                         │
   │                        ├─ findOne({ email }) ───►│
   │                        │◄── utilisateur doc ─────┤
   │                        │                         │
   │                        ├─ comparePassword()       │
   │                        │  (bcrypt.compare)        │
   │                        │                         │
   │                        ├─ jwt.sign({ id }, SECRET, { expiresIn:'7d' })
   │◄── { token, role } ────┤                         │
   │                        │                         │
   ├─ localStorage.setItem('event_token', token)       │
   │                        │                         │
   ├─ Requêtes suivantes :  │                         │
   │  Authorization: Bearer <token>                    │
   │                        │                         │
   │              [verifyToken middleware]              │
   │                        ├─ jwt.verify(token, SECRET)
   │                        ├─ findById(decoded.id).select('-password_hash')
   │                        ├─ req.utilisateur = utilisateur
   │                        ├─ next()                  │
```

**Fichiers concernés :**
- `backend/controllers/authController.js` — register, login
- `backend/middleware/auth.js` — verifyToken, isAdmin, isOrganisateur
- `backend/models/Utilisateur.js` — hook bcrypt, comparePassword()
- `frontend/src/api.js` — intercepteur Axios (ajoute Bearer, gère 401)

**Points clés à connaître :**
- Le `role` n'est jamais accepté depuis `req.body` à l'inscription (forcé à `'user'`)
- `password_hash` a `select:false` → il faut `.select('+password_hash')` explicitement pour le lire
- Token expiré → 401 → api.js intercepteur → déconnexion automatique + redirect `/login`

---

### 4.2 Algorithme de recommandation d'événements

**Fichier :** `backend/services/iaSuggestionService.js`  
**Appelé par :** `evenementController.getSuggestions` → `GET /api/evenements/suggestions`

```
score_total = (affinite_categorie × 0.35)
            + (presence_sociale   × 0.30)
            + (reputation_event   × 0.20)
            + (fiabilite_org      × 0.15)
```

| Paramètre | Source | Calcul | Valeur neutre |
|---|---|---|---|
| affinite_categorie | Collection `interests` (nb_participations par catégorie) | max(nb_part_catégorie_i / total_participations) | 0.5 si 0 participations |
| presence_sociale | Collections `connexion` + `participations` | nb_partenaires_inscrits / nb_partenaires_total | 0 si aucun partenaire |
| reputation_event | Collection `reviews` (note 0–5) | moyenne(notes) / 5 | 0.5 si aucun avis |
| fiabilite_org | `Utilisateur.reliabilite_score` (0–100) du créateur | score / 100 | 0.7 si champ absent |

**Étapes :**
1. Charger tous les events publiés à venir (max 100)
2. Exclure ceux où l'utilisateur est déjà inscrit
3. Charger le profil sportif (interests) et les connexions acceptées de l'utilisateur
4. Calculer les 4 paramètres pour chaque event candidat
5. Trier par score décroissant, retourner les 5 premiers

---

### 4.3 Algorithme de formation d'équipes (IA)

**Fichier :** `backend/services/iaEquipeService.js`  
**Appelé par :** `GET /api/equipes/suggestions/:eventId`

```
score_affinite(A, B) = (partenariat_accepte × 0.40)
                     + (likes_mutuels       × 0.20)
                     + (note_collaboration  × 0.25)
                     + (meme_niveau         × 0.15)
```

**Règle d'exclusion stricte :** si `type=partenaire, statut=refuse` entre A et B → score `-Infinity` → jamais dans la même équipe.

**Algorithme glouton :**
1. Trouver la paire avec le score d'affinité maximal → noyau de l'équipe
2. Ajouter itérativement le participant dont le score moyen avec les membres actuels est le plus élevé
3. Répéter jusqu'à taille atteinte, puis recommencer avec les participants restants
4. Utilise les connexions ALL-TIME (pas uniquement celles de l'événement courant)
5. Ne sauvegarde rien — retourne une proposition à valider manuellement

**Note :** La route `POST /api/equipes/automatique` implémente un algorithme simplifié séparé (connexions event-scoped seulement). Les deux coexistent.

---

### 4.4 Score de fiabilité utilisateur

**Fichier :** `backend/services/iaFiabiliteService.js`  
**Appelé par :** `qrScan` dans evenementController + `valider-presence` dans participations.js

```
reliabilite_score = (nb_presences / nb_inscriptions) × 100
```

- 0 inscriptions → 100 (non pénalisé)
- Recompté depuis zéro à chaque scan (pas d'incrément cumulatif, pour éviter la dérive)
- Stocké dans `Utilisateur.reliabilite_score` (0–100)
- Utilisé comme `fiabilite_org` dans l'algorithme de suggestion

---

### 4.5 Détection de conflits

**Deux vérifications distinctes dans `creerEvenement` :**

**1. Conflit utilisateur** (`backend/utils/chevauchement.js`) :
- Vérifie si le CRÉATEUR a lui-même un autre événement (créé ou en participation) sur le même créneau
- Durée par défaut si `ev_end_time` absent : 2h (cohérent avec le cron)
- Appliqué aussi à l'inscription (`POST /participations/:id/inscription`)

**2. Conflit de lieu** (dans `evenementController.creerEvenement`, ajouté) :
- Vérifie si le LIEU est déjà réservé par un autre événement `brouillon` ou `publié`
- Logique : `ev_start_time_existant < fin_nouveau AND ev_end_time_existant > debut_nouveau`
- Si conflit → 409 + création d'une Notification `systeme` pour l'utilisateur

---

### 4.6 Système de récompenses (vouchers)

**Fichier :** `backend/routes/participations.js` (fonction `verifierVouchers`)  
**Déclenché par :** `POST /api/participations/valider-presence` (scan QR)

1. Charge toutes les règles actives (`RegleRecompense.find({ est_active: true })`)
2. Pour chaque règle : vérifie si l'utilisateur a déjà un coupon pour cette règle (`Appartenir.findOne`)
3. Vérifie si seuil heures OU seuil participations atteint
4. Si oui : crée un `Discount` avec code unique `EVENT-XXXXXXXX`, puis un `Appartenir` liant user ↔ coupon ↔ règle
5. Durée validité du coupon : 3 mois (hardcodé — pas lié à `RegleRecompense.duree_validite`)

---

### 4.7 Cron jobs et tâches planifiées

**Fichier :** `backend/server.js`

**Job 1 — Rappels 24h :**
```js
envoyerRappels24h();                              // immédiat au démarrage
setInterval(envoyerRappels24h, 60 * 60 * 1000);  // toutes les heures
```
- Cherche les événements publiés dont `ev_start_time` est entre maintenant+24h et maintenant+25h
- Envoie une notification `'rappel_evenement'` à chaque participant non encore présent
- Anti-doublon : vérifie si la notification existe déjà avant de créer
- Pas d'email — uniquement notification in-app

**Job 2 — Clôture des événements expirés :**  
**Fichier :** `evenementController.terminerEvenementsExpires`
```js
// Appelé par le cron dans server.js (node-cron installé mais setInterval utilisé)
```
- Passe en `'terminé'` les événements publiés dont `ev_end_time < maintenant`
- Si pas de `ev_end_time` : clôture si `ev_start_time + 2h < maintenant`
- Pas de notification aux participants à la clôture

---

### 4.8 Système de modération des médias

**Fichier :** `backend/routes/medias.js`

- Photo profil et médias officiels : auto-approuvés (hook `pre('save')` dans Media.js)
- Photo/vidéo d'événement : statut `'en_attente'` → orga/admin doit valider
- Signalement : 3 signalements → statut repart en `'en_attente'` pour modération
- Upload via `multer.memoryStorage()` → buffer en mémoire → stream vers Cloudinary

---

## 5. COMPOSANTS FRONTEND PRINCIPAUX

| Composant | Fichier | Rôle | APIs consommées |
|---|---|---|---|
| DashboardUser | `pages/dashboards/DashboardUser.jsx` | Interface principale user : mes événements, inscriptions, récompenses, connexions, profil | /evenements, /participations/mes-inscriptions, /recompenses/mes-coupons, /connexions/mes-connexions, /notifications, /stats/utilisateur |
| DashboardAdmin | `pages/dashboards/DashboardAdmin.jsx` | Interface admin : utilisateurs, événements, catégories, lieux, médias, connexions, statistiques | Tous les endpoints /api/* |
| DashboardOrganisateur | `pages/dashboards/DashboardOrganisateur.jsx` | Interface orga : mes événements, participants, équipes, médias, connexions | /evenements, /participations, /equipes, /medias, /connexions, /stats/organisateur |
| ProtectedRoute | `components/ProtectedRoute.jsx` | Garde les routes : lit `event_user` dans localStorage, vérifie le rôle | — (localStorage uniquement) |
| RecompensesModal | `components/RecompensesModal.jsx` | CRUD des règles de récompenses (admin) | /recompenses/regles |
| api.js | `api.js` | Instance Axios centralisée : ajoute JWT à chaque requête, redirige vers /login sur 401 | — |
| LanguageContext | `context/LanguageContext.jsx` | Fournit `t()` pour les traductions (fr/en/ar/ar-tn) | — |
| ThemeContext | `context/ThemeContext.jsx` | Fournit toggle thème clair/sombre (CSS custom properties) | — |
| NotificationBell | `components/dashboard/NotificationBell.jsx` | Cloche avec badge non-lues, polling des notifications | /notifications |

**Pattern commun des dashboards :**
- Un état `ongletActif` contrôle quelle section est affichée
- `Promise.allSettled([...])` charge toutes les données en parallèle au montage
- Chaque onglet est du JSX inline (pas de composant séparé)
- Notification flash locale (useState) pour les retours d'action

---

## 6. DÉPENDANCES CLÉS

### Backend
| Package | Version | Rôle dans le projet |
|---|---|---|
| express | 4.18.2 | Framework HTTP — routing, middlewares, gestion des erreurs |
| mongoose | 8.0.0 | ODM MongoDB — schémas, validation, hooks pre/post, ObjectId refs |
| jsonwebtoken | 9.0.2 | Génère et vérifie les tokens JWT (expiresIn:'7d', secret depuis .env) |
| bcryptjs | 2.4.3 | Hash des mots de passe (12 rounds) dans le hook pre('save') de Utilisateur |
| cloudinary | 2.10.0 | Stockage des photos et vidéos uploadées par les utilisateurs |
| multer | 2.1.1 | Parse les requêtes multipart/form-data (upload de fichiers). Mode mémoire |
| dotenv | 16.3.1 | Charge MONGO_URI, JWT_SECRET, CLOUDINARY_* depuis .env |
| cors | 2.8.5 | Autorise les requêtes cross-origin (localhost:5173 en dev, * en prod) |
| node-cron | 4.2.1 | **Installé mais non utilisé** — les crons sont en `setInterval` |
| jest | 30.4.2 | Tests unitaires (dossier `__tests__`) |
| nodemon | 3.0.2 | Rechargement automatique en développement |

### Frontend
| Package | Version | Rôle dans le projet |
|---|---|---|
| react | 18.3.1 | Framework UI — composants fonctionnels, hooks (useState, useEffect) |
| react-router-dom | 6.20.0 | Routing côté client (BrowserRouter, Routes, Navigate, ProtectedRoute) |
| axios | 1.6.0 | Requêtes HTTP avec intercepteurs pour le JWT et la gestion 401 |
| recharts | 3.8.1 | Graphiques dans les dashboards (statistiques KPI) |
| vite | 5.0.0 | Bundler/dev server — proxy `/api` → `localhost:5000` pour éviter les CORS en dev |

---

## 7. POINTS FAIBLES ET SIMPLIFICATIONS ASSUMÉES

### 7.1 Race conditions (absence de transactions atomiques)

**Inscription à un événement** (`POST /participations/:eventId/inscription`) :
```js
const nbInscrits = await Participation.countDocuments({ evenement: eventId });
if (nbInscrits >= evenement.max_participants) { /* refuser */ }
// ← GAP : entre le count et le create, un autre user peut s'inscrire
const participation = await Participation.create({ ... });
```
Si deux utilisateurs s'inscrivent simultanément à la dernière place, les deux requêtes peuvent passer le check et dépasser `max_participants`. Il n'y a pas de transaction MongoDB ni de `findOneAndUpdate` avec condition atomique.

**Attribution de coupons** (`verifierVouchers`) :
```js
const dejaAttribue = await Appartenir.findOne({ utilisateur, regle });
// ← GAP
await Appartenir.create({ ... });
```
Même problème si deux scans QR arrivent simultanément pour le même utilisateur.

---

### 7.2 Types de notification absents de l'Enum — bugs silencieux

Le modèle `Notification.js` a un Enum strict pour le champ `type`. Plusieurs types utilisés dans le code **ne sont pas dans l'Enum** :

| Type utilisé dans le code | Fichier | Dans l'Enum ? | Conséquence |
|---|---|---|---|
| `'annulation_soumise'` | evenementController.js ligne ~528 | ❌ Non | `insertMany` sans validation → peut réussir (insertMany ne valide pas par défaut) |
| `'annulation_approuvee'` | evenementController.js | ❌ Non | `Notification.create()` → **ValidationError** → le `catch` retourne 500 après avoir déjà annulé l'event |
| `'annulation_refusee'` | evenementController.js | ❌ Non | Idem → 500 après avoir déjà modifié l'event |
| `'absence_evenement'` | routes/notifications.js | ❌ Non | `insertMany` → peut passer sans valider |

**Conséquence concrète :** quand un admin approuve une annulation, la réponse est 500 bien que l'événement soit passé en 'annulé' en base. L'opération est partiellement réussie.

---

### 7.3 Forgot password non implémenté

```js
// authController.js
const forgotPassword = async (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Fonctionnalité à implémenter — nodemailer requis',
  });
};
```
Retourne toujours 200 `success:true` sans rien faire. Le frontend affiche un message de succès trompeur.

---

### 7.4 Suppression utilisateur incomplète

```js
// routes/utilisateurs.js
const utilisateur = await Utilisateur.findByIdAndDelete(req.params.id);
// TODO : Supprimer aussi les participations de cet utilisateur
// (commentaire explicite dans le fichier)
```
La suppression d'un compte laisse des orphelins dans : `Participation`, `Connexion`, `Notification`, `Media`, `Review`, `Interest`, `Appartenir`.

---

### 7.5 Conflit de lieu non vérifié à la modification

La vérification de conflit de lieu n'est appliquée que dans `creerEvenement`. La fonction `modifierEvenement` (qui permet de changer le lieu ou les dates) ne vérifie pas si le nouveau lieu est disponible sur la nouvelle plage horaire.

---

### 7.6 Conflit de lieu ne détecte pas les événements sans date de fin

```js
ev_end_time: { $gt: new Date(ev_start_time) },
```
Un événement existant sans `ev_end_time` (null) ne sera pas détecté comme conflit car `null > date` retourne false en MongoDB.

---

### 7.7 Cache stats en mémoire simple

```js
// routes/stats.js
const cache = { data: null, key: null, ts: 0 };
const CACHE_TTL_MS = 10 * 60 * 1000;
```
- Perdu à chaque redémarrage du serveur
- Non adapté à un déploiement multi-instances (le fichier lui-même mentionne "utiliser Redis")
- Pas de mécanisme d'invalidation sur création/modification d'événement

---

### 7.8 JWT stocké en localStorage (XSS)

```js
// api.js
const token = localStorage.getItem('event_token');
```
`localStorage` est accessible par tout JavaScript de la page → vulnérable aux attaques XSS. Les cookies HttpOnly seraient plus sécurisés mais n'ont pas été implémentés.

---

### 7.9 Upload vidéo entier en mémoire Node.js

```js
// routes/medias.js
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });
```
Les vidéos jusqu'à 100 Mo sont entièrement chargées en RAM avant d'être streamées vers Cloudinary. Plusieurs uploads simultanés peuvent saturer la mémoire.

---

### 7.10 node-cron installé mais non utilisé

`package.json` liste `node-cron: ^4.2.1` comme dépendance, mais `server.js` utilise `setInterval` pour les deux jobs. `node-cron` n'est importé nulle part. La dépendance est inutile.

---

### 7.11 CastError non intercepté sur les IDs invalides

Aucune validation préalable que `:id` est un ObjectId valide. Un appel `GET /api/evenements/abc` fait crasher `findById('abc')` avec un `CastError` qui remonte en 500 au lieu d'un 404 propre.

---

### 7.12 Deux algorithmes d'équipes distincts

- `iaEquipeService.js` (appelé par `GET /equipes/suggestions`) : algorithme complet, connexions ALL-TIME, gestion stricte des exclusions (-Infinity)
- `POST /equipes/automatique` (inline dans routes/equipes.js) : algorithme simplifié, connexions event-scoped seulement, même formule de poids mais logique de regroupement différente

Les deux coexistent et peuvent donner des résultats différents pour le même événement.

---

### 7.13 Validation côté frontend sans équivalent backend

- La validation de la plage horaire dans le formulaire de création d'événement est faite visuellement côté frontend, mais elle est aussi présente dans le backend (validator Mongoose sur `ev_end_time`).
- En revanche, la validation du format des coordonnées GPS (lat/lng) n'est vérifiée que par les contraintes Mongoose (min/max), sans message d'erreur explicite renvoyé au frontend.
- La validation `max_participants >= 1` est uniquement Mongoose-level, sans message personnalisé côté frontend.

---

### 7.14 TODOs explicites dans le code

| Fichier | TODO |
|---|---|
| authController.js | `forgotPassword` : implémenter avec nodemailer |
| utilisateurs.js | Supprimer les participations lors du DELETE utilisateur |
| medias.js | Thumbnail vidéo automatique via Cloudinary (`/so_0`) |
| Evenement.js | Permettre plusieurs lieux pour un même événement |
| Review.js | Forcer la note entière ou demi-entière ; modération automatique |
| Equiper.js | Vérifier que `required_qtity <= Equipment.total_qtite` |
| server.js | Configurer SMTP dans .env pour activer les emails |
