// ============================================================
// SportAnimation.jsx — Animation des silhouettes de sportifs
// Inspirée du logo React (orbes tournantes)
// ============================================================

import React from 'react';

/**
 * Animation centrale du Splash Screen
 * 4 silhouettes SVG qui tournent autour d'un centre
 * + effet pulsation CSS
 */
const SportAnimation = () => {
    return (
        <div className="sport-animation">
            {/* Conteneur principal de l'animation */}
            <div className="orbit-container">

                {/* ── Orbite 1 : Coureur ── */}
                <div className="orbit orbit-1">
                    <div className="silhouette silhouette-runner">
                        <svg viewBox="0 0 50 50" width="40" height="40" xmlns="http://www.w3.org/2000/svg">
                            {/* Tête */}
                            <circle cx="32" cy="10" r="5" fill="#00d4ff" />
                            {/* Corps */}
                            <line x1="32" y1="15" x2="26" y2="30" stroke="#00d4ff" strokeWidth="2.5" strokeLinecap="round" />
                            {/* Bras */}
                            <line x1="30" y1="22" x2="20" y2="26" stroke="#00d4ff" strokeWidth="2" strokeLinecap="round" />
                            <line x1="30" y1="22" x2="38" y2="18" stroke="#00d4ff" strokeWidth="2" strokeLinecap="round" />
                            {/* Jambes */}
                            <line x1="26" y1="30" x2="18" y2="42" stroke="#00d4ff" strokeWidth="2.5" strokeLinecap="round" />
                            <line x1="26" y1="30" x2="34" y2="42" stroke="#00d4ff" strokeWidth="2.5" strokeLinecap="round" />
                        </svg>
                    </div>
                </div>

                {/* ── Orbite 2 : Footballeur ── */}
                <div className="orbit orbit-2">
                    <div className="silhouette silhouette-football">
                        <svg viewBox="0 0 50 50" width="40" height="40" xmlns="http://www.w3.org/2000/svg">
                            {/* Tête */}
                            <circle cx="25" cy="8" r="5" fill="#ff6b00" />
                            {/* Corps */}
                            <line x1="25" y1="13" x2="25" y2="30" stroke="#ff6b00" strokeWidth="2.5" strokeLinecap="round" />
                            {/* Bras levés */}
                            <line x1="25" y1="18" x2="14" y2="14" stroke="#ff6b00" strokeWidth="2" strokeLinecap="round" />
                            <line x1="25" y1="18" x2="36" y2="14" stroke="#ff6b00" strokeWidth="2" strokeLinecap="round" />
                            {/* Jambe en train de tirer */}
                            <line x1="25" y1="30" x2="18" y2="42" stroke="#ff6b00" strokeWidth="2.5" strokeLinecap="round" />
                            <line x1="25" y1="30" x2="36" y2="38" stroke="#ff6b00" strokeWidth="2.5" strokeLinecap="round" />
                            <line x1="36" y1="38" x2="44" y2="32" stroke="#ff6b00" strokeWidth="2" strokeLinecap="round" />
                            {/* Ballon */}
                            <circle cx="46" cy="30" r="4" fill="none" stroke="#ff6b00" strokeWidth="2" />
                        </svg>
                    </div>
                </div>

                {/* ── Orbite 3 : Nageur ── */}
                <div className="orbit orbit-3">
                    <div className="silhouette silhouette-swimmer">
                        <svg viewBox="0 0 50 50" width="40" height="40" xmlns="http://www.w3.org/2000/svg">
                            {/* Tête */}
                            <circle cx="10" cy="25" r="5" fill="#00d4ff" />
                            {/* Corps horizontal */}
                            <line x1="15" y1="25" x2="40" y2="25" stroke="#00d4ff" strokeWidth="2.5" strokeLinecap="round" />
                            {/* Bras en brasse */}
                            <line x1="25" y1="25" x2="20" y2="15" stroke="#00d4ff" strokeWidth="2" strokeLinecap="round" />
                            <line x1="25" y1="25" x2="30" y2="15" stroke="#00d4ff" strokeWidth="2" strokeLinecap="round" />
                            {/* Jambes en battement */}
                            <line x1="38" y1="25" x2="44" y2="18" stroke="#00d4ff" strokeWidth="2" strokeLinecap="round" />
                            <line x1="38" y1="25" x2="44" y2="32" stroke="#00d4ff" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </div>
                </div>

                {/* ── Orbite 4 : Cycliste ── */}
                <div className="orbit orbit-4">
                    <div className="silhouette silhouette-cyclist">
                        <svg viewBox="0 0 50 50" width="40" height="40" xmlns="http://www.w3.org/2000/svg">
                            {/* Tête */}
                            <circle cx="30" cy="12" r="5" fill="#ff6b00" />
                            {/* Corps penché */}
                            <line x1="30" y1="17" x2="20" y2="28" stroke="#ff6b00" strokeWidth="2.5" strokeLinecap="round" />
                            {/* Bras sur guidon */}
                            <line x1="25" y1="22" x2="14" y2="26" stroke="#ff6b00" strokeWidth="2" strokeLinecap="round" />
                            {/* Roue avant */}
                            <circle cx="12" cy="36" r="8" fill="none" stroke="#ff6b00" strokeWidth="2" />
                            {/* Roue arrière */}
                            <circle cx="36" cy="36" r="8" fill="none" stroke="#ff6b00" strokeWidth="2" />
                            {/* Cadre vélo */}
                            <line x1="20" y1="28" x2="36" y2="36" stroke="#ff6b00" strokeWidth="2" strokeLinecap="round" />
                            <line x1="20" y1="28" x2="12" y2="36" stroke="#ff6b00" strokeWidth="2" strokeLinecap="round" />
                            {/* Pédale */}
                            <line x1="20" y1="28" x2="28" y2="34" stroke="#ff6b00" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </div>
                </div>

                {/* ── Centre : Logo EVENT ── */}
                <div className="center-logo">
                    <span className="center-letter">E</span>
                </div>

            </div>
        </div>
    );
};

export default SportAnimation;