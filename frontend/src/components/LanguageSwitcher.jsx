// ============================================================
// LanguageSwitcher.jsx — Bouton compact pour changer la langue
// Affiché en haut à droite de la page Login et autres pages
// ============================================================

import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

const LanguageSwitcher = () => {
    const { langue, setLangue } = useLanguage();
    const [ouvert, setOuvert] = useState(false);

    // Labels courts pour l'affichage du bouton
    const labelsLangues = {
        'fr': '🇫🇷 FR',
        'en': '🇬🇧 EN',
        'ar': '🌍 AR',
        'ar-tn': '🇹🇳 TN'
    };

    const languesDisponibles = ['fr', 'en', 'ar', 'ar-tn'];

    const handleSelect = (lang) => {
        setLangue(lang);
        setOuvert(false);
    };

    return (
        <div className="language-switcher" style={{ position: 'relative' }}>
            {/* Bouton principal */}
            <button
                className="lang-btn-current"
                onClick={() => setOuvert(!ouvert)}
                aria-label="Changer la langue"
            >
                {labelsLangues[langue]}
                <span style={{ marginLeft: '4px' }}>{ouvert ? '▲' : '▼'}</span>
            </button>

            {/* Dropdown des langues */}
            {ouvert && (
                <div className="lang-dropdown">
                    {languesDisponibles
                        .filter(l => l !== langue)  // Ne pas afficher la langue active
                        .map(lang => (
                            <button
                                key={lang}
                                className="lang-option"
                                onClick={() => handleSelect(lang)}
                            >
                                {labelsLangues[lang]}
                            </button>
                        ))}
                </div>
            )}
        </div>
    );
};

export default LanguageSwitcher;