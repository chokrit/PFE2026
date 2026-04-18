// ============================================================
// Dashboard.jsx — Page principale après connexion
// ⚠️ TODO : Cette page est un PLACEHOLDER
// ============================================================

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

const Dashboard = () => {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const [utilisateur, setUtilisateur] = useState(null);

    // Vérifier si l'utilisateur est connecté
    useEffect(() => {
        const token = localStorage.getItem('event_token');
        const user = localStorage.getItem('event_user');

        if (!token) {
            // Pas de token → rediriger vers login
            navigate('/login');
            return;
        }

        if (user) {
            setUtilisateur(JSON.parse(user));
        }
    }, [navigate]);

    // ============================================================
    // TODO: IMPLÉMENTER LE DASHBOARD
    // ============================================================
    //
    // SECTIONS À CRÉER :
    // 1. Header avec nom de l'utilisateur + avatar + bouton déconnexion

    // 2. Résumé du profil :
    //    - Points cumulés, heures de participation
    //    - Score de fiabilité (barre de progression)
    //    - Coupons disponibles
    //
    // 3. Événements à venir (liste des prochains events)
    //    - Appel : GET /api/evenements
    //    - Filtre par catégories d'intérêt de l'utilisateur
    //
    // 4. Mes inscriptions
    //    - Events auxquels l'utilisateur est inscrit
    //    - Avec QR code pour chaque event (à scanner sur place)
    //
    // 5. Si rôle === 'admin' : panneau d'administration
    //    - Créer/gérer des événements
    //    - Gérer les utilisateurs
    //    - Voir les statistiques
    //
    // COMPOSANTS À CRÉER :
    // - EventCard.jsx      : Carte d'un événement
    // - ProfileWidget.jsx  : Résumé du profil
    // - QRCodeWidget.jsx   : Affichage QR code (npm install qrcode.react)
    // - AdminPanel.jsx     : Panneau admin conditionnel
    //
    // PACKAGES NÉCESSAIRES :
    // npm install qrcode.react  (génération QR code côté frontend)
    // ============================================================

    const handleLogout = () => {
        // Supprimer le token et les infos utilisateur
        localStorage.removeItem('event_token');
        localStorage.removeItem('event_user');
        navigate('/login');
    };

    return (
        <div className="page-placeholder">
            <div className="placeholder-container">
                <h1 className="placeholder-title">
                    🏠 Dashboard
                </h1>

                {utilisateur && (
                    <p style={{ color: '#00d4ff', marginBottom: '20px' }}>
                        Bonjour, {utilisateur.first_name} {utilisateur.last_name} !
                    </p>
                )}

                <div className="placeholder-notice">
                    <p>🚧 Dashboard en construction</p>
                    <p style={{ fontSize: '0.85em', opacity: 0.7 }}>
                        Liste des événements, profil, points, QR codes...
                    </p>
                </div>

                <button onClick={handleLogout} className="btn-login" style={{ marginTop: '20px' }}>
                    🚪 Se déconnecter
                </button>
            </div>
        </div>
    );
};

export default Dashboard;