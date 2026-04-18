// ============================================================
// ProtectedRoute.jsx — Composant de protection des routes
// Redirige vers /login si non connecté
// Redirige vers /dashboard si rôle insuffisant
//
// Usage dans App.jsx :
//   <Route path="/admin" element={
//     <ProtectedRoute requiredRole="admin">
//       <DashboardAdmin />
//     </ProtectedRoute>
//   } />
// ============================================================

import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * ProtectedRoute
 * @param {React.ReactNode} children     — le composant à protéger
 * @param {string}          requiredRole — 'user' | 'admin' (défaut: 'user')
 */
const ProtectedRoute = ({ children, requiredRole = 'user' }) => {
  // Récupérer le token et l'utilisateur depuis localStorage
  const token = localStorage.getItem('event_token');
  const user  = localStorage.getItem('event_user');

  // Pas de token → rediriger vers login
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Vérifier le rôle si requis
  if (requiredRole === 'admin' && user) {
    const utilisateur = JSON.parse(user);
    if (utilisateur.role !== 'admin') {
      // Utilisateur connecté mais pas admin → son dashboard
      return <Navigate to="/dashboard" replace />;
    }
  }

  // Tout OK → afficher le composant
  return children;
};

export default ProtectedRoute;


// ============================================================
// MISE À JOUR DE App.jsx
// Copier et remplacer le contenu de App.jsx existant
// ============================================================

/*
// App.jsx complet avec toutes les routes et protections :

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import ProtectedRoute from './components/ProtectedRoute';

// Pages publiques
import SplashScreen    from './pages/SplashScreen';
import LanguageSelect  from './pages/LanguageSelect';
import Login           from './pages/Login';
import Register        from './pages/Register';
import ForgotPassword  from './pages/ForgotPassword';
import AboutOrg        from './pages/AboutOrg';
import AboutApp        from './pages/AboutApp';
import Location        from './pages/Location';

// Dashboards (protégés)
import DashboardUser         from './pages/dashboards/DashboardUser';
import DashboardAdmin        from './pages/dashboards/DashboardAdmin';
import DashboardOrganisateur from './pages/dashboards/DashboardOrganisateur';

function App() {
  return (
    <LanguageProvider>
      <Router>
        <Routes>

          // ── Routes publiques ──
          <Route path="/"               element={<SplashScreen />} />
          <Route path="/select-language"element={<LanguageSelect />} />
          <Route path="/login"          element={<Login />} />
          <Route path="/register"       element={<Register />} />
          <Route path="/forgot-password"element={<ForgotPassword />} />
          <Route path="/about-org"      element={<AboutOrg />} />
          <Route path="/about-app"      element={<AboutApp />} />
          <Route path="/location"       element={<Location />} />

          // ── Routes protégées (login requis) ──
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardUser />
            </ProtectedRoute>
          } />

          // ── Routes admin seulement ──
          <Route path="/admin" element={
            <ProtectedRoute requiredRole="admin">
              <DashboardAdmin />
            </ProtectedRoute>
          } />

          <Route path="/organisateur" element={
            <ProtectedRoute requiredRole="admin">
              <DashboardOrganisateur />
            </ProtectedRoute>
          } />

          // ── Toute autre route → splash ──
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </Router>
    </LanguageProvider>
  );
}

export default App;
*/
