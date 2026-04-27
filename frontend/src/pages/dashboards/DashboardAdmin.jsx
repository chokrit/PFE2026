// ============================================================
// DashboardAdmin.jsx — AVEC VALIDATION DES ÉVÉNEMENTS SOUMIS
// Emplacement : frontend/src/pages/dashboards/DashboardAdmin.jsx
//
// AJOUTS vs version précédente :
//   - Alerte orange si des événements attendent validation
//   - Section "À valider" en haut du tableau événements
//   - Colonne "Créateur" pour voir qui a soumis quoi
//   - Filtre par statut (tous / publié / brouillon / annulé)
//   - Badge "X à valider" sur le bouton nav
// ============================================================

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../api';
import StatCard from '../../components/dashboard/StatCard';
import MonEspaceModal from '../../components/dashboard/MonEspaceModal';
import '../../styles/dashboard/dashboard.css';
import '../../styles/dashboard/admin.css';

const DashboardAdmin = () => {
  const navigate = useNavigate();
  const { isRTL } = useLanguage();

  const [adminUser, setAdminUser] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [notif, setNotif] = useState(null);

  const [utilisateurs, setUtilisateurs] = useState([]);
  const [evenements, setEvenements] = useState([]);
  const [locations, setLocations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [kpis, setKpis] = useState({ totalUsers: 0, activeEvents: 0, totalParticipations: 0, avgReliability: 0 });

  const [modalEvent, setModalEvent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title_event: '', event_description: '', ev_start_time: '',
    ev_end_time: '', max_participants: 30, location: '', categories: [], stat_event: 'brouillon',
  });

  const [userSearch, setUserSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [filtreStatut, setFiltreStatut] = useState('tous');
  const [showMonEspace, setShowMonEspace] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('event_token');
    const user = localStorage.getItem('event_user');
    if (!token) { navigate('/login'); return; }
    if (user) {
      const u = JSON.parse(user);
      if (u.role !== 'admin') { navigate('/dashboards'); return; }
      setAdminUser(u);
    }
    charger();
  }, [navigate]);

  const charger = async () => {
    setLoading(true);
    try {
      const [usersR, evsR, locsR, catsR] = await Promise.allSettled([
        api.get('/utilisateurs'),
        api.get('/evenements/all'),
        api.get('/locations'),
        api.get('/categories'),
      ]);
      if (usersR.status === 'fulfilled') {
        const users = usersR.value.data.utilisateurs || [];
        setUtilisateurs(users);
        setKpis(p => ({
          ...p, totalUsers: users.length,
          avgReliability: users.length > 0 ? Math.round(users.reduce((s, u) => s + (u.reliabilite_score || 0), 0) / users.length) : 0,
        }));
      }
      if (evsR.status === 'fulfilled') {
        const evs = evsR.value.data.evenements || [];
        setEvenements(evs);
        setKpis(p => ({
          ...p,
          activeEvents: evs.filter(e => e.stat_event === 'publié').length,
          totalParticipations: evs.reduce((s, e) => s + (e.nb_inscrits || 0), 0),
        }));
      }
      if (locsR.status === 'fulfilled') setLocations(locsR.value.data.locations || []);
      if (catsR.status === 'fulfilled') setCategories(catsR.value.data.categories || []);
    } finally { setLoading(false); }
  };

  const flash = (type, msg) => { setNotif({ type, msg }); setTimeout(() => setNotif(null), 4000); };

  const changerRole = async (userId, role) => {
    try {
      await api.put(`/utilisateurs/${userId}/role`, { role });
      setUtilisateurs(p => p.map(u => u._id === userId ? { ...u, role } : u));
      flash('success', `Rôle changé en "${role}"`);
    } catch { flash('error', 'Erreur changement rôle'); }
  };

  const supprimerUser = async (userId) => {
    try {
      await api.delete(`/utilisateurs/${userId}`);
      setUtilisateurs(p => p.filter(u => u._id !== userId));
      setConfirmDelete(null);
      flash('success', 'Utilisateur supprimé');
    } catch { flash('error', 'Erreur suppression'); }
  };

  const creerEvent = async (e) => {
    e.preventDefault();
    if (!newEvent.title_event.trim() || !newEvent.ev_start_time) { flash('error', 'Titre et date obligatoires'); return; }
    setSaving(true);
    try {
      const payload = {
        title_event: newEvent.title_event.trim(),
        event_description: newEvent.event_description.trim(),
        ev_start_time: newEvent.ev_start_time,
        ev_end_time: newEvent.ev_end_time || undefined,
        max_participants: Number(newEvent.max_participants),
        stat_event: newEvent.stat_event,
      };
      if (newEvent.location) payload.location = newEvent.location;
      if (newEvent.categories.length) payload.categories = newEvent.categories;
      const res = await api.post('/evenements', payload);
      flash('success', res.data.message || 'Événement créé !');
      setModalEvent(false);
      setNewEvent({ title_event: '', event_description: '', ev_start_time: '', ev_end_time: '', max_participants: 30, location: '', categories: [], stat_event: 'brouillon' });
      charger();
    } catch (err) {
      flash('error', err.response?.data?.message || 'Erreur création');
    } finally { setSaving(false); }
  };

  const changerStatut = async (id, statut) => {
    try {
      await api.put(`/evenements/${id}`, { stat_event: statut });
      setEvenements(p => p.map(e => e._id === id ? { ...e, stat_event: statut } : e));
      flash('success', `Événement ${statut}`);
    } catch { flash('error', 'Erreur statut'); }
  };

  const supprimerEvent = async (id) => {
    if (!window.confirm('Supprimer cet événement et toutes ses inscriptions ?')) return;
    try {
      await api.delete(`/evenements/${id}`);
      setEvenements(p => p.filter(e => e._id !== id));
      flash('success', 'Événement supprimé');
    } catch { flash('error', 'Erreur suppression'); }
  };

  const usersFiltres = utilisateurs.filter(u => `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(userSearch.toLowerCase()));
  const evsFiltres = filtreStatut === 'tous' ? evenements : evenements.filter(e => e.stat_event === filtreStatut);

  // Événements soumis par des users qui attendent validation
  const aValider = evenements.filter(ev =>
    ev.stat_event === 'brouillon' &&
    ev.createur?._id &&
    adminUser?._id &&
    ev.createur._id.toString() !== adminUser._id.toString()
  );

  const badge = (s) => ({
    publié: { cls: 'badge-success', label: 'Publié' },
    brouillon: { cls: 'badge-warning', label: 'Brouillon' },
    annulé: { cls: 'badge-danger', label: 'Annulé' },
    terminé: { cls: 'badge-gray', label: 'Terminé' },
  }[s] || { cls: 'badge-gray', label: s });

  if (loading) return <div className="dash-loading"><div className="dash-spinner"></div><p>Chargement admin...</p></div>;

  return (
    <div className={`dashboard-page admin-page ${isRTL ? 'rtl' : ''}`}>

      {showMonEspace && (
        <MonEspaceModal
          utilisateur={adminUser}
          onClose={() => setShowMonEspace(false)}
          onUpdate={(u) => setAdminUser(u)}
        />
      )}

      {notif && (
        <div className={`dash-notif dash-notif--${notif.type}`}>
          {notif.type === 'success' ? '✓' : '⚠'} {notif.msg}
        </div>
      )}

      {confirmDelete && (
        <div className="dash-overlay">
          <div className="dash-confirm-modal">
            <h3>Confirmer la suppression</h3>
            <p>Supprimer <strong>{confirmDelete.nom}</strong> ?</p>
            <p className="dash-confirm-warning">⚠ Action irréversible.</p>
            <div className="dash-confirm-btns">
              <button className="dash-btn-danger" onClick={() => supprimerUser(confirmDelete.id)}>Supprimer</button>
              <button className="dash-btn-ghost" onClick={() => setConfirmDelete(null)}>Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="dash-header admin-header">
        <div className="dash-header__left">
          <Link to="/" className="dash-logo">EVENT</Link>
          <span className="dash-breadcrumb">/ Administration</span>
          <span className="admin-badge">ADMIN</span>
        </div>
        <div className="dash-header__right">
          <div className="dash-user-chip">
            <div className="dash-avatar" style={{ overflow: 'hidden', padding: adminUser?.photo ? 0 : undefined }}>
              {adminUser?.photo
                ? <img src={adminUser.photo} alt="avatar"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                : <>{adminUser?.first_name?.[0]}{adminUser?.last_name?.[0]}</>
              }
            </div>
            <span className="dash-username">{adminUser?.first_name} {adminUser?.last_name}</span>
          </div>
          <button
            className="dash-btn-ghost"
            onClick={() => setShowMonEspace(true)}
            title="Modifier vos informations personnelles et votre mot de passe"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            👤 Mon compte
          </button>
          <button className="dash-btn-logout" onClick={() => { localStorage.clear(); navigate('/login'); }}>Déconnexion</button>
        </div>
      </header>

      <main className="dash-main">

        {/* Nav */}
        <nav className="admin-nav">
          {[
            { key: 'overview', label: 'Vue globale', icon: '📊' },
            { key: 'users', label: 'Utilisateurs', icon: '👥' },
            { key: 'events', label: 'Événements', icon: '🏟' },
          ].map(t => (
            <button key={t.key} className={`admin-nav-btn ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>
              <span className="admin-nav-icon">{t.icon}</span>
              {t.label}
              {t.key === 'users' && <span className="dash-tab-badge">{utilisateurs.length}</span>}
              {t.key === 'events' && <>
                <span className="dash-tab-badge">{evenements.length}</span>
                {aValider.length > 0 && (
                  <span style={{ background: '#ff4d6d', color: '#fff', borderRadius: '999px', fontSize: '10px', fontWeight: 700, padding: '1px 6px' }}>
                    {aValider.length} à valider
                  </span>
                )}
              </>}
            </button>
          ))}
        </nav>

        {/* ══ VUE GLOBALE ══ */}
        {activeTab === 'overview' && (
          <div>
            <h2 className="dash-section-title">Vue d'ensemble</h2>
            <div className="dash-stats-grid">
              <StatCard label="Utilisateurs" value={kpis.totalUsers} icon="👥" color="#00d4ff" />
              <StatCard label="Publiés" value={kpis.activeEvents} icon="🏟" color="#00e676" />
              <StatCard label="Participations" value={kpis.totalParticipations} icon="✅" color="#ff6b00" />
              <StatCard label="Fiabilité moy." value={`${kpis.avgReliability}%`} icon="📈" color="#ffd700" />
            </div>

            {/* Alerte à valider */}
            {aValider.length > 0 && (
              <div style={{
                marginTop: '1.5rem', padding: '14px 18px',
                background: 'rgba(255,107,0,.1)', border: '1px solid rgba(255,107,0,.4)',
                borderRadius: '12px', display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', gap: '12px', flexWrap: 'wrap',
              }}>
                <div>
                  <span style={{ color: '#ff6b00', fontWeight: 700, fontSize: '15px' }}>
                    ⏳ {aValider.length} événement{aValider.length > 1 ? 's' : ''} en attente de validation
                  </span>
                  <p style={{ color: '#8888aa', fontSize: '12px', margin: '4px 0 0' }}>
                    Des utilisateurs ont soumis des événements qui nécessitent votre approbation.
                  </p>
                </div>
                <button className="dash-btn-primary" onClick={() => setActiveTab('events')}>
                  Valider maintenant →
                </button>
              </div>
            )}

            <div className="admin-card" style={{ marginTop: '1.5rem' }}>
              <div className="admin-card__header">
                <h3>Derniers événements</h3>
                <button className="dash-btn-primary" onClick={() => setActiveTab('events')}>Gérer →</button>
              </div>
              <table className="admin-table">
                <thead><tr><th>Titre</th><th>Créateur</th><th>Statut</th><th>Inscrits</th></tr></thead>
                <tbody>
                  {evenements.slice(0, 5).map(ev => {
                    const b = badge(ev.stat_event);
                    return (
                      <tr key={ev._id}>
                        <td>{ev.title_event}</td>
                        <td className="text-muted" style={{ fontSize: '12px' }}>{ev.createur?.first_name} {ev.createur?.last_name}</td>
                        <td><span className={`badge ${b.cls}`}>{b.label}</span></td>
                        <td>{ev.nb_inscrits || 0}/{ev.max_participants}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══ UTILISATEURS ══ */}
        {activeTab === 'users' && (
          <div>
            <div className="admin-section-header">
              <h2 className="dash-section-title">Gestion des utilisateurs</h2>
              <input type="search" className="admin-search" placeholder="Rechercher..."
                value={userSearch} onChange={e => setUserSearch(e.target.value)} />
            </div>
            <div className="admin-card">
              <table className="admin-table">
                <thead><tr><th>Utilisateur</th><th>Email</th><th>Rôle</th><th>Points</th><th>Fiabilité</th><th>Actions</th></tr></thead>
                <tbody>
                  {usersFiltres.map(u => (
                    <tr key={u._id}>
                      <td>
                        <div className="admin-user-cell">
                          <div className="dash-avatar dash-avatar--sm">{u.first_name?.[0]}{u.last_name?.[0]}</div>
                          {u.first_name} {u.last_name}
                        </div>
                      </td>
                      <td className="text-muted">{u.email}</td>
                      <td>
                        <select
                          className={`admin-role-select ${u.role === 'admin' ? 'role-admin' : u.role === 'organisateur' ? 'role-orga' : 'role-user'}`}
                          value={u.role} onChange={e => changerRole(u._id, e.target.value)}>
                          <option value="user">user</option>
                          <option value="organisateur">organisateur</option>
                          <option value="admin">admin</option>
                        </select>
                      </td>
                      <td>{u.cumul_points || 0} pts</td>
                      <td>
                        <div className="admin-reliability">
                          <div className="admin-reliability-bar" style={{ width: `${u.reliabilite_score || 0}%`, background: (u.reliabilite_score || 0) >= 80 ? '#00e676' : '#ff6b00' }} />
                          <span>{u.reliabilite_score || 0}%</span>
                        </div>
                      </td>
                      <td>
                        <button className="admin-btn-icon admin-btn-danger"
                          onClick={() => setConfirmDelete({ id: u._id, nom: `${u.first_name} ${u.last_name}` })}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══ ÉVÉNEMENTS ══ */}
        {activeTab === 'events' && (
          <div>
            <div className="admin-section-header">
              <h2 className="dash-section-title">Gestion des événements</h2>
              <button className="dash-btn-primary" onClick={() => setModalEvent(true)}>+ Créer</button>
            </div>

            {/* Événements à valider — section prioritaire */}
            {aValider.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#ff6b00', marginBottom: '10px' }}>
                  ⏳ À valider ({aValider.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {aValider.map(ev => (
                    <div key={ev._id} style={{
                      background: 'rgba(255,107,0,.05)', border: '1px solid rgba(255,107,0,.3)',
                      borderRadius: '10px', padding: '12px 16px',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
                    }}>
                      <div>
                        <div style={{ fontWeight: 600, color: '#e8e8f0', marginBottom: '4px' }}>{ev.title_event}</div>
                        <div style={{ fontSize: '12px', color: '#8888aa' }}>
                          Soumis par : {ev.createur?.first_name} {ev.createur?.last_name}
                          {' · '}{new Date(ev.ev_start_time).toLocaleDateString('fr-FR')}
                          {' · '}{ev.max_participants} places
                          {ev.lieu && ev.lieu !== 'Lieu non défini' && ` · ${ev.lieu}`}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="admin-btn-sm admin-btn-success" onClick={() => changerStatut(ev._id, 'publié')}>
                          ✓ Publier
                        </button>
                        <button className="admin-btn-sm" onClick={() => supprimerEvent(ev._id)}
                          style={{ background: 'rgba(255,77,109,.15)', color: '#ff4d6d', border: '1px solid rgba(255,77,109,.3)' }}>
                          ✕ Refuser
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Filtre statut */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
              {['tous', 'publié', 'brouillon', 'annulé', 'terminé'].map(s => (
                <button key={s} onClick={() => setFiltreStatut(s)} style={{
                  padding: '4px 14px', fontSize: '12px', cursor: 'pointer', borderRadius: '999px',
                  background: filtreStatut === s ? '#00d4ff' : 'transparent',
                  color: filtreStatut === s ? '#0a0a1a' : '#8888aa',
                  border: '1px solid', borderColor: filtreStatut === s ? '#00d4ff' : '#2a2a4a',
                  fontWeight: filtreStatut === s ? 700 : 400, fontFamily: 'Poppins,sans-serif',
                  textTransform: 'capitalize',
                }}>
                  {s === 'tous' ? `Tous (${evenements.length})` : `${s} (${evenements.filter(e => e.stat_event === s).length})`}
                </button>
              ))}
            </div>

            {/* Tableau */}
            <div className="admin-card">
              <table className="admin-table">
                <thead><tr><th>Titre</th><th>Créateur</th><th>Date</th><th>Places</th><th>Statut</th><th>Actions</th></tr></thead>
                <tbody>
                  {evsFiltres.length === 0 ? (
                    <tr><td colSpan="6" style={{ textAlign: 'center', color: '#8888aa', padding: '2rem' }}>Aucun événement.</td></tr>
                  ) : evsFiltres.map(ev => {
                    const b = badge(ev.stat_event);
                    return (
                      <tr key={ev._id}>
                        <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title_event}</td>
                        <td className="text-muted" style={{ fontSize: '12px' }}>{ev.createur?.first_name} {ev.createur?.last_name}</td>
                        <td className="text-muted" style={{ fontSize: '12px' }}>{new Date(ev.ev_start_time).toLocaleDateString('fr-FR')}</td>
                        <td style={{ fontSize: '12px' }}>{ev.nb_inscrits || 0}/{ev.max_participants}</td>
                        <td><span className={`badge ${b.cls}`}>{b.label}</span></td>
                        <td>
                          <div className="admin-actions">
                            {ev.stat_event === 'brouillon' && <button className="admin-btn-sm admin-btn-success" onClick={() => changerStatut(ev._id, 'publié')}>Publier</button>}
                            {ev.stat_event === 'publié' && <button className="admin-btn-sm admin-btn-warning" onClick={() => changerStatut(ev._id, 'annulé')}>Annuler</button>}
                            <button className="admin-btn-icon admin-btn-danger" onClick={() => supprimerEvent(ev._id)} title="Supprimer">✕</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Modal création */}
            {modalEvent && (
              <div className="dash-overlay">
                <div className="dash-modal">
                  <div className="dash-modal__header">
                    <h3>Créer un événement</h3>
                    <button className="dash-modal__close" onClick={() => setModalEvent(false)}>✕</button>
                  </div>
                  <form onSubmit={creerEvent} className="admin-form">
                    <div className="form-group">
                      <label>Titre *</label>
                      <input type="text" value={newEvent.title_event}
                        onChange={e => setNewEvent({ ...newEvent, title_event: e.target.value })}
                        placeholder="Ex: Tournoi Football Ariana" required />
                    </div>
                    <div className="form-group">
                      <label>Description</label>
                      <textarea rows={3} value={newEvent.event_description}
                        onChange={e => setNewEvent({ ...newEvent, event_description: e.target.value })}
                        placeholder="Décrivez l'événement..." />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Date début *</label>
                        <input type="datetime-local" value={newEvent.ev_start_time}
                          onChange={e => setNewEvent({ ...newEvent, ev_start_time: e.target.value })} required />
                      </div>
                      <div className="form-group">
                        <label>Date fin</label>
                        <input type="datetime-local" value={newEvent.ev_end_time}
                          onChange={e => setNewEvent({ ...newEvent, ev_end_time: e.target.value })} />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Participants max</label>
                        <input type="number" min="1" value={newEvent.max_participants}
                          onChange={e => setNewEvent({ ...newEvent, max_participants: e.target.value })} />
                      </div>
                      <div className="form-group">
                        <label>Statut initial</label>
                        <select value={newEvent.stat_event}
                          onChange={e => setNewEvent({ ...newEvent, stat_event: e.target.value })}
                          style={{ background: '#1a1a35', color: '#e8e8f0', cursor: 'pointer' }}>
                          <option value="brouillon">Brouillon</option>
                          <option value="publié">Publier directement</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Lieu</label>
                      <select value={newEvent.location}
                        onChange={e => setNewEvent({ ...newEvent, location: e.target.value })}
                        style={{ background: '#1a1a35', color: '#e8e8f0', cursor: 'pointer' }}>
                        <option value="">— Sélectionner —</option>
                        {locations.map(l => <option key={l._id} value={l._id}>{l.name_location}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Catégorie</label>
                      <select value={newEvent.categories[0] || ''}
                        onChange={e => setNewEvent({ ...newEvent, categories: e.target.value ? [e.target.value] : [] })}
                        style={{ background: '#1a1a35', color: '#e8e8f0', cursor: 'pointer' }}>
                        <option value="">— Sélectionner —</option>
                        {categories.map(c => <option key={c._id} value={c._id}>{c.event_categ} — {c.event_type}</option>)}
                      </select>
                    </div>
                    <div className="dash-modal__footer">
                      <button type="submit" className="dash-btn-primary" disabled={saving}>
                        {saving ? 'Enregistrement...' : 'Créer l\'événement'}
                      </button>
                      <button type="button" className="dash-btn-ghost" onClick={() => setModalEvent(false)}>Annuler</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
};

export default DashboardAdmin;
