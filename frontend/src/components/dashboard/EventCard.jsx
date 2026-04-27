// ============================================================
// EventCard.jsx — Carte d'affichage d'un événement sportif
//
// Deux modes :
//   'inscrit'  — événement auquel l'utilisateur est déjà inscrit
//                → bouton "Voir QR code" pour scan présence
//   'explorer' — événement disponible à l'inscription
//                → bouton "S'inscrire"
//
// Props :
//   event        : object — données de l'événement
//   mode         : 'inscrit' | 'explorer'
//   onVoirQR     : function — callback afficher QR (mode inscrit)
//   onSInscrire  : function — callback inscription (mode explorer)
// ============================================================

import React from 'react';

const EventCard = ({ event, mode, onVoirQR, onSInscrire, onAnnuler }) => {
  // ── Formatage de la date ──
  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatHeure = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  // ── Calcul du taux de remplissage ──
  const tauxRemplissage = event.max_participants > 0
    ? Math.round((event.nb_inscrits / event.max_participants) * 100)
    : 0;

  const estComplet = event.nb_inscrits >= event.max_participants;

  // ── Couleur de la catégorie ──
  const categorieColor = {
    'Football': '#00d4ff',
    'Natation': '#0088cc',
    'Course': '#00e676',
    'Basketball': '#ff6b00',
    'Yoga': '#9c27b0',
    'Bien-être': '#9c27b0',
  }[event.categorie] || '#888';

  return (
    <div className={`event-card ${mode === 'inscrit' && event.is_present ? 'event-card--present' : ''}`}>

      {/* Badge catégorie */}
      <div
        className="event-card__category"
        style={{ background: categorieColor + '22', color: categorieColor }}
      >
        {event.categorie}
      </div>

      {/* Badge présence (mode inscrit) */}
      {mode === 'inscrit' && (
        <div className={`event-card__presence ${event.is_present ? 'present' : 'absent'}`}>
          {event.is_present ? '✓ Présence confirmée' : '⏳ En attente de scan'}
        </div>
      )}

      {/* Titre */}
      <h3 className="event-card__title">{event.titre || event.title_event}</h3>

      {/* Informations */}
      <div className="event-card__info">
        <div className="event-card__info-row">
          <span className="event-card__info-icon">📅</span>
          <span>{formatDate(event.date || event.ev_start_time)} à {formatHeure(event.date || event.ev_start_time)}</span>
        </div>
        <div className="event-card__info-row">
          <span className="event-card__info-icon">📍</span>
          <span>{event.lieu}</span>
        </div>
      </div>

      {/* Description (mode explorer) */}
      {mode === 'explorer' && event.description && (
        <p className="event-card__desc">{event.description}</p>
      )}

      {/* Barre de places */}
      <div className="event-card__places">
        <div className="event-card__places-bar">
          <div
            className="event-card__places-fill"
            style={{
              width: `${tauxRemplissage}%`,
              background: estComplet ? '#ff4d6d' : (tauxRemplissage > 80 ? '#ff6b00' : '#00e676')
            }}
          />
        </div>
        <span className="event-card__places-text">
          {event.nb_inscrits}/{event.max_participants} places
          {estComplet && <span className="event-card__complet"> — Complet</span>}
        </span>
      </div>

      {/* Actions */}
      <div className="event-card__actions">
        {mode === 'inscrit' && (
          <>
            <button
              className="dash-btn-primary event-card__btn"
              onClick={onVoirQR}
              disabled={event.stat_event === 'annulé'}
            >
              📱 Mon QR code
            </button>
            {!event.is_present && event.stat_event !== 'terminé' && event.stat_event !== 'annulé' && (
              <button
                onClick={onAnnuler}
                style={{
                  padding: '6px 12px', background: 'transparent', color: '#ff4d6d',
                  border: '1px solid rgba(255,77,109,.3)', borderRadius: '6px',
                  fontSize: '12px', cursor: 'pointer', fontFamily: 'Poppins,sans-serif',
                }}
              >
                Annuler
              </button>
            )}
          </>
        )}

        {mode === 'explorer' && (
          <button
            className="dash-btn-primary event-card__btn"
            onClick={onSInscrire}
            disabled={estComplet}
            title={estComplet ? 'Événement complet' : "S'inscrire à cet événement"}
          >
            {estComplet ? 'Complet' : "S'inscrire →"}
          </button>
        )}
      </div>
    </div>
  );
};

export default EventCard;
