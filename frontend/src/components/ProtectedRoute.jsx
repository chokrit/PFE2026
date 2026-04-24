// ============================================================
// ProtectedRoute.jsx
// Emplacement : frontend/src/components/ProtectedRoute.jsx
//
// PROBLÈME CORRIGÉ :
//   L'ancienne version redirigait l'admin vers /login quand il
//   cliquait "Espace utilisateur" car elle vérifiait aussi le rôle
//   sur toutes les routes → les admins ne pouvaient pas accéder à /dashboard
//
// FONCTIONNEMENT CORRIGÉ :
//   - Pas de token → redirige vers /login (pour tout le monde)
//   - adminOnly=true + rôle != admin → redirige vers /dashboard
//   - adminOnly=false (défaut) → laisse passer user ET admin
//     → L'admin peut voir son "Espace utilisateur" (/dashboard)
//
// UTILISATION dans App.jsx :
//   // Route pour tout utilisateur connecté (user ou admin)
//   <Route path="/dashboard" element={
//     <ProtectedRoute>
//       <DashboardUser />
//     </ProtectedRoute>
//   } />
//
//   // Route admin seulement
//   <Route path="/admin" element={
//     <ProtectedRoute adminOnly>
//       <DashboardAdmin />
//     </ProtectedRoute>
//   } />
//
// POUR MODIFIER :
//   Pour ajouter un rôle "moderateur" : ajouter la logique ici
//   Ex: if (modOnly && role !== 'moderateur') navigate('/dashboard')
// ============================================================

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ProtectedRoute = ({ children, adminOnly = false, organisateurOnly = false }) => {
  const navigate = useNavigate();
  const [ok, setOk] = useState(false); // true = autoriser l'affichage

  useEffect(() => {
    const token = localStorage.getItem('event_token');
    const userStr = localStorage.getItem('event_user');

    if (!token) {
      navigate('/login', { replace: true });
      return;
    }

    let user = null;
    try {
      user = JSON.parse(userStr);
    } catch {
      localStorage.removeItem('event_token');
      localStorage.removeItem('event_user');
      navigate('/login', { replace: true });
      return;
    }

    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    if (adminOnly && user.role !== 'admin') {
      navigate('/dashboards', { replace: true });
      return;
    }

    if (organisateurOnly && !['admin', 'organisateur'].includes(user.role)) {
      navigate('/dashboards', { replace: true });
      return;
    }

    setOk(true);

  }, [navigate, adminOnly, organisateurOnly]);

  // Afficher rien pendant la vérification (évite un flash de contenu)
  if (!ok) return null;

  // Afficher le composant enfant (la page protégée)
  return children;
};

export default ProtectedRoute;
