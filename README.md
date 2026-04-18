# EVENT APP — Application de Gestion d'Événements Sportifs

## Stack Technique
- **Frontend** : React.js + Vite + CSS animations
- **Backend** : Node.js + Express.js
- **Base de données** : MongoDB Atlas (Mongoose)
- **Auth** : JWT + bcryptjs
- **Langues** : fr / en  / ar-tn

## Installation

### 1. Cloner le projet
git clone https://github.com/TON_USERNAME/event-app.git
cd event-app

### 2. Installer toutes les dépendances
npm run install-all

### 3. Configurer les variables d'environnement
cp .env.example backend/.env
# Puis éditer backend/.env avec vos vraies valeurs

### 4. Lancer en développement
npm run dev
# Backend : http://localhost:5000
# Frontend : http://localhost:5173

## Structure des dossiers
event-app/
├── backend/       → API Node.js/Express
├── frontend/      → React.js/Vite
└── README.md

## Routes API principales
- POST /api/auth/login
- POST /api/auth/register
- GET  /api/evenements
- ...voir backend/routes/ pour la liste complète

## Comptes par défaut
Aucun compte par défaut. Créer via /register.
Pour un compte admin : modifier manuellement le champ role dans MongoDB.
