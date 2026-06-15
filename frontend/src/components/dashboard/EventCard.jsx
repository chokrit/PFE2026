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
import { fmtDate, fmtHeure } from '../../utils/dates';

const EventCard = ({ event, mode, onVoirQR, onSInscrire, onAnnuler, estInscrit, onSeDesinscrire }) => {
  const formatDate = fmtDate;
  const formatHeure = fmtHeure;

  // ── Calcul du taux de remplissage ──
  const tauxRemplissage = event.max_participants > 0
    ? Math.round((event.nb_inscrits / event.max_participants) * 100)
    : 0;

  const estComplet = event.nb_inscrits >= event.max_participants;

  // ── Vérification du délai d'annulation (24h minimum avant début) ──
  const maintenant = new Date();
  const dateDebut  = new Date(event.ev_start_time || event.date);
  const diffMs     = dateDebut - maintenant;
  const annulationAutorisee = diffMs > 24 * 60 * 60 * 1000;
  const heuresAvantEvenement = Math.max(0, Math.round(diffMs / (1000 * 60 * 60)));
  const msgBlocage = diffMs <= 0
    ? "Événement déjà commencé"
    : `Annulation impossible — débute dans ${heuresAvantEvenement}h (délai min. 24h)`;

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
                onClick={annulationAutorisee ? onAnnuler : undefined}
                disabled={!annulationAutorisee}
                title={!annulationAutorisee ? msgBlocage : 'Annuler mon inscription'}
                style={{
                  padding: '6px 12px',
                  background: annulationAutorisee ? 'transparent' : 'rgba(136,136,136,.08)',
                  color: annulationAutorisee ? '#ff4d6d' : '#555577',
                  border: `1px solid ${annulationAutorisee ? 'rgba(255,77,109,.3)' : '#2a2a4a'}`,
                  borderRadius: '6px', fontSize: '12px',
                  cursor: annulationAutorisee ? 'pointer' : 'not-allowed',
                  fontFamily: 'Poppins,sans-serif',
                  opacity: annulationAutorisee ? 1 : 0.6,
                }}
              >
                {annulationAutorisee ? 'Se désinscrire' : '🔒 Annulation bloquée'}
              </button>
            )}
          </>
        )}

        {mode === 'explorer' && (
          (event.stat_event === 'terminé' || event.stat_event === 'annulé') ? (
            <div
              style={{
                display: 'block',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                background: 'rgba(136,136,136,.1)',
                color: '#555577',
                border: '1px solid #2a2a4a',
                cursor: 'default',
                textAlign: 'center',
                width: '100%',
                fontFamily: 'Poppins,sans-serif',
                boxSizing: 'border-box',
              }}
            >
              {event.stat_event === 'annulé' ? '✕ Annulé' : '■ Terminé'}
            </div>
          ) : estInscrit ? (
            <div style={{ width: '100%' }}>
              <button
                onClick={annulationAutorisee ? onSeDesinscrire : undefined}
                disabled={!annulationAutorisee}
                title={!annulationAutorisee ? msgBlocage : 'Annuler mon inscription'}
                style={{
                  padding: '8px 16px', width: '100%', borderRadius: '8px',
                  fontSize: '13px', fontFamily: 'Poppins,sans-serif', fontWeight: 600,
                  cursor: annulationAutorisee ? 'pointer' : 'not-allowed',
                  background: annulationAutorisee ? 'rgba(255,77,109,.12)' : 'rgba(0,230,118,.12)',
                  color: annulationAutorisee ? '#ff4d6d' : '#00e676',
                  border: `1px solid ${annulationAutorisee ? 'rgba(255,77,109,.35)' : 'rgba(0,230,118,.35)'}`,
                  opacity: annulationAutorisee ? 1 : 0.85,
                }}
              >
                {annulationAutorisee ? '✓ Inscrit · Se désinscrire' : '✓ Inscrit · 🔒 Annulation bloquée'}
              </button>
              {!annulationAutorisee && (
                <div style={{ fontSize: 10, color: '#555577', textAlign: 'center', marginTop: 4 }}>
                  {msgBlocage}
                </div>
              )}
            </div>
          ) : (
            <button
              className="dash-btn-primary event-card__btn"
              onClick={onSInscrire}
              disabled={estComplet}
              title={estComplet ? 'Événement complet' : "S'inscrire à cet événement"}
            >
              {estComplet ? 'Complet' : "S'inscrire →"}
            </button>
          )
        )}
      </div>
    </div>
  );
};



export default EventCard;
