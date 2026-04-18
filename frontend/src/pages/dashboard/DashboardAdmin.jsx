// ============================================================
// DashboardAdmin.jsx — Panneau d'administration complet
// Route : /admin
// Rôle  : 'admin' uniquement (vérifié par middleware isAdmin)
//
// Sections :
//   1. Header  — titre + stats globales
//   2. KPIs    — utilisateurs, événements, participations, revenus
//   3. Gestion utilisateurs — liste + changer rôle + supprimer
//   4. Gestion événements   — liste + publier + annuler + supprimer
//   5. Gestion équipements  — stock
//   6. Règles de récompense — gamification
// ============================================================

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import StatCard from '../../components/dashboard/StatCard';
import '../../styles/dashboard/dashboard.css';
import '../../styles/dashboard/admin.css';

// TODO: import api from '../../api';

const DashboardAdmin = () => {
  const navigate = useNavigate();
  const { isRTL } = useLanguage();

  // ── État global ──
  const [adminUser, setAdminUser]     = useState(null);
  const [activeTab, setActiveTab]     = useState('overview'); // overview|users|events|equipment|rewards
  const [loading, setLoading]         = useState(true);
  const [notification, setNotif]      = useState(null);

  // ── Données ──
  const [utilisateurs, setUtilisateurs]   = useState([]);
  const [evenements, setEvenements]       = useState([]);
  const [equipements, setEquipements]     = useState([]);
  const [regles, setRegles]               = useState([]);
  const [kpis, setKpis]                   = useState({});

  // ── Modals et formulaires ──
  const [modalCreateEvent, setModalCreateEvent] = useState(false);
  const [modalCreateEquip, setModalCreateEquip] = useState(false);
  const [userSearch, setUserSearch]             = useState('');
  const [confirmDelete, setConfirmDelete]       = useState(null); // { type, id, nom }

  // ── Formulaire nouvel événement ──
  const [newEvent, setNewEvent] = useState({
    title_event: '',
    event_description: '',
    ev_start_time: '',
    ev_end_time: '',
    max_participants: 30,
    location: '',
  });

  useEffect(() => {
    const token = localStorage.getItem('event_token');
    const user  = localStorage.getItem('event_user');
    if (!token) { navigate('/login'); return; }
    if (user) {
      const u = JSON.parse(user);
      // Vérifier que c'est bien un admin
      if (u.role !== 'admin') {
        navigate('/dashboard'); // Rediriger les non-admins
        return;
      }
      setAdminUser(u);
    }
    chargerTout();
  }, [navigate]);

  const chargerTout = async () => {
    setLoading(true);
    try {
      // TODO: Remplacer par appels API réels
      // const [usersRes, eventsRes, equipRes, reglesRes] = await Promise.all([
      //   api.get('/utilisateurs'),
      //   api.get('/evenements/all'),
      //   api.get('/equipements'),
      //   api.get('/recompenses/regles'),
      // ]);
      await new Promise(r => setTimeout(r, 600));
      setUtilisateurs(MOCK_USERS);
      setEvenements(MOCK_EVENTS_ADMIN);
      setEquipements(MOCK_EQUIP);
      setRegles(MOCK_REGLES);
      setKpis(MOCK_KPIS);
    } catch (e) {
      notif('error', 'Erreur chargement données admin');
    } finally {
      setLoading(false);
    }
  };

  const notif = (type, msg) => {
    setNotif({ type, msg });
    setTimeout(() => setNotif(null), 3000);
  };

  // ── Changer le rôle d'un utilisateur ──
  const changerRole = async (userId, nouveauRole) => {
    try {
      // TODO: await api.put(`/utilisateurs/${userId}/role`, { role: nouveauRole });
      setUtilisateurs(prev =>
        prev.map(u => u._id === userId ? { ...u, role: nouveauRole } : u)
      );
      notif('success', `Rôle changé en "${nouveauRole}"`);
    } catch (e) {
      notif('error', 'Erreur changement de rôle');
    }
  };

  // ── Supprimer un utilisateur ──
  const supprimerUser = async (userId) => {
    try {
      // TODO: await api.delete(`/utilisateurs/${userId}`);
      setUtilisateurs(prev => prev.filter(u => u._id !== userId));
      setConfirmDelete(null);
      notif('success', 'Utilisateur supprimé');
    } catch (e) {
      notif('error', 'Erreur suppression');
    }
  };

  // ── Publier / annuler un événement ──
  const changerStatutEvent = async (eventId, nouveauStatut) => {
    try {
      // TODO: await api.put(`/evenements/${eventId}`, { stat_event: nouveauStatut });
      setEvenements(prev =>
        prev.map(e => e._id === eventId ? { ...e, stat_event: nouveauStatut } : e)
      );
      notif('success', `Événement : ${nouveauStatut}`);
    } catch (e) {
      notif('error', 'Erreur changement statut');
    }
  };

  // ── Créer un événement ──
  const creerEvenement = async (e) => {
    e.preventDefault();
    try {
      // TODO: await api.post('/evenements', newEvent);
      notif('success', 'Événement créé avec succès !');
      setModalCreateEvent(false);
      setNewEvent({ title_event:'', event_description:'', ev_start_time:'', ev_end_time:'', max_participants:30, location:'' });
      chargerTout();
    } catch (err) {
      notif('error', 'Erreur création événement');
    }
  };

  // ── Activer / désactiver une règle de récompense ──
  const toggleRegle = async (regleId) => {
    try {
      // TODO: await api.put(`/recompenses/regles/${regleId}/toggle`);
      setRegles(prev =>
        prev.map(r => r._id === regleId ? { ...r, est_active: !r.est_active } : r)
      );
    } catch (e) {
      notif('error', 'Erreur modification règle');
    }
  };

  // ── Filtrer utilisateurs ──
  const usersFiltres = utilisateurs.filter(u =>
    `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(userSearch.toLowerCase())
  );

  const getStatutBadge = (statut) => {
    const map = {
      'publié':   { cls: 'badge-success', label: 'Publié' },
      'brouillon':{ cls: 'badge-warning', label: 'Brouillon' },
      'annulé':   { cls: 'badge-danger',  label: 'Annulé' },
      'terminé':  { cls: 'badge-gray',    label: 'Terminé' },
    };
    return map[statut] || { cls: 'badge-gray', label: statut };
  };

  if (loading) {
    return (
      <div className="dash-loading">
        <div className="dash-spinner"></div>
        <p>Chargement du panneau admin...</p>
      </div>
    );
  }

  return (
    <div className={`dashboard-page admin-page ${isRTL ? 'rtl' : ''}`}>

      {/* ── Notification ── */}
      {notification && (
        <div className={`dash-notif dash-notif--${notification.type}`}>
          {notification.type === 'success' ? '✓' : '⚠'} {notification.msg}
        </div>
      )}

      {/* ── Confirmation de suppression ── */}
      {confirmDelete && (
        <div className="dash-overlay">
          <div className="dash-confirm-modal">
            <h3>Confirmer la suppression</h3>
            <p>Supprimer définitivement <strong>{confirmDelete.nom}</strong> ?</p>
            <p className="dash-confirm-warning">⚠ Cette action est irréversible.</p>
            <div className="dash-confirm-btns">
              <button className="dash-btn-danger" onClick={() => supprimerUser(confirmDelete.id)}>
                Supprimer
              </button>
              <button className="dash-btn-ghost" onClick={() => setConfirmDelete(null)}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── HEADER ADMIN ── */}
      <header className="dash-header admin-header">
        <div className="dash-header__left">
          <Link to="/" className="dash-logo">EVENT</Link>
          <span className="dash-breadcrumb">/ Administration</span>
          <span className="admin-badge">ADMIN</span>
        </div>
        <div className="dash-header__right">
          <span className="dash-username">{adminUser?.first_name} {adminUser?.last_name}</span>
          <Link to="/dashboard" className="dash-btn-ghost">Espace utilisateur</Link>
          <button className="dash-btn-logout" onClick={() => {
            localStorage.clear(); navigate('/login');
          }}>Déconnexion</button>
        </div>
      </header>

      <main className="dash-main">

        {/* ── NAVIGATION ADMIN ── */}
        <nav className="admin-nav">
          {[
            { key: 'overview',   label: 'Vue globale',    icon: '📊' },
            { key: 'users',      label: 'Utilisateurs',   icon: '👥' },
            { key: 'events',     label: 'Événements',     icon: '🏟' },
            { key: 'equipment',  label: 'Équipements',    icon: '🎒' },
            { key: 'rewards',    label: 'Récompenses',    icon: '🎫' },
          ].map(tab => (
            <button
              key={tab.key}
              className={`admin-nav-btn ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <span className="admin-nav-icon">{tab.icon}</span>
              {tab.label}
              {/* Badge compteurs */}
              {tab.key === 'users'  && <span className="dash-tab-badge">{utilisateurs.length}</span>}
              {tab.key === 'events' && <span className="dash-tab-badge">{evenements.length}</span>}
            </button>
          ))}
        </nav>

        {/* ══════════════════════════════════════
            ONGLET : VUE GLOBALE (KPIs)
        ══════════════════════════════════════ */}
        {activeTab === 'overview' && (
          <div>
            <h2 className="dash-section-title">Vue d'ensemble</h2>
            <div className="dash-stats-grid">
              <StatCard label="Utilisateurs inscrits" value={kpis.totalUsers}       icon="👥" color="#00d4ff" />
              <StatCard label="Événements actifs"     value={kpis.activeEvents}     icon="🏟" color="#00e676" />
              <StatCard label="Participations totales"value={kpis.totalParticipations} icon="✅" color="#ff6b00" />
              <StatCard label="Score fiabilité moy."  value={`${kpis.avgReliability}%`} icon="📈" color="#ffd700" />
            </div>

            {/* Tableau récapitulatif des dernières inscriptions */}
            <div className="admin-card" style={{ marginTop: '2rem' }}>
              <div className="admin-card__header">
                <h3>Dernières activités</h3>
                {/* TODO: Connecter à un endpoint /api/admin/activites-recentes */}
              </div>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Utilisateur</th>
                    <th>Action</th>
                    <th>Événement</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_ACTIVITES.map((a, i) => (
                    <tr key={i}>
                      <td>{a.user}</td>
                      <td><span className={`badge ${a.type === 'inscription' ? 'badge-success' : 'badge-warning'}`}>{a.action}</span></td>
                      <td>{a.event}</td>
                      <td className="text-muted">{a.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            ONGLET : UTILISATEURS
        ══════════════════════════════════════ */}
        {activeTab === 'users' && (
          <div>
            <div className="admin-section-header">
              <h2 className="dash-section-title">Gestion des utilisateurs</h2>
              <input
                type="search"
                className="admin-search"
                placeholder="Rechercher par nom, email..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
              />
            </div>

            <div className="admin-card">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Utilisateur</th>
                    <th>Email</th>
                    <th>Rôle</th>
                    <th>Points</th>
                    <th>Fiabilité</th>
                    <th>Inscrit le</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {usersFiltres.map(u => (
                    <tr key={u._id}>
                      <td>
                        <div className="admin-user-cell">
                          <div className="dash-avatar dash-avatar--sm">
                            {u.first_name?.[0]}{u.last_name?.[0]}
                          </div>
                          <span>{u.first_name} {u.last_name}</span>
                        </div>
                      </td>
                      <td className="text-muted">{u.email}</td>
                      <td>
                        {/* Sélecteur de rôle — admin only */}
                        <select
                          className={`admin-role-select ${u.role === 'admin' ? 'role-admin' : 'role-user'}`}
                          value={u.role}
                          onChange={e => changerRole(u._id, e.target.value)}
                        >
                          <option value="user">user</option>
                          <option value="admin">admin</option>
                        </select>
                      </td>
                      <td>{u.cumul_points} pts</td>
                      <td>
                        <div className="admin-reliability">
                          <div
                            className="admin-reliability-bar"
                            style={{
                              width: `${u.reliabilite_score}%`,
                              background: u.reliabilite_score >= 80 ? '#00e676' : '#ff6b00'
                            }}
                          />
                          <span>{u.reliabilite_score}%</span>
                        </div>
                      </td>
                      <td className="text-muted">{new Date(u.created_at).toLocaleDateString('fr-FR')}</td>
                      <td>
                        <button
                          className="admin-btn-icon admin-btn-danger"
                          title="Supprimer"
                          onClick={() => setConfirmDelete({ id: u._id, nom: `${u.first_name} ${u.last_name}` })}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            ONGLET : ÉVÉNEMENTS
        ══════════════════════════════════════ */}
        {activeTab === 'events' && (
          <div>
            <div className="admin-section-header">
              <h2 className="dash-section-title">Gestion des événements</h2>
              <button
                className="dash-btn-primary"
                onClick={() => setModalCreateEvent(true)}
              >
                + Créer un événement
              </button>
            </div>

            {/* Modal création événement */}
            {modalCreateEvent && (
              <div className="dash-overlay">
                <div className="dash-modal">
                  <div className="dash-modal__header">
                    <h3>Créer un événement</h3>
                    <button className="dash-modal__close" onClick={() => setModalCreateEvent(false)}>✕</button>
                  </div>
                  <form onSubmit={creerEvenement} className="admin-form">
                    <div className="form-group">
                      <label>Titre *</label>
                      <input
                        type="text"
                        value={newEvent.title_event}
                        onChange={e => setNewEvent({...newEvent, title_event: e.target.value})}
                        placeholder="Ex: Match de Football Ariana"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Description</label>
                      <textarea
                        rows={3}
                        value={newEvent.event_description}
                        onChange={e => setNewEvent({...newEvent, event_description: e.target.value})}
                        placeholder="Décrivez l'événement..."
                      />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Date début *</label>
                        <input type="datetime-local" value={newEvent.ev_start_time}
                          onChange={e => setNewEvent({...newEvent, ev_start_time: e.target.value})} required />
                      </div>
                      <div className="form-group">
                        <label>Date fin</label>
                        <input type="datetime-local" value={newEvent.ev_end_time}
                          onChange={e => setNewEvent({...newEvent, ev_end_time: e.target.value})} />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Participants max</label>
                        <input type="number" min="1" value={newEvent.max_participants}
                          onChange={e => setNewEvent({...newEvent, max_participants: +e.target.value})} />
                      </div>
                      <div className="form-group">
                        <label>Lieu</label>
                        {/* TODO: liste déroulante des Locations de la base */}
                        <input type="text" value={newEvent.location}
                          onChange={e => setNewEvent({...newEvent, location: e.target.value})}
                          placeholder="Sélectionner un lieu" />
                      </div>
                    </div>
                    <div className="dash-modal__footer">
                      <button type="submit" className="dash-btn-primary">Créer l'événement</button>
                      <button type="button" className="dash-btn-ghost" onClick={() => setModalCreateEvent(false)}>Annuler</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            <div className="admin-card">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Titre</th>
                    <th>Date</th>
                    <th>Lieu</th>
                    <th>Places</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {evenements.map(ev => {
                    const badge = getStatutBadge(ev.stat_event);
                    return (
                      <tr key={ev._id}>
                        <td>{ev.title_event}</td>
                        <td className="text-muted">
                          {new Date(ev.ev_start_time).toLocaleDateString('fr-FR', {
                            day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'
                          })}
                        </td>
                        <td className="text-muted">{ev.lieu}</td>
                        <td>
                          <div className="admin-places">
                            <div
                              className="admin-places-bar"
                              style={{ width: `${(ev.nb_inscrits / ev.max_participants) * 100}%` }}
                            />
                            <span>{ev.nb_inscrits}/{ev.max_participants}</span>
                          </div>
                        </td>
                        <td><span className={`badge ${badge.cls}`}>{badge.label}</span></td>
                        <td>
                          <div className="admin-actions">
                            {ev.stat_event === 'brouillon' && (
                              <button
                                className="admin-btn-sm admin-btn-success"
                                onClick={() => changerStatutEvent(ev._id, 'publié')}
                              >Publier</button>
                            )}
                            {ev.stat_event === 'publié' && (
                              <button
                                className="admin-btn-sm admin-btn-warning"
                                onClick={() => changerStatutEvent(ev._id, 'annulé')}
                              >Annuler</button>
                            )}
                            {/* TODO: bouton Modifier → ouvre modal édition */}
                            {/* TODO: bouton Voir participants → liste des inscrits */}
                            {/* TODO: bouton QR code global de l'événement */}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            ONGLET : ÉQUIPEMENTS
        ══════════════════════════════════════ */}
        {activeTab === 'equipment' && (
          <div>
            <div className="admin-section-header">
              <h2 className="dash-section-title">Gestion des équipements</h2>
              <button className="dash-btn-primary" onClick={() => setModalCreateEquip(true)}>
                + Ajouter un équipement
              </button>
            </div>

            {/* TODO: Modal création équipement */}
            {modalCreateEquip && (
              <div className="dash-overlay">
                <div className="dash-modal">
                  <div className="dash-modal__header">
                    <h3>Ajouter un équipement</h3>
                    <button className="dash-modal__close" onClick={() => setModalCreateEquip(false)}>✕</button>
                  </div>
                  <div className="admin-form">
                    <div className="form-group">
                      <label>Nom de l'équipement *</label>
                      <input type="text" placeholder="Ex: Ballon de football" />
                    </div>
                    <div className="form-group">
                      <label>Quantité en stock *</label>
                      <input type="number" min="0" placeholder="Ex: 10" />
                    </div>
                    {/* TODO: connecter à POST /api/equipements */}
                    <div className="dash-modal__footer">
                      <button className="dash-btn-primary" onClick={() => { notif('success','Équipement ajouté'); setModalCreateEquip(false); }}>Ajouter</button>
                      <button className="dash-btn-ghost" onClick={() => setModalCreateEquip(false)}>Annuler</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="admin-card">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Équipement</th>
                    <th>Stock total</th>
                    <th>Disponible</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {equipements.map(eq => (
                    <tr key={eq._id}>
                      <td>{eq.label}</td>
                      <td>{eq.total_qtite}</td>
                      <td>
                        {/* TODO: calculer la quantité réservée depuis Equiper.js */}
                        <span className="text-muted">— (calculer depuis Equiper)</span>
                      </td>
                      <td>
                        <button className="admin-btn-sm admin-btn-ghost">Modifier</button>
                        {/* TODO: DELETE /api/equipements/:id */}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            ONGLET : RÈGLES DE RÉCOMPENSE
        ══════════════════════════════════════ */}
        {activeTab === 'rewards' && (
          <div>
            <div className="admin-section-header">
              <h2 className="dash-section-title">Système de récompenses</h2>
              {/* TODO: bouton créer une nouvelle règle */}
            </div>

            <p className="dash-section-desc">
              Ces règles définissent quand un coupon est automatiquement attribué à un utilisateur.
            </p>

            <div className="admin-rewards-grid">
              {regles.map(regle => (
                <div key={regle._id} className={`admin-reward-card ${regle.est_active ? 'active' : 'inactive'}`}>
                  <div className="admin-reward-card__header">
                    <h4>{regle.titre_recompense}</h4>
                    {/* Toggle actif/inactif */}
                    <label className="admin-toggle">
                      <input
                        type="checkbox"
                        checked={regle.est_active}
                        onChange={() => toggleRegle(regle._id)}
                      />
                      <span className="admin-toggle-track"></span>
                    </label>
                  </div>
                  <div className="admin-reward-card__body">
                    {regle.nbre_heures_pour_recompense > 0 && (
                      <div className="reward-condition">
                        <span className="reward-icon">⏱</span>
                        <span>{regle.nbre_heures_pour_recompense}h de participation</span>
                      </div>
                    )}
                    {regle.nbre_participations > 0 && (
                      <div className="reward-condition">
                        <span className="reward-icon">✅</span>
                        <span>{regle.nbre_participations} événements participés</span>
                      </div>
                    )}
                    <div className="reward-result">
                      <span className="reward-icon">🎫</span>
                      <span className="reward-pct">-{regle.remise_pourcentage}%</span>
                      <span>de réduction accordée</span>
                    </div>
                  </div>
                  <div className="admin-reward-card__footer">
                    <span className={`badge ${regle.est_active ? 'badge-success' : 'badge-gray'}`}>
                      {regle.est_active ? 'Active' : 'Désactivée'}
                    </span>
                    {/* TODO: bouton modifier la règle */}
                  </div>
                </div>
              ))}
            </div>

            {/* TODO: Section "Coupons attribués" — liste de tous les Appartenir */}
          </div>
        )}

      </main>
    </div>
  );
};

// ── Données fictives ──
const MOCK_KPIS = { totalUsers: 142, activeEvents: 8, totalParticipations: 673, avgReliability: 87 };

const MOCK_USERS = [
  { _id:'u1', first_name:'Chokri',  last_name:'Ben Ali',   email:'chokri@email.com',  role:'admin', cumul_points:350, reliabilite_score:95, created_at:'2024-01-15' },
  { _id:'u2', first_name:'Sana',    last_name:'Trabelsi',  email:'sana@email.com',    role:'user',  cumul_points:120, reliabilite_score:88, created_at:'2024-02-20' },
  { _id:'u3', first_name:'Mohamed', last_name:'Chaabane',  email:'med@email.com',     role:'user',  cumul_points:75,  reliabilite_score:70, created_at:'2024-03-10' },
  { _id:'u4', first_name:'Rania',   last_name:'Mansour',   email:'rania@email.com',   role:'user',  cumul_points:200, reliabilite_score:100,created_at:'2024-04-05' },
];

const MOCK_EVENTS_ADMIN = [
  { _id:'e1', title_event:'Match Football Ariana', ev_start_time:'2024-08-15T09:00:00', lieu:'Complexe Ariana', max_participants:22, nb_inscrits:18, stat_event:'publié' },
  { _id:'e2', title_event:'Natation El Menzah',    ev_start_time:'2024-08-20T07:00:00', lieu:'Piscine El Menzah', max_participants:30, nb_inscrits:30, stat_event:'publié' },
  { _id:'e3', title_event:'Course du Lac',          ev_start_time:'2024-09-01T06:30:00', lieu:'Lac de Tunis', max_participants:100, nb_inscrits:0, stat_event:'brouillon' },
];

const MOCK_EQUIP = [
  { _id:'q1', label:'Ballon de football', total_qtite:10 },
  { _id:'q2', label:'Dossard',            total_qtite:50 },
  { _id:'q3', label:'Chronomètre',        total_qtite:5  },
  { _id:'q4', label:'Lunettes de natation', total_qtite:20 },
];

const MOCK_REGLES = [
  { _id:'r1', titre_recompense:'Première participation',       nbre_heures_pour_recompense:0, nbre_participations:1,  remise_pourcentage:5,  est_active:true  },
  { _id:'r2', titre_recompense:'Sportif actif — 5h de sport',  nbre_heures_pour_recompense:5, nbre_participations:0,  remise_pourcentage:10, est_active:true  },
  { _id:'r3', titre_recompense:'Fidèle — 5 événements',        nbre_heures_pour_recompense:0, nbre_participations:5,  remise_pourcentage:15, est_active:true  },
  { _id:'r4', titre_recompense:'Champion — 10h de sport',      nbre_heures_pour_recompense:10,nbre_participations:0,  remise_pourcentage:25, est_active:false },
];

const MOCK_ACTIVITES = [
  { user:'Sana Trabelsi',  action:'Inscription', type:'inscription', event:'Match Football Ariana', date:'15/08/2024 09:12' },
  { user:'Mohamed Chaabane',action:'Inscription',type:'inscription', event:'Natation El Menzah',    date:'14/08/2024 18:45' },
  { user:'Rania Mansour',  action:'Présence QR', type:'presence',    event:'Natation El Menzah',    date:'20/08/2024 07:05' },
];

export default DashboardAdmin;
