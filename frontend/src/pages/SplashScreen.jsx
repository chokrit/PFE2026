// ============================================================
// SplashScreen.jsx — Page 1 : Écran de démarrage animé
// Durée : 3 secondes puis redirection vers /select-language
// ============================================================

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SportAnimation from '../components/SportAnimation';
import '../styles/splash.css';

const SplashScreen = () => {
    const navigate = useNavigate();

    // ── Redirection automatique après 3 secondes ──
    useEffect(() => {
        const timer = setTimeout(() => {
            // Aller vers la sélection de langue
            navigate('/select-language');
        }, 3000); // 3000ms = 3 secondes

        // Nettoyage : annuler le timer si le composant est démonté avant la fin
        return () => clearTimeout(timer);
    }, [navigate]);

    return (
        <div className="splash-screen">
            {/* Fond sombre "eventFont" */}
            <div className="splash-background">

                {/* Effet de particules en fond (CSS pur) */}
                <div className="particles">
                    {/* Les particules sont créées en CSS avec ::before et ::after */}
                </div>

                {/* Conteneur centré */}
                <div className="splash-content">

                    {/* Animation des silhouettes sportives */}
                    <SportAnimation />

                    {/* Titre principal */}
                    <h1 className="splash-title">
                        <span className="title-e">E</span>
                        <span className="title-v">V</span>
                        <span className="title-e2">E</span>
                        <span className="title-n">N</span>
                        <span className="title-t">T</span>
                    </h1>

                    {/* Tagline */}
                    <p className="splash-tagline">Plateforme Sportive</p>

                    {/* Indicateur de chargement */}
                    <div className="splash-loader">
                        <div className="loader-bar"></div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default SplashScreen;