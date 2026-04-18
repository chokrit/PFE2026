// ============================================================
// Location.jsx
// Emplacement : frontend/src/pages/Location.jsx
// Route       : /location
// Accessible  : sans connexion, lien depuis Login.jsx (bas de page)
//
// Page de localisation avec :
//   - Carte interactive (placeholder → intégrer Leaflet)
//   - Adresse complète
//   - Horaires d'ouverture
//   - Téléphone + Email + Site web
//   - Réseaux sociaux
//   - Boutons Itinéraire et Copier
//
// INTÉGRATION CARTE LEAFLET (gratuit, pas de clé API) :
//   Étape 1 : npm install react-leaflet leaflet
//   Étape 2 : Ajouter dans main.jsx : import 'leaflet/dist/leaflet.css';
//   Étape 3 : Corriger le bug icône Leaflet (voir TODO LEAFLET ICONS)
//   Étape 4 : Décommenter le bloc TODO LEAFLET MAP
//
// TODO À COMPLÉTER PLUS TARD :
//   [ ] Remplacer les "TODO: REMPLACER" par vos vraies informations
//   [ ] Intégrer Leaflet (voir instructions ci-dessus)
//   [ ] Ajouter les vrais liens réseaux sociaux
// ============================================================

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import Logo from '../components/Logo';

// TODO LEAFLET ICONS : Corriger le bug d'icône Leaflet avec React
// Décommenter ces lignes quand leaflet est installé :
// import L from 'leaflet';
// import markerIcon from 'leaflet/dist/images/marker-icon.png';
// import markerShadow from 'leaflet/dist/images/marker-shadow.png';
// L.Marker.prototype.options.icon = L.icon({
//   iconUrl: markerIcon,
//   shadowUrl: markerShadow,
//   iconAnchor: [12, 41],
// });

// TODO LEAFLET MAP : Décommenter ces imports quand leaflet est installé
// import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';

// ── Styles partagés pour les boutons ────────────────────────
const btnContactStyle = (color) => ({
  padding: '6px 14px',
  background: color + '22',
  color: color,
  border: `1px solid ${color}44`,
  borderRadius: '6px',
  fontSize: '12px',
  fontWeight: 500,
  textDecoration: 'none',
  display: 'inline-block',
  cursor: 'pointer',
  fontFamily: 'Poppins, sans-serif',
});

const btnCopyStyle = {
  padding: '6px 14px',
  background: 'transparent',
  border: '1px solid #2a2a4a',
  borderRadius: '6px',
  color: '#8888aa',
  fontSize: '12px',
  cursor: 'pointer',
  fontFamily: 'Poppins, sans-serif',
};

