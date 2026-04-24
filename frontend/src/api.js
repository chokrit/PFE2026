// ============================================================
// api.js
// Emplacement : frontend/src/api.js
//
// Instance Axios centralisée :
//   - Ajoute automatiquement le JWT à chaque requête
//   - Redirige vers /login si token expiré (401)
//   - Base URL = /api (proxy Vite → localhost:5000)
// ============================================================

import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000, // 10 secondes max
});

// Intercepteur requête : ajouter le token JWT automatiquement
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('event_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercepteur réponse : gérer les erreurs globalement
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Si 401 : token expiré ou invalide → déconnecter
    if (error.response?.status === 401) {
      localStorage.removeItem('event_token');
      localStorage.removeItem('event_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
