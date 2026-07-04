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
import GalerieModal from '../../components/dashboard/GalerieModal';
import MonEspaceModal from '../../components/dashboard/MonEspaceModal';
import ParticipantsModal from '../../components/dashboard/ParticipantsModal';
import ThemeSelector from '../../components/dashboard/ThemeSelector';
import '../../styles/dashboard/dashboard.css';

const toDatetimeLocal = (d) => {
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const DashboardUser = () => {
  const navigate = useNavigate();
  const { isRTL } = useLanguage();

  const [utilisateur, setUtilisateur] = useState(null);
  const [mesInscriptions, setMesInscriptions] = useState([]);
  const [evenementsDispos, setEvenementsDispos] = useState([]);
  const [mesCreations, setMesCreations] = useState([]);
  const [mesRecompenses, setMesRecompenses] = useState([]);
  const [suggestions, setSuggestions]       = useState([]);
  const [locations, setLocations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('inscrits');
  const [qrModal, setQrModal] = useState(null);
  const [participantsModal, setParticipantsModal] = useState(null);
  const [galerieOpen, setGalerieOpen] = useState(false);
  const [notif, setNotif] = useState(null);

  // ── Galerie par événement ─────────────────────────────────
  const [galerieEvent, setGalerieEvent]   = useState(null);   // { eventId, titre } ou null
  const [photosEvent, setPhotosEvent]     = useState([]);      // médias approuvés de l'événement ouvert
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [uploading, setUploading]         = useState(false);
  const [lightboxIdx, setLightboxIdx]     = useState(null);    // index image agrandie

  // Formulaire création
  const [modalCreer, setModalCreer] = useState(false);
  const [savingEvent, setSavingEvent] = useState(false);

  // Suggestion de lieu (formulaire inline dans création)
  const [showSuggLieu, setShowSuggLieu]   = useState(false);
  const [suggLieuNom, setSuggLieuNom]     = useState('');
  const [suggLieuCap, setSuggLieuCap]     = useState('');
  const [savingSuggLieu, setSavingSuggLieu] = useState(false);

  // ── Mon compte (modal) ───────────────────────────────────
  const [showMonEspace, setShowMonEspace] = useState(false);

  // ── Mon profil (onglet) ──────────────────────────────────
  const [profilForm, setProfilForm] = useState({ first_name: '', last_name: '', telephone: '', langue: 'fr' });
  const [savingProfil, setSavingProfil] = useState(false);

  const [form, setForm] = useState({
    title_event: '', event_description: '', ev_start_time: '',
    ev_end_time: '', max_participants: 10, location: '', categories: [],
  });

  const ouvrirModalCreer = () => {
    const now = new Date();
    const plusUneHeure = new Date(now.getTime() + 60 * 60 * 1000);
    setForm({
      title_event: '', event_description: '',
      ev_start_time: toDatetimeLocal(now),
      ev_end_time: toDatetimeLocal(plusUneHeure),
      max_participants: 10, location: '', categories: [],
    });
    setModalCreer(true);
  };

  // ── Session ──────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('event_token');
    const user = localStorage.getItem('event_user');
    if (!token) { navigate('/login'); return; }
    if (user) {
      const u = JSON.parse(user);
      if (u.role === 'admin') { navigate('/admin'); return; }
      setUtilisateur(u);
      setProfilForm({ first_name: u.first_name || '', last_name: u.last_name || '', telephone: u.telephone || '', langue: u.langue || 'fr' });
    }
    charger();
  }, [navigate]);

  // ── Chargement ───────────────────────────────────────────
  const charger = async () => {
    setLoading(true);
    try {
      const [insc, evs, crea, sugg, locs, cats] = await Promise.allSettled([
        api.get('/participations/mes-inscriptions'),
        api.get('/evenements'),
        api.get('/evenements/mes-evenements'),
        api.get('/evenements/suggestions'),          // module IA — suggestions personnalisées
        api.get('/locations'),
        api.get('/categories'),
      ]);
      if (insc.status === 'fulfilled') setMesInscriptions(insc.value.data.participations || []);
      if (evs.status === 'fulfilled') setEvenementsDispos(evs.value.data.evenements || []);
      if (crea.status === 'fulfilled') setMesCreations(crea.value.data.evenements || []);
      if (sugg.status === 'fulfilled') setSuggestions(sugg.value.data.suggestions || []);
      if (locs.status === 'fulfilled') setLocations(locs.value.data.locations || []);
      if (cats.status === 'fulfilled') setCategories(cats.value.data.categories || []);
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

  const sauvegarderProfil = async (e) => {
    e.preventDefault();
    setSavingProfil(true);
    try {
      const res = await api.put('/utilisateurs/profil', profilForm);
      const updated = res.data.utilisateur;
      const stored = { ...utilisateur, ...updated };
      localStorage.setItem('event_user', JSON.stringify(stored));
      setUtilisateur(stored);
      setProfilForm({ ...profilForm, ...updated });
      flash('success', 'Profil mis à jour');
    } catch (err) {
      flash('error', err.response?.data?.message || 'Erreur mise à jour profil');
    } finally { setSavingProfil(false); }
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
    try {
      await api.delete(`/participations/${eventId}/annuler`);
      flash('success', 'Inscription annulée');
      charger();
    } catch (err) {
      flash('error', err.response?.data?.message || 'Erreur annulation');
    }
  };

  // ── Suggérer un lieu depuis le formulaire de création ────
  const soumettreSuggLieu = async () => {
    if (!suggLieuNom.trim()) { flash('error', 'Le nom du lieu est obligatoire'); return; }
    setSavingSuggLieu(true);
    try {
      const res = await api.post('/locations/suggerer', {
        name_location: suggLieuNom.trim(),
        location_capacity: suggLieuCap ? Number(suggLieuCap) : 0,
      });
      flash('success', res.data.message);
      setSuggLieuNom(''); setSuggLieuCap(''); setShowSuggLieu(false);
    } catch (err) {
      flash('error', err.response?.data?.message || 'Erreur suggestion');
    } finally { setSavingSuggLieu(false); }
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
      setForm({ title_event: '', event_description: '', ev_start_time: '', ev_end_time: '', max_participants: 10, location: '', categories: [] });
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

  const flash = (type, message) => {
    setNotif({ type, message });
    setTimeout(() => setNotif(null), 4000);
  };

  // ── Galerie par événement ─────────────────────────────────

  // Ouvre la modale et charge les photos de l'événement
  const ouvrirGalerieEvent = async (eventId, titre) => {
    setGalerieEvent({ eventId, titre });
    setPhotosEvent([]);
    await chargerPhotosEvent(eventId);
  };

  // Charge les médias approuvés depuis /api/medias/evenement/:id
  const chargerPhotosEvent = async (eventId) => {
    setLoadingPhotos(true);
    try {
      const res = await api.get(`/medias/evenement/${eventId}`);
      setPhotosEvent(res.data.medias || []);
    } catch { setPhotosEvent([]); }
    finally { setLoadingPhotos(false); }
  };

  // Upload d'une photo via FormData → POST /api/medias/upload
  // Le backend vérifie que l'utilisateur est bien inscrit à l'événement
  const uploaderPhoto = async (e) => {
    const file = e.target.files[0];
    if (!file || !galerieEvent) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('photo', file);                          // champ attendu par multer
      fd.append('evenement_id', galerieEvent.eventId);   // requis pour photo_evenement
      fd.append('type_media', 'photo_evenement');
      await api.post('/medias/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      flash('success', 'Photo envoyée — elle sera visible après validation');
      await chargerPhotosEvent(galerieEvent.eventId);
    } catch (err) {
      flash('error', err.response?.data?.message || 'Erreur upload photo');
    } finally {
      setUploading(false);
      e.target.value = '';   // reset input pour permettre le même fichier deux fois
    }
  };

  const fermerGalerieEvent = () => {
    setGalerieEvent(null);
    setPhotosEvent([]);
    setLightboxIdx(null);
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
  const inscritIds = new Set(mesInscriptions.map(i => String(i.eventId)));

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
                    min={toDatetimeLocal(new Date())}
                    onChange={e => {
                      const newStart = e.target.value;
                      setForm(prev => ({
                        ...prev,
                        ev_start_time: newStart,
                        ev_end_time: (!prev.ev_end_time || prev.ev_end_time <= newStart)
                          ? toDatetimeLocal(new Date(new Date(newStart).getTime() + 60 * 60 * 1000))
                          : prev.ev_end_time,
                      }));
                    }} required />
                </div>
                <div className="form-group">
                  <label>Date et heure de fin</label>
                  <input type="datetime-local" value={form.ev_end_time}
                    min={form.ev_start_time}
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
                  {!showSuggLieu ? (
                    <button type="button" onClick={() => setShowSuggLieu(true)}
                      style={{ marginTop: 5, fontSize: 11, color: '#8888aa', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'block' }}>
                      + Mon lieu n'est pas dans la liste ? Suggérer
                    </button>
                  ) : (
                    <div style={{ marginTop: 8, padding: '10px', background: 'rgba(0,212,255,.06)', border: '1px solid rgba(0,212,255,.2)', borderRadius: 8 }}>
                      <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                        <input placeholder="Nom du lieu *" value={suggLieuNom} onChange={e => setSuggLieuNom(e.target.value)}
                          style={{ flex: 2, minWidth: 120, background: '#1a1a35', color: '#e8e8f0', border: '1px solid #2a2a4a', borderRadius: 6, padding: '6px 10px', fontFamily: 'Poppins,sans-serif', fontSize: 12 }} />
                        <input placeholder="Capacité" type="number" min="0" value={suggLieuCap} onChange={e => setSuggLieuCap(e.target.value)}
                          style={{ flex: 1, minWidth: 80, background: '#1a1a35', color: '#e8e8f0', border: '1px solid #2a2a4a', borderRadius: 6, padding: '6px 10px', fontFamily: 'Poppins,sans-serif', fontSize: 12 }} />
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button type="button" onClick={soumettreSuggLieu} disabled={savingSuggLieu}
                          style={{ padding: '5px 12px', background: 'rgba(0,212,255,.2)', color: '#00d4ff', border: '1px solid rgba(0,212,255,.3)', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontWeight: 600 }}>
                          {savingSuggLieu ? '...' : '📍 Suggérer'}
                        </button>
                        <button type="button" onClick={() => { setShowSuggLieu(false); setSuggLieuNom(''); setSuggLieuCap(''); }}
                          style={{ padding: '5px 10px', background: 'transparent', color: '#8888aa', border: '1px solid #2a2a4a', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontFamily: 'Poppins,sans-serif' }}>
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}
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
                ? <img src={utilisateur.photo} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                : <>{utilisateur?.first_name?.[0]}{utilisateur?.last_name?.[0]}</>
              }
            </div>
            <span className="dash-username">{utilisateur?.first_name} {utilisateur?.last_name}</span>
          </div>
          <button className="dash-btn-ghost" onClick={() => setGalerieOpen(true)}>📸 Galerie</button>
          <button
            className="dash-btn-ghost"
            onClick={() => setShowMonEspace(true)}
            title="Modifier vos informations personnelles et votre mot de passe"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            👤 Mon compte
          </button>
          <ThemeSelector />
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
            <button className="dash-btn-primary" onClick={ouvrirModalCreer}>
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
            { key: 'creations', label: 'Mes créations', count: mesCreations.length, color: '#9c27b0' },
            { key: 'recompenses', label: 'Récompenses', count: mesRecompenses.filter(r => !r.is_redeemed).length, color: '#ff6b00' },
            { key: 'profil',      label: 'Mon profil',  count: 0, color: '' },
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
              <div className="dash-events-grid">
                {mesInscriptions.map(ins => (
                  // Wrapper pour grouper la carte + le bouton galerie
                  <div key={ins.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <EventCard event={ins} mode="inscrit"
                      onVoirQR={() => setQrModal({ eventId: ins.eventId, token: ins.qr_token, titre: ins.titre })}
                      onAnnuler={() => annulerInscription(ins.eventId)} />
                    <button
                      onClick={() => setParticipantsModal(ins.eventId)}
                      style={{
                        width: '100%', padding: '8px 12px',
                        background: 'rgba(167,139,250,.07)',
                        border: '1px solid rgba(167,139,250,.2)',
                        borderRadius: '8px', color: '#a78bfa',
                        fontSize: '12px', cursor: 'pointer',
                        fontFamily: 'Poppins,sans-serif',
                        display: 'flex', alignItems: 'center',
                        justifyContent: 'center', gap: '6px',
                      }}>
                      👥 Participants
                    </button>
                    {/* Bouton d'accès à la galerie photos de cet événement */}
                    <button
                      onClick={() => ouvrirGalerieEvent(ins.eventId, ins.titre)}
                      style={{
                        width: '100%', padding: '8px 12px',
                        background: 'rgba(0,212,255,.07)',
                        border: '1px solid rgba(0,212,255,.2)',
                        borderRadius: '8px', color: '#00d4ff',
                        fontSize: '12px', cursor: 'pointer',
                        fontFamily: 'Poppins,sans-serif',
                        display: 'flex', alignItems: 'center',
                        justifyContent: 'center', gap: '6px',
                      }}>
                      📸 Photos de l'événement
                    </button>
                  </div>
                ))}
              </div>
            )
          )}

          {/* ── Explorer ── */}
          {activeTab === 'explorer' && (
            <div>
              {/* ── Section IA : masquée si vide, sans aucun message d'absence ── */}
              {suggestions.length > 0 && (
                <div style={{ marginBottom: 28 }}>
                  <div style={{ marginBottom: 14 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: '#a78bfa', marginBottom: 4 }}>
                      🎯 Recommandé pour vous
                    </h3>
                    <p style={{ fontSize: 12, color: '#8888aa', margin: 0 }}>
                      Basé sur vos sports favoris et vos amis
                    </p>
                  </div>
                  <div className="dash-events-grid">
                    {suggestions.slice(0, 5).map(ev => (
                      <div key={ev._id} style={{ position: 'relative' }}>
                        {/* Badge score IA — superposé en haut à droite de la carte */}
                        <span style={{
                          position: 'absolute', top: 8, right: 8, zIndex: 1,
                          background: 'rgba(167,139,250,.15)',
                          color: '#a78bfa',
                          fontSize: 10, padding: '2px 8px', borderRadius: 99,
                          fontWeight: 700, border: '1px solid rgba(167,139,250,.3)',
                          pointerEvents: 'none',
                        }}>
                          ✨ {Math.round((ev.score || 0) * 100)}% match
                        </span>
                        <EventCard
                          event={{ ...ev, id: ev._id }}
                          mode="explorer"
                          estInscrit={inscritIds.has(String(ev._id))}
                          onSInscrire={() => sInscrire(ev._id)}
                          onSeDesinscrire={() => annulerInscription(ev._id)}
                        />
                      </div>
                    ))}
                  </div>
                  <hr style={{ border: 'none', borderTop: '1px solid #2a2a4a', margin: '24px 0 0' }} />
                </div>
              )}

              {/* ── Liste générale — inchangée ── */}
              {evenementsDispos.length === 0 ? (
                <div className="dash-empty">
                  <p className="dash-empty__icon">📅</p>
                  <p className="dash-empty__text">Aucun événement disponible.</p>
                  <button className="dash-btn-primary" onClick={ouvrirModalCreer}>
                    + Proposer le premier événement
                  </button>
                </div>
              ) : (
                <div className="dash-events-grid">
                  {evenementsDispos.map(ev => (
                    <EventCard key={ev._id} event={{ ...ev, id: ev._id }} mode="explorer"
                      estInscrit={inscritIds.has(String(ev._id))}
                      onSInscrire={() => sInscrire(ev._id)}
                      onSeDesinscrire={() => annulerInscription(ev._id)} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Mes créations ── */}
          {activeTab === 'creations' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#e8e8f0' }}>
                  Événements que j'ai proposés
                </h3>
                <button className="dash-btn-primary" onClick={ouvrirModalCreer}>
                  + Proposer un événement
                </button>
              </div>

              {mesCreations.length === 0 ? (
                <div className="dash-empty">
                  <p className="dash-empty__icon">📋</p>
                  <p className="dash-empty__text">Vous n'avez encore proposé aucun événement.</p>
                  <button className="dash-btn-primary" onClick={ouvrirModalCreer}>
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
                  <div style={{ marginTop: '1.5rem', padding: '12px 16px', background: '#0a0a1a', borderRadius: '10px', fontSize: '12px', color: '#8888aa' }}>
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
              <h2 className="dash-section-title" style={{ marginBottom: '1.5rem' }}>Mon profil</h2>
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

      {showMonEspace && (
        <MonEspaceModal
          utilisateur={utilisateur}
          onClose={() => setShowMonEspace(false)}
          onUpdate={(u) => setUtilisateur(u)}
        />
      )}
      {qrModal && <QRModal token={qrModal.token} titre={qrModal.titre} onClose={() => setQrModal(null)} />}
      {participantsModal && <ParticipantsModal evenementId={participantsModal} onClose={() => setParticipantsModal(null)} />}
      {galerieOpen && <GalerieModal onClose={() => setGalerieOpen(false)} isAdmin={false} />}

      {/* ── Modale galerie d'un événement spécifique ── */}
      {galerieEvent && (
        <div className="dash-overlay" onClick={fermerGalerieEvent}>
          <div
            className="dash-modal"
            style={{ maxWidth: '760px', width: '95vw' }}
            onClick={e => e.stopPropagation()}
          >
            {/* En-tête */}
            <div className="dash-modal__header">
              <h3 style={{ fontSize: '15px', maxWidth: '80%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                📸 {galerieEvent.titre}
              </h3>
              <button className="dash-modal__close" onClick={fermerGalerieEvent}>✕</button>
            </div>

            {/* Zone d'upload */}
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #2a2a4a' }}>
              <label style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '8px 16px',
                background: uploading ? '#1a1a35' : 'rgba(0,212,255,.1)',
                border: '1px solid rgba(0,212,255,.25)',
                borderRadius: '8px',
                color: uploading ? '#555577' : '#00d4ff',
                fontSize: '13px',
                cursor: uploading ? 'not-allowed' : 'pointer',
                fontFamily: 'Poppins,sans-serif',
              }}>
                {uploading ? '⏳ Upload en cours...' : '+ Ajouter une photo'}
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  style={{ display: 'none' }}
                  disabled={uploading}
                  onChange={uploaderPhoto}
                />
              </label>
              <p style={{ marginTop: '8px', fontSize: '11px', color: '#8888aa' }}>
                JPG · PNG · WEBP (max 5 Mo) — soumis à validation avant publication.
              </p>
            </div>

            {/* Grille de photos */}
            <div style={{ padding: '1rem 1.5rem', maxHeight: '60vh', overflowY: 'auto' }}>
              {loadingPhotos ? (
                <div style={{ textAlign: 'center', color: '#8888aa', padding: '2rem' }}>
                  <div className="dash-spinner" style={{ margin: '0 auto 1rem' }}></div>
                  Chargement des photos...
                </div>
              ) : photosEvent.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#8888aa', padding: '2rem' }}>
                  <p style={{ fontSize: '36px', marginBottom: '10px' }}>📷</p>
                  <p style={{ marginBottom: '4px' }}>Aucune photo pour cet événement.</p>
                  <p style={{ fontSize: '12px' }}>Soyez le premier à partager un souvenir !</p>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                  gap: '8px',
                }}>
                  {photosEvent.map((m, idx) => (
                    <div
                      key={m._id}
                      onClick={() => setLightboxIdx(idx)}
                      style={{
                        position: 'relative', cursor: 'zoom-in',
                        borderRadius: '8px', overflow: 'hidden',
                        border: '1px solid #2a2a4a',
                        aspectRatio: '1', background: '#0a0a1a',
                      }}
                    >
                      <img
                        src={m.thumbnail_url || m.file_url}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                      {/* Auteur en bas de vignette */}
                      <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        padding: '4px 6px',
                        background: 'linear-gradient(transparent, rgba(0,0,0,.75))',
                        fontSize: '10px', color: '#ccc',
                      }}>
                        {m.utilisateur?.first_name} {m.utilisateur?.last_name?.[0]}.
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Lightbox plein écran ── */}
      {lightboxIdx !== null && photosEvent[lightboxIdx] && (
        <div
          onClick={() => setLightboxIdx(null)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,.93)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, padding: '1rem',
          }}
        >
          {/* Précédent */}
          {lightboxIdx > 0 && (
            <button
              onClick={e => { e.stopPropagation(); setLightboxIdx(i => i - 1); }}
              style={{
                position: 'fixed', left: '1rem', top: '50%', transform: 'translateY(-50%)',
                background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff',
                borderRadius: '50%', width: 44, height: 44, fontSize: '22px',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >‹</button>
          )}

          <img
            src={photosEvent[lightboxIdx].file_url}
            alt=""
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '8px', objectFit: 'contain' }}
          />

          {/* Suivant */}
          {lightboxIdx < photosEvent.length - 1 && (
            <button
              onClick={e => { e.stopPropagation(); setLightboxIdx(i => i + 1); }}
              style={{
                position: 'fixed', right: '1rem', top: '50%', transform: 'translateY(-50%)',
                background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff',
                borderRadius: '50%', width: 44, height: 44, fontSize: '22px',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >›</button>
          )}

          {/* Fermer */}
          <button
            onClick={() => setLightboxIdx(null)}
            style={{
              position: 'fixed', top: '1rem', right: '1rem',
              background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff',
              borderRadius: '50%', width: 36, height: 36, fontSize: '16px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >✕</button>
        </div>
      )}
    </div>
  );
};

export default DashboardUser;
