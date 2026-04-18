// ============================================================
// DashboardUser.jsx — Dashboard de l'utilisateur connecté
// Route : /dashboard
// Rôle  : 'user' (sportif / participant)
//
// Sections :
//   1. Header  — salutation + bouton déconnexion
//   2. Stats   — points, heures, score fiabilité, coupons
//   3. Mes prochains événements inscrits
//   4. Explorer les événements disponibles
//   5. Mes récompenses / coupons
// ============================================================

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import StatCard from '../../components/dashboard/StatCard';
import EventCard from '../../components/dashboard/EventCard';
import RewardCard from '../../components/dashboard/RewardCard';
import QRModal from '../../components/dashboard/QRModal';
import '../../styles/dashboard/dashboard.css';

// ── Import de l'instance axios avec token automatique ──
// TODO: décommenter quand api.js est créé
// import api from '../../api';

const DashboardUser = () => {
  const navigate = useNavigate();
  const { t, isRTL } = useLanguage();

  // ── État de l'utilisateur connecté ──
  const [utilisateur, setUtilisateur] = useState(null);

  // ── Données chargées depuis l'API ──
  const [mesInscriptions, setMesInscriptions] = useState([]);
  const [evenementsDispos, setEvenementsDispos] = useState([]);
  const [mesRecompenses, setMesRecompenses] = useState([]);

  // ── UI state ──
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('inscrits'); // 'inscrits' | 'explorer' | 'recompenses'
  const [qrModal, setQrModal] = useState(null);       // { eventId, token, titre }
  const [notification, setNotification] = useState(null);     // { type: 'success'|'error', message }

  // ── Vérification de la session au montage ──
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

    // Charger les données depuis l'API
    chargerDonnees();
  }, [navigate]);

  // ── Chargement des données depuis l'API ──
  const chargerDonnees = async () => {
    setLoading(true);
    try {
      // TODO: remplacer les données fictives par de vrais appels API
      // const [inscriptions, evenements, recompenses] = await Promise.all([
      //   api.get('/participations/mes-inscriptions'),
      //   api.get('/evenements'),
      //   api.get('/recompenses/mes-coupons'),
      // ]);

      // ── Données fictives pour développement ──
      await new Promise(r => setTimeout(r, 800)); // simuler délai réseau

      setMesInscriptions(MOCK_INSCRIPTIONS);
      setEvenementsDispos(MOCK_EVENEMENTS);
      setMesRecompenses(MOCK_RECOMPENSES);

    } catch (error) {
      console.error('Erreur chargement données:', error);
      afficherNotif('error', 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  // ── Déconnexion ──
  const handleLogout = () => {
    localStorage.removeItem('event_token');
    localStorage.removeItem('event_user');
    navigate('/login');
  };

  // ── S'inscrire à un événement ──
  const sInscrire = async (eventId) => {
    try {
      // TODO: api.post(`/evenements/${eventId}/inscription`)
      afficherNotif('success', 'Inscription confirmée !');
      chargerDonnees();
    } catch (error) {
      afficherNotif('error', error.response?.data?.message || 'Erreur inscription');
    }
  };

  // ── Afficher le QR code d'un événement ──
  const voirQR = (inscription) => {
    setQrModal({
      eventId: inscription.eventId,
      token: inscription.qr_token,
      titre: inscription.titre,
    });
  };

  // ── Notification temporaire (3 secondes) ──
  const afficherNotif = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  // ── Calculer le niveau de l'utilisateur ──
  const getNiveau = (points) => {
    if (points >= 500) return { label: 'Champion', color: '#ffd700', icon: '🏆' };
    if (points >= 200) return { label: 'Avancé', color: '#00d4ff', icon: '⚡' };
    if (points >= 50) return { label: 'Actif', color: '#00e676', icon: '🌟' };
    return { label: 'Débutant', color: '#888', icon: '🎯' };
  };

  // ── Rendu conditionnel si chargement ──
  if (loading) {
    return (
      <div className="dash-loading">
        <div className="dash-spinner"></div>
        <p>Chargement de votre espace...</p>
      </div>
    );
  }

  const niveau = getNiveau(utilisateur?.cumul_points || 0);

  return (
    <div className={`dashboard-page ${isRTL ? 'rtl' : ''}`}>

      {/* ── Notification flottante ── */}
      {notification && (
        <div className={`dash-notif dash-notif--${notification.type}`}>
          {notification.type === 'success' ? '✓' : '⚠'} {notification.message}
        </div>
      )}

      {/* ── HEADER ── */}
      <header className="dash-header">
        <div className="dash-header__left">
          {/* Logo */}
          <Link to="/" className="dash-logo">EVENT</Link>
          {/* Fil d'Ariane */}
          <span className="dash-breadcrumb">/ Mon espace</span>
        </div>

        <div className="dash-header__right">
          {/* Indicateur de niveau */}
          <div className="dash-niveau" style={{ color: niveau.color }}>
            <span className="dash-niveau__icon">{niveau.icon}</span>
            <span className="dash-niveau__label">{niveau.label}</span>
          </div>

          {/* Avatar + nom */}
          <div className="dash-user-chip">
            <div className="dash-avatar">
              {utilisateur?.first_name?.[0]}{utilisateur?.last_name?.[0]}
            </div>
            <span className="dash-username">
              {utilisateur?.first_name} {utilisateur?.last_name}
            </span>
          </div>

          {/* Bouton déconnexion */}
          <button className="dash-btn-logout" onClick={handleLogout}>
            Déconnexion
          </button>
        </div>
      </header>

      {/* ── CORPS ── */}
      <main className="dash-main">

        {/* ── Salutation ── */}
        <section className="dash-welcome">
          <h1 className="dash-welcome__title">
            Bonjour, <span className="dash-accent">{utilisateur?.first_name}</span> 👋
          </h1>
          <p className="dash-welcome__sub">
            Voici un résumé de votre activité sportive.
          </p>
        </section>

        {/* ── CARTES DE STATS ── */}
        <section className="dash-stats-grid">
          {/*
            StatCard reçoit : label, value, unit, icon, color, trend
            trend : { value: '+5', direction: 'up' | 'down' }
          */}
          <StatCard
            label="Points cumulés"
            value={utilisateur?.cumul_points || 0}
            icon="⚡"
            color="#00d4ff"
            trend={{ value: '+15 ce mois', direction: 'up' }}
            onClick={() => setActiveTab('recompenses')}
          />
          <StatCard
            label="Heures de sport"
            value={`${utilisateur?.cumul_heures_participation || 0}h`}
            icon="⏱"
            color="#00e676"
            trend={{ value: '+3h cette semaine', direction: 'up' }}
          />
          <StatCard
            label="Fiabilité"
            value={`${utilisateur?.reliabilite_score || 100}%`}
            icon="🎯"
            color={utilisateur?.reliabilite_score >= 80 ? '#00e676' : '#ff6b00'}
          // TODO: ajouter une barre de progression visuelle
          />
          <StatCard
            label="Coupons disponibles"
            value={mesRecompenses.filter(r => !r.is_redeemed).length}
            icon="🎫"
            color="#ff6b00"
            onClick={() => setActiveTab('recompenses')}
          />
        </section>

        {/* ── BARRE DE PROGRESSION DES POINTS ── */}
        <section className="dash-progress-section">
          <div className="dash-progress-header">
            <span className="dash-progress-label">
              Progression vers le niveau suivant
            </span>
            <span className="dash-progress-value">
              {utilisateur?.cumul_points || 0} / 200 pts
            </span>
          </div>
          <div className="dash-progress-bar">
            <div
              className="dash-progress-fill"
              style={{
                width: `${Math.min(((utilisateur?.cumul_points || 0) / 200) * 100, 100)}%`
              }}
            />
          </div>
          <p className="dash-progress-hint">
            Participez à des événements pour gagner des points et débloquer des coupons !
          </p>
        </section>

        {/* ── ONGLETS ── */}
        <div className="dash-tabs">
          <button
            className={`dash-tab ${activeTab === 'inscrits' ? 'active' : ''}`}
            onClick={() => setActiveTab('inscrits')}
          >
            Mes événements
            {/* Badge nombre d'inscriptions */}
            {mesInscriptions.length > 0 && (
              <span className="dash-tab-badge">{mesInscriptions.length}</span>
            )}
          </button>
          <button
            className={`dash-tab ${activeTab === 'explorer' ? 'active' : ''}`}
            onClick={() => setActiveTab('explorer')}
          >
            Explorer
          </button>
          <button
            className={`dash-tab ${activeTab === 'recompenses' ? 'active' : ''}`}
            onClick={() => setActiveTab('recompenses')}
          >
            Récompenses
            {mesRecompenses.filter(r => !r.is_redeemed).length > 0 && (
              <span className="dash-tab-badge dash-tab-badge--orange">
                {mesRecompenses.filter(r => !r.is_redeemed).length}
              </span>
            )}
          </button>
        </div>

        {/* ── CONTENU DE L'ONGLET ACTIF ── */}
        <div className="dash-tab-content">

          {/* ── ONGLET : Mes inscriptions ── */}
          {activeTab === 'inscrits' && (
            <div>
              {mesInscriptions.length === 0 ? (
                <div className="dash-empty">
                  <p className="dash-empty__icon">🏃</p>
                  <p className="dash-empty__text">Vous n'êtes inscrit à aucun événement.</p>
                  <button
                    className="dash-btn-primary"
                    onClick={() => setActiveTab('explorer')}
                  >
                    Explorer les événements →
                  </button>
                </div>
              ) : (
                <div className="dash-events-grid">
                  {mesInscriptions.map(inscription => (
                    <EventCard
                      key={inscription.id}
                      event={inscription}
                      mode="inscrit"
                      onVoirQR={() => voirQR(inscription)}
                    // TODO: onAnnuler={() => annulerInscription(inscription.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── ONGLET : Explorer ── */}
          {activeTab === 'explorer' && (
            <div>
              {/* TODO: Ajouter filtres par catégorie / date / lieu */}
              <div className="dash-events-grid">
                {evenementsDispos.map(event => (
                  <EventCard
                    key={event.id}
                    event={event}
                    mode="explorer"
                    onSInscrire={() => sInscrire(event.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── ONGLET : Récompenses ── */}
          {activeTab === 'recompenses' && (
            <div>
              {mesRecompenses.length === 0 ? (
                <div className="dash-empty">
                  <p className="dash-empty__icon">🎫</p>
                  <p className="dash-empty__text">
                    Participez à des événements pour gagner des coupons de réduction !
                  </p>
                </div>
              ) : (
                <div className="dash-rewards-grid">
                  {mesRecompenses.map(recompense => (
                    <RewardCard
                      key={recompense.id}
                      recompense={recompense}
                    // TODO: onUtiliser={() => utiliserCoupon(recompense.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      {/* ── MODAL QR CODE ── */}
      {qrModal && (
        <QRModal
          token={qrModal.token}
          titre={qrModal.titre}
          onClose={() => setQrModal(null)}
        />
      )}

    </div>
  );
};

// ============================================================
// DONNÉES FICTIVES — À remplacer par des appels API réels
// Supprimer ce bloc quand les routes backend sont prêtes
// ============================================================

const MOCK_INSCRIPTIONS = [
  {
    id: '1',
    titre: 'Match de Football — Complexe Sportif Ariana',
    date: '2024-08-15T09:00:00',
    lieu: 'Complexe Sportif Ariana',
    categorie: 'Football',
    stat_event: 'publié',
    is_present: false,
    qr_token: 'abc123def456',
    max_participants: 22,
    nb_inscrits: 18,
  },
  {
    id: '2',
    titre: 'Natation — Piscine Municipale',
    date: '2024-08-20T07:00:00',
    lieu: 'Piscine Municipale El Menzah',
    categorie: 'Natation',
    stat_event: 'publié',
    is_present: true,
    qr_token: 'xyz789uvw000',
    max_participants: 30,
    nb_inscrits: 30,
  },
];

const MOCK_EVENEMENTS = [
  {
    id: '3',
    titre: 'Course à Pied — Lac de Tunis',
    date: '2024-09-01T06:30:00',
    lieu: 'Lac de Tunis',
    categorie: 'Course',
    stat_event: 'publié',
    max_participants: 100,
    nb_inscrits: 67,
    description: 'Course matinale de 5km autour du lac. Tous niveaux bienvenus.',
  },
  {
    id: '4',
    titre: 'Yoga en Plein Air',
    date: '2024-09-05T08:00:00',
    lieu: 'Parc du Belvédère',
    categorie: 'Bien-être',
    stat_event: 'publié',
    max_participants: 25,
    nb_inscrits: 12,
    description: 'Session de yoga matinale pour débutants et confirmés.',
  },
  {
    id: '5',
    titre: 'Tournoi de Basketball',
    date: '2024-09-10T14:00:00',
    lieu: 'Salle Omnisports Radès',
    categorie: 'Basketball',
    stat_event: 'publié',
    max_participants: 40,
    nb_inscrits: 38,
    description: 'Tournoi 3x3 en équipes. Inscription par équipe de 3.',
  },
];

const MOCK_RECOMPENSES = [
  {
    id: 'r1',
    coupon_code: 'EVENT-SPORT-2024',
    remise_pourcentage: 15,
    titre_recompense: 'Fidèle sportif — 5 participations',
    datefin_coupon: '2024-12-31',
    is_redeemed: false,
  },
  {
    id: 'r2',
    coupon_code: 'EVENT-GOLD-XYZ',
    remise_pourcentage: 30,
    titre_recompense: 'Champion — 10 heures de sport',
    datefin_coupon: '2024-10-15',
    is_redeemed: true,
  },
];

export default DashboardUser;