const Location = () => {
  const { t, isRTL } = useLanguage();
  const [copied, setCopied] = useState('');

  // ════════════════════════════════════════════════════════════
  // TODO: REMPLACER — Coordonnées réelles de votre organisme
  //
  // Pour trouver les coordonnées GPS :
  //   1. Aller sur maps.google.com
  //   2. Chercher votre adresse
  //   3. Clic droit → "C'est quoi ici ?" → coordonnées lat, lng
  // ════════════════════════════════════════════════════════════
  const INFO = {

    // TODO: REMPLACER par les vraies coordonnées GPS
    lat: 36.8065,
    lng: 10.1815,

    // TODO: REMPLACER par la vraie adresse (une ligne par élément)
    adresse: [
      'TODO: Numéro et nom de rue',
      'TODO: Code postal, Ville',
      'TODO: Gouvernorat / Région',
      'TODO: Tunisie',
    ],

    // TODO: REMPLACER par les vrais contacts
    telephone: 'TODO: +216 XX XXX XXX',
    email:     'TODO: contact@votre-organisme.tn',
    siteWeb:   'TODO: https://www.votre-organisme.tn',
    // Laisser siteWeb: '' pour masquer le bouton site web

    // TODO: REMPLACER par les vrais horaires
    // isClosed: true = affiché en rouge avec le texte "Fermé"
    horaires: [
      { jours: 'Lundi — Vendredi', heures: 'TODO: 08h00 — 18h00', isClosed: false },
      { jours: 'Samedi',           heures: 'TODO: 09h00 — 13h00', isClosed: false },
      { jours: 'Dimanche',         heures: 'Fermé',                isClosed: true  },
    ],

    // TODO: REMPLACER par les vrais liens réseaux sociaux
    // Laisser url: '' pour masquer automatiquement le bouton
    reseaux: [
      { label: 'Facebook',  url: 'TODO: https://facebook.com/votre-page',    icone: 'f'  },
      { label: 'Instagram', url: 'TODO: https://instagram.com/votre-compte', icone: '📸' },
      { label: 'YouTube',   url: '',                                          icone: '▶'  },
      { label: 'Twitter',   url: '',                                          icone: '𝕏'  },
    ],
  };
  // ════════════════════════════════════════════════════════════

  // Liens Google Maps générés depuis les coordonnées
  const urlItineraire = `https://www.google.com/maps/dir/?api=1&destination=${INFO.lat},${INFO.lng}`;
  const urlVoirCarte  = `https://www.google.com/maps?q=${INFO.lat},${INFO.lng}`;

  // Copier dans le presse-papiers avec fallback
  const copierTexte = (texte, cle) => {
    navigator.clipboard.writeText(texte)
      .then(() => {
        setCopied(cle);
        setTimeout(() => setCopied(''), 2000);
      })
      .catch(() => {
        const el = document.createElement('textarea');
        el.value = texte;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        setCopied(cle);
        setTimeout(() => setCopied(''), 2000);
      });
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0a1a',
        fontFamily: 'Poppins, sans-serif',
        color: '#e8e8f0',
        direction: isRTL ? 'rtl' : 'ltr',
      }}
    >

      {/* Sélecteur de langue */}
      <div
        style={{
          position: 'fixed',
          top: '16px',
          [isRTL ? 'left' : 'right']: '16px',
          zIndex: 100,
        }}
      >
        <LanguageSwitcher />
      </div>

      {/* ── HEADER ── */}
      <div
        style={{
          background: '#12122a',
          borderBottom: '1px solid #2a2a4a',
          padding: '2.5rem 1.5rem 2rem',
          textAlign: 'center',
        }}
      >
        <Logo size={50} color="#00d4ff" />
        <h1
          style={{
            fontSize: 'clamp(20px, 5vw, 30px)',
            fontWeight: 800,
            color: '#e8e8f0',
            marginTop: '1rem',
          }}
        >
          {t('locationTitle')}
        </h1>
      </div>

      {/* ── CORPS ── */}
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1.5rem' }}>

        {/* ── CARTE ── */}
        <div
          style={{
            background: '#12122a',
            border: '1px solid #2a2a4a',
            borderRadius: '16px',
            overflow: 'hidden',
            marginBottom: '1.5rem',
          }}
        >

          {/* TODO LEAFLET MAP : Remplacer le placeholder par la vraie carte.
              Après les installations (voir haut du fichier), décommenter :

              <MapContainer
                center={[INFO.lat, INFO.lng]}
                zoom={15}
                style={{ height: '320px', width: '100%' }}
                scrollWheelZoom={false}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="© OpenStreetMap contributors"
                />
                <Marker position={[INFO.lat, INFO.lng]}>
                  <Popup>
                    <strong>TODO: Nom de votre organisme</strong>
                    <br />
                    {INFO.adresse.join(', ')}
                  </Popup>
                </Marker>
              </MapContainer>
          */}

          {/* Placeholder carte */}
          <div
            style={{
              height: '280px',
              background: 'linear-gradient(135deg, #1a1a35, #12122a)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '14px',
              color: '#8888aa',
            }}
          >
            <span style={{ fontSize: '56px' }}>🗺</span>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '14px', marginBottom: '6px' }}>
                Carte interactive à intégrer
              </p>
              <code style={{ fontSize: '12px', color: '#00d4ff', opacity: 0.8 }}>
                npm install react-leaflet leaflet
              </code>
            </div>
            <a
              href={urlVoirCarte}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: '#00d4ff',
                fontSize: '13px',
                textDecoration: 'none',
                padding: '7px 16px',
                border: '1px solid rgba(0,212,255,0.3)',
                borderRadius: '8px',
              }}
            >
              {t('viewOnMap')} →
            </a>
          </div>

          {/* Boutons sous la carte */}
          <div
            style={{
              padding: '14px 16px',
              borderTop: '1px solid #2a2a4a',
              display: 'flex',
              gap: '10px',
              flexWrap: 'wrap',
            }}
          >
            <a
              href={urlItineraire}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                flex: 1,
                minWidth: '140px',
                padding: '11px',
                background: 'linear-gradient(135deg, #00d4ff, #0088cc)',
                color: '#0a0a1a',
                fontWeight: 700,
                fontSize: '13px',
                borderRadius: '8px',
                textDecoration: 'none',
                textAlign: 'center',
                display: 'block',
                fontFamily: 'Poppins, sans-serif',
              }}
            >
              🧭 {t('getDirections')}
            </a>
            <a
              href={urlVoirCarte}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                flex: 1,
                minWidth: '140px',
                padding: '11px',
                background: 'transparent',
                border: '1px solid #2a2a4a',
                color: '#e8e8f0',
                fontSize: '13px',
                borderRadius: '8px',
                textDecoration: 'none',
                textAlign: 'center',
                display: 'block',
                fontFamily: 'Poppins, sans-serif',
              }}
            >
              📍 {t('viewOnMap')}
            </a>
          </div>
        </div>

        {/* ── ADRESSE + HORAIRES ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '16px',
            marginBottom: '1.5rem',
          }}
        >

          {/* Adresse */}
          <div
            style={{
              background: '#12122a',
              border: '1px solid #2a2a4a',
              borderRadius: '14px',
              padding: '1.25rem',
            }}
          >
            <h3
              style={{
                color: '#00d4ff',
                fontSize: '12px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: '14px',
              }}
            >
              📍 {t('address')}
            </h3>
            <address style={{ fontStyle: 'normal' }}>
              {INFO.adresse.map((ligne, i) => (
                <p
                  key={i}
                  style={{
                    color: i === INFO.adresse.length - 1 ? '#8888aa' : '#e8e8f0',
                    fontSize: '14px',
                    lineHeight: 2,
                    margin: 0,
                  }}
                >
                  {ligne}
                </p>
              ))}
            </address>
            <button
              onClick={() => copierTexte(INFO.adresse.join(', '), 'adresse')}
              style={{ ...btnCopyStyle, marginTop: '12px' }}
            >
              {copied === 'adresse' ? `✓ ${t('copySuccess')}` : t('copy')}
            </button>
          </div>

          {/* Horaires */}
          <div
            style={{
              background: '#12122a',
              border: '1px solid #2a2a4a',
              borderRadius: '14px',
              padding: '1.25rem',
            }}
          >
            <h3
              style={{
                color: '#ff6b00',
                fontSize: '12px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: '14px',
              }}
            >
              🕐 {t('openingHours')}
            </h3>
            {INFO.horaires.map((h, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 0',
                  borderBottom:
                    i < INFO.horaires.length - 1 ? '1px solid #1a1a35' : 'none',
                  gap: '8px',
                }}
              >
                <span style={{ color: '#8888aa', fontSize: '13px' }}>
                  {h.jours}
                </span>
                <span
                  style={{
                    color: h.isClosed ? '#ff4d6d' : '#e8e8f0',
                    fontSize: '13px',
                    fontWeight: 500,
                    flexShrink: 0,
                  }}
                >
                  {h.isClosed ? t('closed') : h.heures}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── CONTACT ── */}
        <div
          style={{
            background: '#12122a',
            border: '1px solid #2a2a4a',
            borderRadius: '14px',
            padding: '1.25rem',
            marginBottom: '1.5rem',
          }}
        >
          <h3
            style={{
              color: '#00e676',
              fontSize: '12px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: '14px',
            }}
          >
            📞 {t('contact')}
          </h3>

          {/* Téléphone */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 0',
              borderBottom: '1px solid #1a1a35',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '22px' }}>📞</span>
              <div>
                <div style={{ fontSize: '11px', color: '#8888aa' }}>
                  {t('callUs')}
                </div>
                <div style={{ fontSize: '14px', color: '#e8e8f0', fontWeight: 500 }}>
                  {INFO.telephone}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <a
                href={`tel:${INFO.telephone.replace(/\s/g, '')}`}
                style={btnContactStyle('#00e676')}
              >
                {t('callUs')}
              </a>
              <button
                onClick={() => copierTexte(INFO.telephone, 'tel')}
                style={btnCopyStyle}
              >
                {copied === 'tel' ? `✓ ${t('copySuccess')}` : t('copy')}
              </button>
            </div>
          </div>

          {/* Email */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 0',
              borderBottom: INFO.siteWeb ? '1px solid #1a1a35' : 'none',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '22px' }}>✉️</span>
              <div>
                <div style={{ fontSize: '11px', color: '#8888aa' }}>
                  {t('emailUs')}
                </div>
                <div style={{ fontSize: '14px', color: '#e8e8f0', fontWeight: 500 }}>
                  {INFO.email}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <a
                href={`mailto:${INFO.email}`}
                style={btnContactStyle('#00d4ff')}
              >
                {t('emailUs')}
              </a>
              <button
                onClick={() => copierTexte(INFO.email, 'email')}
                style={btnCopyStyle}
              >
                {copied === 'email' ? `✓ ${t('copySuccess')}` : t('copy')}
              </button>
            </div>
          </div>

          {/* Site web — masqué si INFO.siteWeb est vide */}
          {INFO.siteWeb && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 0',
              }}
            >
              <span style={{ fontSize: '22px' }}>🌐</span>
              <div>
                <div style={{ fontSize: '11px', color: '#8888aa' }}>Site web</div>
                <a
                  href={INFO.siteWeb}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: '14px',
                    color: '#00d4ff',
                    fontWeight: 500,
                    textDecoration: 'none',
                  }}
                >
                  {INFO.siteWeb}
                </a>
              </div>
            </div>
          )}
        </div>

        {/* ── RÉSEAUX SOCIAUX
            Masqué si aucun réseau n'a d'url renseignée ── */}
        {INFO.reseaux.some((r) => r.url) && (
          <div
            style={{
              background: '#12122a',
              border: '1px solid #2a2a4a',
              borderRadius: '14px',
              padding: '1.25rem',
              marginBottom: '1.5rem',
            }}
          >
            <h3
              style={{
                color: '#8888aa',
                fontSize: '12px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: '14px',
              }}
            >
              {t('socialMedia')}
            </h3>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {INFO.reseaux
                .filter((r) => r.url)
                .map((r, i) => (
                  <a
                    key={i}
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '8px 16px',
                      background: '#1a1a35',
                      border: '1px solid #2a2a4a',
                      borderRadius: '8px',
                      color: '#e8e8f0',
                      fontSize: '13px',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span style={{ fontSize: '14px' }}>{r.icone}</span>
                    {r.label}
                  </a>
                ))}
            </div>
          </div>
        )}

      </div>

      {/* ── PIED DE PAGE ── */}
      <div
        style={{
          textAlign: 'center',
          padding: '1.5rem',
          borderTop: '1px solid #2a2a4a',
        }}
      >
        <Link
          to="/login"
          style={{
            color: '#8888aa',
            fontSize: '13px',
            textDecoration: 'none',
          }}
        >
          ← {t('backToLogin')}
        </Link>
      </div>

    </div>
  );
};

export default Location;
