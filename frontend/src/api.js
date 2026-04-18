// frontend/src/api.js
// Instance axios avec token automatique sur toutes les requêtes

import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
});

// Intercepteur : ajoute le JWT à chaque requête automatiquement
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('event_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Intercepteur : si 401 reçu → déconnecter et rediriger
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('event_token');
            localStorage.removeItem('event_user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;