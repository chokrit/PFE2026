// ============================================================
// DashboardUser.jsx — AVEC CRÉATION D'ÉVÉNEMENTS
// Emplacement : frontend/src/pages/dashboards/DashboardUser.jsx
//
// AJOUTS vs version précédente :
//   - Bouton "Proposer un événement" dans le header
//   - Modal de création avec formulaire complet
//   - Onglet "Mes créations" pour suivre ses événements soumis
//   - Statut visible (brouillon = en attente, publié = actif)
//   - Possibilité de supprimer ses propres brouillons
// ============================================================

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../api';
import StatCard from '../../components/dashboard/StatCard';
import EventCard from '../../components/dashboard/EventCard';
import RewardCard from '../../components/dashboard/RewardCard';
import QRModal from '../../components/dashboard/QRModal';
import MonEspaceModal from '../../components/dashboard/MonEspaceModal';
import ParticipantsModal from '../../components/dashboard/ParticipantsModal';
import PhotoGallery from '../../components/PhotoGallery';
import NotificationBell from '../../components/dashboard/NotificationBell';
import '../../styles/dashboard/dashboard.css';

const DashboardUser = () => {
  const navigate = useNavigate();
  const { isRTL } = useLanguage();

  const [utilisateur, setUtilisateur] = useState(null);
  const [mesInscriptions, setMesInscriptions] = useState([]);
  const [evenementsDispos, setEvenementsDispos] = useState([]);
  const [mesCreations, setMesCreations] = useState([]);
  const [mesRecompenses, setMesRecompenses] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [connexions, setConnexions] = useState({ demandes_recues: [], partenaires: [], likes_donnes: [], likes_recus: [] });
  const [locations, setLocations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('inscrits');
  const [qrModal, setQrModal] = useState(null);
  const [notif, setNotif] = useState(null);
  const [participantsModal, setParticipantsModal] = useState(null);
  const [photosModal, setPhotosModal] = useState(null);
  const [photosData, setPhotosData] = useState({});
  const [notingEvent, setNotingEvent] = useState(null);
  const [noteValue, setNoteValue] = useState(0);
  const [uploadingPhoto, setUploadingPhoto] = useState({});

  // Formulaire création
  const [profilForm, setProfilForm] = useState({
    first_name: '', last_name: '', telephone: '', sexe: '', langue: 'fr',
  });
  const [savingProfil, setSavingProfil] = useState(false);

  const [showMonEspace, setShowMonEspace] = useState(false);
  const [modalCreer, setModalCreer] = useState(false);
  const [savingEvent, setSavingEvent] = useState(false);
  const [form, setForm] = useState({
    title_event: '', event_description: '', ev_start_time: '',
    ev_end_time: '', max_participants: 10, location: '', categories: [],
  });

  // ── Session ──────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('event_token');
    const user = localStorage.getItem('event_user');
    if (!token) { navigate('/login'); return; }
    if (user) {
      const u = JSON.parse(user);
      setUtilisateur(u);
      setProfilForm({
        first_name: u.first_name || '',
        last_name: u.last_name || '',
        telephone: u.telephone || '',
        sexe: u.sexe || '',
        langue: u.langue || 'fr',
      });
    }
    charger();
  }, [navigate]);

  // ── Chargement ───────────────────────────────────────────
  const charger = async () => {
    setLoading(true);
    try {
      const [insc, evs, crea, locs, cats, sugg, cx] = await Promise.allSettled([
        api.get('/participations/mes-inscriptions'),
        api.get('/evenements'),
        api.get('/evenements/mes-evenements'),
        api.get('/locations'),
        api.get('/categories'),
        api.get('/evenements/suggestions'),
        api.get('/connexions/mes-connexions'),
      ]);
      if (insc.status === 'fulfilled') setMesInscriptions(insc.value.data.participations || []);
      if (evs.status === 'fulfilled') setEvenementsDispos(evs.value.data.evenements || []);
      if (crea.status === 'fulfilled') setMesCreations(crea.value.data.evenements || []);
      if (locs.status === 'fulfilled') setLocations(locs.value.data.locations || []);
      if (cats.status === 'fulfilled') setCategories(cats.value.data.categories || []);
      if (sugg.status === 'fulfilled') setSuggestions(sugg.value.data.suggestions || []);
      if (cx.status === 'fulfilled') setConnexions(cx.value.data.connexions || {});
      try {
        const rew = await api.get('/recompenses/mes-coupons');
        setMesRecompenses(rew.data.coupons || []);
      } catch { setMesRecompenses([]); }
    } finally { setLoading(false); }
  };

  const handleLogout = () => {
    localStorage.removeItem('event_token');
    localStorage.removeItem('event_user');
    navigate('/login');
  };

  const sInscrire = async (eventId) => {
    try {
      await api.post(`/participations/${eventId}/inscription`);
      flash('success', 'Inscription confirmée !');
      charger();
      setActiveTab('inscrits');
    } catch (err) {
      flash('error', err.response?.data?.message || 'Erreur inscription');
    }
  };

  const annulerInscription = async (eventId) => {
    if (!window.confirm('Annuler votre inscription à cet événement ?')) return;
    try {
      await api.delete(`/participations/${eventId}/annuler`);
      flash('success', 'Inscription annulée');
      charger();
    } catch (err) {
      flash('error', err.response?.data?.message || 'Erreur annulation');
    }
  };

  const sauvegarderProfil = async (e) => {
    e.preventDefault();
    setSavingProfil(true);
    try {
      const res = await api.put('/utilisateurs/profil', profilForm);
      const updated = res.data.utilisateur;
      const stored = { ...utilisateur, ...updated };
      localStorage.setItem('event_user', JSON.stringify(stored));
      setUtilisateur(stored);
      flash('success', 'Profil mis à jour');
    } catch {
      flash('error', 'Erreur mise à jour profil');
    } finally {
      setSavingProfil(false);
    }
  };

  // ── Soumettre un événement ────────────────────────────────
  const soumettreEvent = async (e) => {
    e.preventDefault();
    if (!form.title_event.trim() || !form.ev_start_time) {
      flash('error', 'Titre et date de début obligatoires');
      return;
    }
    setSavingEvent(true);
    try {
      const payload = {
        title_event: form.title_event.trim(),
        event_description: form.event_description.trim(),
        ev_start_time: form.ev_start_time,
        ev_end_time: form.ev_end_time || undefined,
        max_participants: Number(form.max_participants),
      };
      if (form.location) payload.location = form.location;
      if (form.categories.length) payload.categories = form.categories;

      const res = await api.post('/evenements', payload);
      flash('success', res.data.message);
      setModalCreer(false);
      setForm({ title_event: '', event_description: '', ev_start_time: '', ev_end_time: '', max_participants: 20, location: '', categories: [] });
      charger();
      setActiveTab('creations');
    } catch (err) {
      flash('error', err.response?.data?.message || 'Erreur création');
    } finally {
      setSavingEvent(false);
    }
  };

  // ── Supprimer un brouillon ────────────────────────────────
  const supprimerCreation = async (eventId) => {
    if (!window.confirm('Supprimer cet événement ?')) return;
    try {
      await api.delete(`/evenements/${eventId}`);
      flash('success', 'Événement supprimé');
      charger();
    } catch (err) {
      flash('error', err.response?.data?.message || 'Erreur suppression');
    }
  };

  const ouvrirPhotos = async (eventId) => {
    setPhotosModal(eventId);
    if (!photosData[eventId]) {
      try {
        const r = await api.get(`/medias/evenement/${eventId}`);
        setPhotosData(prev => ({ ...prev, [eventId]: r.data.medias || [] }));
      } catch { setPhotosData(prev => ({ ...prev, [eventId]: [] })); }
    }
  };

  const uploaderPhoto = async (eventId, file) => {
    setUploadingPhoto(prev => ({ ...prev, [eventId]: true }));
    try {
      const fd = new FormData();
      fd.append('photo', file);
      fd.append('type_media', 'photo_evenement');
      fd.append('evenement_id', eventId);
      const r = await api.post('/medias/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (r.data.success) {
        setPhotosData(prev => ({ ...prev, [eventId]: [...(prev[eventId] || []), r.data.media] }));
        flash('success', 'Photo ajoutée !');
      }
    } catch { flash('error', 'Erreur upload photo'); }
    setUploadingPhoto(prev => ({ ...prev, [eventId]: false }));
  };

  const soumettreNote = async () => {
    if (!notingEvent || noteValue < 1) return;
    try {
      await api.post(`/evenements/${notingEvent}/noter`, { note: noteValue });
      flash('success', 'Note enregistrée !');
      setNotingEvent(null);
      setNoteValue(0);
    } catch (err) {
      flash('error', err.response?.data?.message || 'Erreur notation');
    }
  };

  const repondrePartenaire = async (connexionId, statut) => {
    try {
      await api.put(`/connexions/partenaire/${connexionId}`, { statut });
      flash('success', statut === 'accepte' ? 'Partenariat accepté !' : 'Demande refusée');
      charger();
    } catch { flash('error', 'Erreur'); }
  };

  const flash = (type, message) => {
    setNotif({ type, message });
    setTimeout(() => setNotif(null), 4000);
  };

  const getNiveau = (pts) => {
    if (pts >= 500) return { label: 'Champion', color: '#ffd700', icon: '🏆' };
    if (pts >= 200) return { label: 'Avancé', color: '#00d4ff', icon: '⚡' };
    if (pts >= 50) return { label: 'Actif', color: '#00e676', icon: '🌟' };
    return { label: 'Débutant', color: '#888', icon: '🎯' };
  };

  const statutStyle = (s) => ({
    publié: { bg: 'rgba(0,230,118,.15)', color: '#00e676', label: '✓ Publié' },
    brouillon: { bg: 'rgba(255,107,0,.15)', color: '#ff6b00', label: '⏳ En attente de validation' },
    annulé: { bg: 'rgba(255,77,109,.15)', color: '#ff4d6d', label: '✕ Annulé' },
    terminé: { bg: 'rgba(136,136,136,.15)', color: '#888', label: '■ Terminé' },
  }[s] || { bg: '#1a1a35', color: '#888', label: s });

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

      {/* Notification */}
      {notif && (
        <div className={`dash-notif dash-notif--${notif.type}`}>
          {notif.type === 'success' ? '✓' : '⚠'} {notif.message}
        </div>
      )}

      {/* ── MODAL CRÉATION ÉVÉNEMENT ── */}
      {modalCreer && (
        <div className="dash-overlay" onClick={() => setModalCreer(false)}>
          <div className="dash-modal" onClick={e => e.stopPropagation()}>
            <div className="dash-modal__header">
              <h3>Proposer un événement</h3>
              <button className="dash-modal__close" onClick={() => setModalCreer(false)}>✕</button>
            </div>

            {/* Explication du processus */}
            <div style={{
              margin: '0 1.5rem 0',
              padding: '10px 14px',
              background: 'rgba(255,107,0,.1)',
              border: '1px solid rgba(255,107,0,.3)',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#ff6b00',
            }}>
              💡 Votre événement sera soumis en <strong>brouillon</strong>.
              L'administrateur le validera avant qu'il soit visible par tous.
            </div>

            <form onSubmit={soumettreEvent} className="admin-form">
              <div className="form-group">
                <label>Titre *</label>
                <input type="text" value={form.title_event}
                  onChange={e => setForm({ ...form, title_event: e.target.value })}
                  placeholder="Ex: Match de football entre amis" required />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea rows={3} value={form.event_description}
                  onChange={e => setForm({ ...form, event_description: e.target.value })}
                  placeholder="Niveau requis, règles, matériel à apporter..." />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Date et heure de début *</label>
                  <input type="datetime-local" value={form.ev_start_time}
                    onChange={e => {
                      const start = e.target.value;
                      let autoFin = '';
                      if (start) {
                        const d = new Date(start);
                        d.setHours(d.getHours() + 1);
                        const p = n => String(n).padStart(2, '0');
                        autoFin = `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
                      }
                      setForm({ ...form, ev_start_time: start, ev_end_time: autoFin });
                    }} required />
                </div>
                <div className="form-group">
                  <label>Date et heure de fin <span style={{ fontSize: 10, color: '#666' }}>(auto +1h, modifiable)</span></label>
                  <input type="datetime-local" value={form.ev_end_time}
                    onChange={e => setForm({ ...form, ev_end_time: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Participants max</label>
                  <input type="number" min="2" value={form.max_participants}
                    onChange={e => setForm({ ...form, max_participants: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Lieu</label>
                  <select value={form.location}
                    onChange={e => setForm({ ...form, location: e.target.value })}
                    style={{ background: '#1a1a35', color: '#e8e8f0', cursor: 'pointer' }}>
                    <option value="">— Sélectionner —</option>
                    {locations.map(l => <option key={l._id} value={l._id}>{l.name_location}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Type de sport</label>
                <select value={form.categories[0] || ''}
                  onChange={e => setForm({ ...form, categories: e.target.value ? [e.target.value] : [] })}
                  style={{ background: '#1a1a35', color: '#e8e8f0', cursor: 'pointer' }}>
                  <option value="">— Sélectionner —</option>
                  {categories.map(c => (
                    <option key={c._id} value={c._id}>{c.event_categ} — {c.event_type}</option>
                  ))}
                </select>
              </div>
              <div className="dash-modal__footer">
                <button type="submit" className="dash-btn-primary" disabled={savingEvent}>
                  {savingEvent ? 'Envoi...' : '📨 Soumettre l\'événement'}
                </button>
                <button type="button" className="dash-btn-ghost" onClick={() => setModalCreer(false)}>
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="dash-header">
        <div className="dash-header__left">
          <Link to="/" className="dash-logo">EVENT</Link>
          <span className="dash-breadcrumb">/ Mon espace</span>
        </div>
        <div className="dash-header__right">
          <div className="dash-niveau" style={{ color: niveau.color }}>
            <span>{niveau.icon}</span>
            <span>{niveau.label}</span>
          </div>
          <div className="dash-user-chip">
            <div className="dash-avatar" style={{ overflow: 'hidden', padding: utilisateur?.photo ? 0 : undefined }}>
              {utilisateur?.photo
                ? <img src={utilisateur.photo} alt="avatar"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                : <>{utilisateur?.first_name?.[0]}{utilisateur?.last_name?.[0]}</>
              }
            </div>
            <span className="dash-username">{utilisateur?.first_name} {utilisateur?.last_name}</span>
          </div>
          {utilisateur?.role === 'admin' && (
            <Link to="/admin" className="dash-btn-ghost">Panneau Admin</Link>
          )}
          {utilisateur?.role === 'organisateur' && (
            <Link to="/organisateur" className="dash-btn-ghost">Mon espace organisateur</Link>
          )}
          <NotificationBell />
          <button
            className="dash-btn-ghost"
            onClick={() => setShowMonEspace(true)}
            title="Modifier vos informations personnelles et votre mot de passe"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            👤 Mon compte
          </button>
          <button className="dash-btn-logout" onClick={handleLogout}>Déconnexion</button>
        </div>
      </header>

      <main className="dash-main">

        {/* Salutation + bouton créer */}
        <section className="dash-welcome">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h1 className="dash-welcome__title">
                Bonjour, <span className="dash-accent">{utilisateur?.first_name}</span> 👋
              </h1>
              <p className="dash-welcome__sub">Voici un résumé de votre activité sportive.</p>
            </div>
            {/* Bouton visible directement sans chercher */}
            <button className="dash-btn-primary" onClick={() => setModalCreer(true)}>
              + Proposer un événement
            </button>
          </div>
        </section>

        {/* Stats */}
        <section className="dash-stats-grid">
          <StatCard label="Points cumulés" value={utilisateur?.cumul_points || 0} icon="⚡" color="#00d4ff" trend={{ value: '+15 ce mois', direction: 'up' }} onClick={() => setActiveTab('recompenses')} />
          <StatCard label="Heures de sport" value={`${utilisateur?.cumul_heures_participation || 0}h`} icon="⏱" color="#00e676" />
          <StatCard label="Fiabilité" value={`${utilisateur?.reliabilite_score || 100}%`} icon="🎯" color={utilisateur?.reliabilite_score >= 80 ? '#00e676' : '#ff6b00'} />
          <StatCard label="Mes événements créés" value={mesCreations.length} icon="📋" color="#9c27b0" onClick={() => setActiveTab('creations')} />
        </section>

        {/* Barre progression */}
        <section className="dash-progress-section">
          <div className="dash-progress-header">
            <span className="dash-progress-label">Progression vers le niveau suivant</span>
            <span className="dash-progress-value">{utilisateur?.cumul_points || 0} / 200 pts</span>
          </div>
          <div className="dash-progress-bar">
            <div className="dash-progress-fill" style={{ width: `${Math.min(((utilisateur?.cumul_points || 0) / 200) * 100, 100)}%` }} />
          </div>
          <p className="dash-progress-hint">Participez à des événements pour gagner des points et débloquer des coupons !</p>
        </section>

        {/* Onglets */}
        <div className="dash-tabs">
          {[
            { key: 'inscrits', label: 'Mes inscriptions', count: mesInscriptions.length, color: '' },
            { key: 'explorer', label: 'Explorer', count: evenementsDispos.length, color: '' },
            { key: 'connexions', label: 'Connexions', count: (connexions.demandes_recues?.length || 0), color: '#ec4899' },
            { key: 'creations', label: 'Mes créations', count: mesCreations.length, color: '#9c27b0' },
            { key: 'recompenses', label: 'Récompenses', count: mesRecompenses.filter(r => !r.is_redeemed).length, color: '#ff6b00' },
            { key: 'profil', label: 'Mon profil', count: 0, color: '' },
          ].map(t => (
            <button key={t.key} className={`dash-tab ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>
              {t.label}
              {t.count > 0 && (
                <span className="dash-tab-badge" style={t.color ? { background: t.color } : {}}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="dash-tab-content">

          {/* ── Mes inscriptions ── */}
          {activeTab === 'inscrits' && (
            mesInscriptions.length === 0 ? (
              <div className="dash-empty">
                <p className="dash-empty__icon">🏃</p>
                <p className="dash-empty__text">Vous n'êtes inscrit à aucun événement.</p>
                <button className="dash-btn-primary" onClick={() => setActiveTab('explorer')}>Explorer →</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {mesInscriptions.map(ins => (
                  <div key={ins.id} style={{ background: '#12122a', border: '1px solid #2a2a4a', borderRadius: 14, padding: '1rem 1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: '#e8e8f0', marginBottom: 4 }}>{ins.titre}</div>
                        <div style={{ fontSize: 12, color: '#8888aa' }}>
                          📅 {ins.date ? new Date(ins.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Date N/A'} · 📍 {ins.lieu || 'N/A'}
                          {ins.is_present && <span style={{ marginLeft: 8, color: '#10b981', fontWeight: 600 }}>✅ Présent</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button className="dash-btn-ghost" style={{ fontSize: 12, padding: '5px 10px', color: ins.qr_utilise ? '#10b981' : undefined }}
                          onClick={() => setQrModal({ eventId: ins.eventId, token: ins.qr_token, titre: ins.titre, qr_utilise: ins.qr_utilise })}>
                          {ins.qr_utilise ? '✅ QR scanné' : '📱 QR'}
                        </button>
                        <button className="dash-btn-ghost" style={{ fontSize: 12, padding: '5px 10px' }}
                          onClick={() => setParticipantsModal(ins.eventId)}>
                          👥 Participants
                        </button>
                        <button className="dash-btn-ghost" style={{ fontSize: 12, padding: '5px 10px' }}
                          onClick={() => ouvrirPhotos(ins.eventId)}>
                          📷 Photos
                        </button>
                        {ins.is_present && (
                          <button className="dash-btn-ghost" style={{ fontSize: 12, padding: '5px 10px', color: '#f59e0b' }}
                            onClick={() => { setNotingEvent(ins.eventId); setNoteValue(0); }}>
                            ⭐ Noter
                          </button>
                        )}
                        <button onClick={() => annulerInscription(ins.eventId)}
                          style={{ fontSize: 12, padding: '5px 10px', background: 'rgba(255,77,109,.1)', color: '#ff4d6d', border: '1px solid rgba(255,77,109,.3)', borderRadius: 6, cursor: 'pointer', fontFamily: 'Poppins,sans-serif' }}>
                          Annuler
                        </button>
                      </div>
                    </div>
                    {/* Galerie photos inline */}
                    {photosModal === ins.eventId && (
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #2a2a4a' }}>
                        <PhotoGallery
                          photos={photosData[ins.eventId] || []}
                          peutAjouter={true}
                          uploading={!!uploadingPhoto[ins.eventId]}
                          onAjouter={(file) => uploaderPhoto(ins.eventId, file)}
                        />
                        <button onClick={() => setPhotosModal(null)} style={{ marginTop: 8, fontSize: 11, color: '#666', background: 'none', border: 'none', cursor: 'pointer' }}>Fermer galerie</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          )}

          {/* ── Explorer ── */}
          {activeTab === 'explorer' && (
            <div>
              {suggestions.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: '#a78bfa', marginBottom: 12 }}>✨ Recommandé pour vous</h3>
                  <div className="dash-events-grid">
                    {suggestions.slice(0, 4).map(ev => (
                      <div key={ev._id} style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', top: 8, right: 8, background: '#a78bfa22', color: '#a78bfa', fontSize: 10, padding: '2px 7px', borderRadius: 99, fontWeight: 600, zIndex: 1 }}>
                          {Math.round((ev.score || 0) * 100)}% match
                        </span>
                        <EventCard event={{ ...ev, id: ev._id }} mode="explorer" onSInscrire={() => sInscrire(ev._id)} />
                      </div>
                    ))}
                  </div>
                  <hr style={{ border: 'none', borderTop: '1px solid #2a2a4a', margin: '20px 0' }} />
                </div>
              )}
              {evenementsDispos.length === 0 ? (
                <div className="dash-empty">
                  <p className="dash-empty__icon">📅</p>
                  <p className="dash-empty__text">Aucun événement disponible.</p>
                  <button className="dash-btn-primary" onClick={() => setModalCreer(true)}>
                    + Proposer le premier événement
                  </button>
                </div>
              ) : (
                <div className="dash-events-grid">
                  {evenementsDispos.map(ev => (
                    <EventCard key={ev._id} event={{ ...ev, id: ev._id }} mode="explorer"
                      onSInscrire={() => sInscrire(ev._id)} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Connexions ── */}
          {activeTab === 'connexions' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Demandes reçues */}
              {(connexions.demandes_recues?.length || 0) > 0 && (
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: '#ec4899', marginBottom: 10 }}>🤝 Demandes reçues ({connexions.demandes_recues.length})</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {connexions.demandes_recues.map(cx => (
                      <div key={cx._id} style={{ background: '#12122a', border: '1px solid #2a2a4a', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <span style={{ color: '#e8e8f0', fontWeight: 600 }}>{cx.demandeur?.first_name} {cx.demandeur?.last_name}</span>
                          <span style={{ color: '#666', fontSize: 12, marginLeft: 8 }}>via {cx.evenement?.title_event}</span>
                        </div>
                        <button onClick={() => repondrePartenaire(cx._id, 'accepte')}
                          style={{ background: '#10b98122', color: '#10b981', border: '1px solid #10b981', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 12 }}>
                          Accepter
                        </button>
                        <button onClick={() => repondrePartenaire(cx._id, 'refuse')}
                          style={{ background: '#ef444422', color: '#ef4444', border: '1px solid #ef4444', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 12 }}>
                          Refuser
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Partenaires */}
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: '#10b981', marginBottom: 10 }}>✅ Partenaires ({connexions.partenaires?.length || 0})</h3>
                {(connexions.partenaires?.length || 0) === 0
                  ? <p style={{ color: '#555', fontSize: 13 }}>Aucun partenaire pour l'instant.</p>
                  : <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {connexions.partenaires.map(cx => {
                        const autre = cx.demandeur?.first_name ? cx.demandeur : cx.receveur;
                        return (
                          <div key={cx._id} style={{ background: '#12122a', border: '1px solid #2a2a4a', borderRadius: 10, padding: '8px 14px', fontSize: 13, color: '#e8e8f0' }}>
                            🤝 {autre?.first_name} {autre?.last_name}
                          </div>
                        );
                      })}
                    </div>
                }
              </div>
              {/* Likes */}
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: '#ef4444', marginBottom: 10 }}>❤️ Likes donnés ({connexions.likes_donnes?.length || 0})</h3>
                {(connexions.likes_donnes?.length || 0) === 0
                  ? <p style={{ color: '#555', fontSize: 13 }}>Vous n'avez encore liké personne.</p>
                  : <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {connexions.likes_donnes.map(cx => (
                        <div key={cx._id} style={{ background: '#12122a', border: '1px solid #2a2a4a', borderRadius: 10, padding: '8px 14px', fontSize: 13, color: '#e8e8f0' }}>
                          ❤️ {cx.receveur?.first_name} {cx.receveur?.last_name}
                        </div>
                      ))}
                    </div>
                }
              </div>
            </div>
          )}

          {/* ── Mes créations ── */}
          {activeTab === 'creations' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#e8e8f0' }}>
                  Événements que j'ai proposés
                </h3>
                <button className="dash-btn-primary" onClick={() => setModalCreer(true)}>
                  + Proposer un événement
                </button>
              </div>

              {mesCreations.length === 0 ? (
                <div className="dash-empty">
                  <p className="dash-empty__icon">📋</p>
                  <p className="dash-empty__text">Vous n'avez encore proposé aucun événement.</p>
                  <button className="dash-btn-primary" onClick={() => setModalCreer(true)}>
                    Proposer mon premier événement
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {mesCreations.map(ev => {
                      const s = statutStyle(ev.stat_event);
                      return (
                        <div key={ev._id} style={{
                          background: '#12122a', border: '1px solid #2a2a4a', borderRadius: '14px',
                          padding: '1.25rem', display: 'flex', justifyContent: 'space-between',
                          alignItems: 'center', gap: '16px', flexWrap: 'wrap',
                        }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '15px', fontWeight: 600, color: '#e8e8f0', marginBottom: '6px' }}>
                              {ev.title_event}
                            </div>
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '12px', color: '#8888aa' }}>
                              <span>📅 {new Date(ev.ev_start_time).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                              <span>📍 {ev.lieu || 'Lieu non défini'}</span>
                              <span>👥 {ev.nb_inscrits || 0}/{ev.max_participants} inscrits</span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                            <span style={{ padding: '4px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, background: s.bg, color: s.color }}>
                              {s.label}
                            </span>
                            {ev.stat_event === 'brouillon' && (
                              <button onClick={() => supprimerCreation(ev._id)} style={{
                                padding: '6px 12px', background: 'rgba(255,77,109,.15)', color: '#ff4d6d',
                                border: '1px solid rgba(255,77,109,.3)', borderRadius: '6px',
                                fontSize: '12px', cursor: 'pointer', fontFamily: 'Poppins,sans-serif',
                              }}>
                                Supprimer
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Légende */}
                  <div style={{ marginTop: '1.5rem', padding: '12px 16px', background: '#1a1a35', borderRadius: '10px', fontSize: '12px', color: '#8888aa' }}>
                    <strong style={{ color: '#e8e8f0' }}>Comment ça marche ?</strong><br />
                    Vos événements soumis partent en{' '}
                    <span style={{ color: '#ff6b00' }}>brouillon</span> et doivent être validés par l'administrateur.
                    Une fois <span style={{ color: '#00e676' }}>publié</span>, les participants pourront s'inscrire.
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Récompenses ── */}
          {activeTab === 'recompenses' && (
            mesRecompenses.length === 0 ? (
              <div className="dash-empty">
                <p className="dash-empty__icon">🎫</p>
                <p className="dash-empty__text">Participez à des événements pour gagner des coupons !</p>
              </div>
            ) : (
              <div className="dash-rewards-grid">
                {mesRecompenses.map(r => <RewardCard key={r.id} recompense={r} />)}
              </div>
            )
          )}
          {/* ── Mon profil ── */}
          {activeTab === 'profil' && (
            <div style={{ maxWidth: '520px' }}>
              <div className="orga-form-card">
                <form onSubmit={sauvegarderProfil} className="admin-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Prénom *</label>
                      <input type="text" value={profilForm.first_name}
                        onChange={e => setProfilForm({ ...profilForm, first_name: e.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label>Nom *</label>
                      <input type="text" value={profilForm.last_name}
                        onChange={e => setProfilForm({ ...profilForm, last_name: e.target.value })} required />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Téléphone</label>
                    <input type="tel" value={profilForm.telephone}
                      onChange={e => setProfilForm({ ...profilForm, telephone: e.target.value })}
                      placeholder="+216 XX XXX XXX" />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Sexe</label>
                      <select value={profilForm.sexe}
                        onChange={e => setProfilForm({ ...profilForm, sexe: e.target.value })}
                        style={{ background: '#1a1a35', color: '#e8e8f0', cursor: 'pointer' }}>
                        <option value="">— Non précisé —</option>
                        <option value="homme">Homme</option>
                        <option value="femme">Femme</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Langue</label>
                      <select value={profilForm.langue}
                        onChange={e => setProfilForm({ ...profilForm, langue: e.target.value })}
                        style={{ background: '#1a1a35', color: '#e8e8f0', cursor: 'pointer' }}>
                        <option value="fr">Français</option>
                        <option value="en">English</option>
                        <option value="ar">العربية</option>
                        <option value="ar-tn">تونسي</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ marginTop: '1rem' }}>
                    <button type="submit" className="dash-btn-primary" disabled={savingProfil}>
                      {savingProfil ? 'Enregistrement...' : 'Sauvegarder'}
                    </button>
                  </div>
                </form>

                <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #2a2a4a' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '1rem', color: '#8888aa' }}>Mes statistiques</h3>
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '110px', background: '#0a0a1a', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '22px', fontWeight: 700, color: '#00d4ff' }}>{utilisateur?.cumul_points || 0}</div>
                      <div style={{ fontSize: '11px', color: '#8888aa', marginTop: '4px' }}>Points</div>
                    </div>
                    <div style={{ flex: 1, minWidth: '110px', background: '#0a0a1a', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '22px', fontWeight: 700, color: '#00e676' }}>{utilisateur?.cumul_heures_participation || 0}h</div>
                      <div style={{ fontSize: '11px', color: '#8888aa', marginTop: '4px' }}>Heures</div>
                    </div>
                    <div style={{ flex: 1, minWidth: '110px', background: '#0a0a1a', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '22px', fontWeight: 700, color: '#ffd700' }}>{utilisateur?.reliabilite_score ?? 100}%</div>
                      <div style={{ fontSize: '11px', color: '#8888aa', marginTop: '4px' }}>Fiabilité</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {qrModal && <QRModal token={qrModal.token} titre={qrModal.titre} qr_utilise={qrModal.qr_utilise} onClose={() => setQrModal(null)} />}
      {showMonEspace && (
        <MonEspaceModal
          utilisateur={utilisateur}
          onClose={() => setShowMonEspace(false)}
          onUpdate={(u) => setUtilisateur(u)}
        />
      )}
      {participantsModal && (
        <ParticipantsModal evenementId={participantsModal} onClose={() => setParticipantsModal(null)} />
      )}
      {/* Modal noter événement */}
      {notingEvent && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setNotingEvent(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#1e1e2e', borderRadius: 16, padding: 28, minWidth: 280, textAlign: 'center' }}>
            <h3 style={{ color: '#e8e8f0', marginBottom: 16, fontSize: 16 }}>⭐ Noter cet événement</h3>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => setNoteValue(n)}
                  style={{ fontSize: 28, background: 'none', border: 'none', cursor: 'pointer', opacity: n <= noteValue ? 1 : 0.3 }}>
                  ⭐
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="dash-btn-primary" onClick={soumettreNote} disabled={noteValue === 0}>Enregistrer</button>
              <button className="dash-btn-ghost" onClick={() => setNotingEvent(null)}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardUser;
