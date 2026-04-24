// ============================================================
// StatCard.jsx — Carte de statistique réutilisable
// Utilisée dans tous les dashboards pour afficher les KPIs
//
// Props :
//   label   : string  — libellé de la métrique
//   value   : string|number — valeur affichée
//   icon    : string  — emoji ou caractère icône
//   color   : string  — couleur CSS de l'accent
//   trend   : { value: string, direction: 'up'|'down' } — optionnel
//   onClick : function — optionnel, rend la carte cliquable
// ============================================================

import React from 'react';

const StatCard = ({ label, value, icon, color = '#00d4ff', trend, onClick }) => {
  return (
    <div
      className={`stat-card ${onClick ? 'stat-card--clickable' : ''}`}
      onClick={onClick}
      style={{ '--stat-color': color }}
    >
      {/* Icône */}
      <div className="stat-card__icon">{icon}</div>

      {/* Valeur principale */}
      <div className="stat-card__value" style={{ color }}>
        {value}
      </div>

      {/* Label */}
      <div className="stat-card__label">{label}</div>

      {/* Tendance (optionnelle) */}
      {trend && (
        <div className={`stat-card__trend stat-card__trend--${trend.direction}`}>
          {trend.direction === 'up' ? '↑' : '↓'} {trend.value}
        </div>
      )}

      {/* Indicateur visuel si cliquable */}
      {onClick && <div className="stat-card__arrow">→</div>}
    </div>
  );
};

export default StatCard;
