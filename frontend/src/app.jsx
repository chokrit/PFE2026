// ============================================================
// App.jsx
// Emplacement : frontend/src/App.jsx
//
// PROBLÈMES CORRIGÉS :
//   1. LanguageProvider n'enveloppait pas l'app → langues inactives
//   2. Route /dashboard mal configurée → "espace utilisateur" renvoyait
//      vers /login au lieu du dashboard user
//   3. ProtectedRoute bloquait les admins qui cliquaient "espace utilisateur"
//
// STRUCTURE :
//   LanguageProvider (context global des langues)
//   └── BrowserRouter (routing)
//       └── Routes
//           ├── Routes publiques (sans connexion)
//           └── Routes protégées (avec token JWT)
//
// POUR AJOUTER UNE ROUTE :
//   Publique  → <Route path="/ma-route" element={<MaPage />} />
//   Protégée  → <Route path="/ma-route" element={<ProtectedRoute><MaPage /></ProtectedRoute>} />
//   Admin     → <Route path="/ma-route" element={<ProtectedRoute adminOnly><MaPage /></ProtectedRoute>} />
// ============================================================

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// ── Context global des langues ────────────────────────────────
// DOIT envelopper TOUTE l'application — c'est la correction principale
import { LanguageProvider } from './context/LanguageContext';

// ── Composant de protection des routes ───────────────────────
import ProtectedRoute from './components/ProtectedRoute';

// ── Pages publiques ───────────────────────────────────────────
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import AboutOrg from './pages/AboutOrg';
import AboutApp from './pages/AboutApp';
import Location from './pages/Location';
import SplashScreen from './pages/SplashScreen';
import LanguageSelect from './pages/LanguageSelect';

// ── Pages protégées ───────────────────────────────────────────
// REMARQUE : le dossier s'appelle "dashboards" (avec s)
// Adapter le chemin si le dossier change de nom
import DashboardUser from './pages/dashboards/DashboardUser';
import DashboardAdmin from './pages/dashboards/DashboardAdmin';
import DashboardOrganisateur from './pages/dashboards/DashboardOrganisateur';

function App() {
  return (
    // ── CORRECTION CLÉ 1 : LanguageProvider DOIT être ici ──
    // Sans ce wrapper, useLanguage() crash dans tous les composants
    // et le changement de langue n'a aucun effet
    <LanguageProvider>
      <BrowserRouter>
        <Routes>

          {/* ══ ROUTES PUBLIQUES — accessibles sans connexion ══ */}

          {/* Page de démarrage */}
          <Route path="/splash" element={<SplashScreen />} />
          <Route path="/select-language" element={<LanguageSelect />} />

          {/* Authentification */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Pages d'information (accessibles depuis le bas de la page Login) */}
          <Route path="/about-org" element={<AboutOrg />} />
          <Route path="/about-app" element={<AboutApp />} />
          <Route path="/location" element={<Location />} />

          {/* ══ ROUTES PROTÉGÉES — token JWT requis ══ */}

          {/* Dashboard utilisateur normal
              CORRECTION CLÉ 2 : cette route était mal configurée
              → ProtectedRoute sans adminOnly permet aux users ET admins d'accéder
              → L'admin clique "Espace utilisateur" → arrive ici → normal */}
          <Route
            path="/dashboards"
            element={
              <ProtectedRoute>
                <DashboardUser />
              </ProtectedRoute>
            }
          />

          {/* Dashboard administrateur
              CORRECTION CLÉ 3 : adminOnly bloque les users normaux
              → Si un user essaie d'accéder à /admin → redirigé vers /dashboard */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly>
                <DashboardAdmin />
              </ProtectedRoute>
            }
          />

          {/* Dashboard organisateur */}
          <Route
            path="/organisateur"
            element={
              <ProtectedRoute organisateurOnly>
                <DashboardOrganisateur />
              </ProtectedRoute>
            }
          />

          {/* Redirection de la racine */}
          {/* Redirige vers /login si pas connecté, géré par ProtectedRoute */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* 404 — toute route inconnue → login */}
          <Route path="*" element={<Navigate to="/login" replace />} />

        </Routes>
      </BrowserRouter>
    </LanguageProvider>
  );
}

export default App;
