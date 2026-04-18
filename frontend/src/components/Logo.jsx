// ============================================================
// Logo.jsx — Logo SVG de l'application EVENT
// ============================================================

import React from 'react';

/**
 * Logo EVENT avec icône sport
 * @param {number} size - Taille en px (défaut : 80)
 * @param {string} color - Couleur principale (défaut : #00d4ff)
 */
const Logo = ({ size = 80, color = '#00d4ff' }) => {
    return (
        <div className="logo-container" style={{ textAlign: 'center' }}>
            {/* Icône SVG : silhouette coureur dans un cercle */}
            <svg
                width={size}
                height={size}
                viewBox="0 0 100 100"
                xmlns="http://www.w3.org/2000/svg"
                style={{ display: 'block', margin: '0 auto' }}
            >
                {/* Cercle de fond */}
                <circle cx="50" cy="50" r="48" fill="none" stroke={color} strokeWidth="3" />

                {/* Silhouette coureur simplifiée */}
                {/* Tête */}
                <circle cx="62" cy="22" r="7" fill={color} />

                {/* Corps */}
                <line x1="62" y1="29" x2="55" y2="52" stroke={color} strokeWidth="3.5" strokeLinecap="round" />

                {/* Bras gauche (vers l'avant) */}
                <line x1="60" y1="38" x2="45" y2="44" stroke={color} strokeWidth="3" strokeLinecap="round" />

                {/* Bras droit (vers l'arrière) */}
                <line x1="60" y1="38" x2="72" y2="32" stroke={color} strokeWidth="3" strokeLinecap="round" />

                {/* Jambe gauche (vers l'avant) */}
                <line x1="55" y1="52" x2="42" y2="68" stroke={color} strokeWidth="3.5" strokeLinecap="round" />
                <line x1="42" y1="68" x2="35" y2="80" stroke={color} strokeWidth="3" strokeLinecap="round" />

                {/* Jambe droite (vers l'arrière) */}
                <line x1="55" y1="52" x2="65" y2="68" stroke={color} strokeWidth="3.5" strokeLinecap="round" />
                <line x1="65" y1="68" x2="72" y2="78" stroke={color} strokeWidth="3" strokeLinecap="round" />
            </svg>

            {/* Texte EVENT sous l'icône */}
            <span style={{
                display: 'block',
                fontFamily: "'Poppins', sans-serif",
                fontWeight: 900,
                fontSize: `${size * 0.3}px`,
                color: color,
                letterSpacing: '0.15em',
                marginTop: '6px'
            }}>
                EVENT
            </span>
        </div>
    );
};

export default Logo;