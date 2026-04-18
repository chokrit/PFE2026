// ============================================================
// LanguageSelect.jsx — Page 2 : Sélection de la langue
// ============================================================

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import Logo from '../components/Logo';

const LanguageSelect = () => {
    const navigate = useNavigate();
    const { setLangue } = useLanguage();

    // ── Langues disponibles avec leur affichage ──
    const langues = [
        {
            code: 'ar-tn',
            label: '🇹🇳 عربى تونسي',
            sublabel: 'Arabe Tunisien',
            dir: 'rtl'
        },
        {
            code: 'ar',
            label: 'عربى',
            sublabel: 'Arabe Standard',
            dir: 'rtl'
        },
        {
            code: 'en',
            label: 'English',
            sublabel: 'Anglais',
            dir: 'ltr'
        },
        {
            code: 'fr',
            label: 'Français',
            sublabel: 'Français',
            dir: 'ltr'
        }
    ];

    /**
     * Sélectionner une langue et naviguer vers le login
     * @param {string} code - Code de la langue choisie
     */
    const handleSelectLangue = (code) => {
        // Sauvegarder dans le Context global + localStorage
        setLangue(code);
        // Naviguer vers la page de connexion
        navigate('/login');
    };

    return (
        <div className="lang-select-page">
            <div className="lang-select-container">

                {/* Logo en haut */}
                <div className="lang-logo-wrapper">
                    <Logo size={80} color="#00d4ff" />
                </div>

                {/* Titre multilingue */}
                <h2 className="lang-select-title">
                    Choisissez votre langue<br />
                    <span style={{ fontSize: '0.85em', opacity: 0.8 }}>
                        Choose your language
                    </span><br />
                    <span style={{ fontSize: '0.85em', opacity: 0.8, direction: 'rtl', display: 'block' }}>
                        اختر لغتك
                    </span>
                </h2>

                {/* Boutons de sélection de langue */}
                <div className="lang-buttons-grid">
                    {langues.map((lang) => (
                        <button
                            key={lang.code}
                            className="lang-select-btn"
                            onClick={() => handleSelectLangue(lang.code)}
                            dir={lang.dir}  // Direction du texte
                        >
                            <span className="lang-main-label">{lang.label}</span>
                            <span className="lang-sub-label">{lang.sublabel}</span>
                        </button>
                    ))}
                </div>

            </div>
        </div>
    );
};

export default LanguageSelect;