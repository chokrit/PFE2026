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
import EventCard from '../../components/dashboard/EventCard';
import RewardCard from '../../components/dashboard/RewardCard';
import QRModal from '../../components/dashboard/QRModal';
import MonEspaceModal from '../../components/dashboard/MonEspaceModal';
import NotificationBell from '../../components/dashboard/NotificationBell';
import '../../styles/dashboard/dashboard.css';
import '../../styles/dashboard/admin.css';
import '../../styles/dashboard/organisateur.css';

const mkDates = () => {
  const p = n => String(n).padStart(2, '0');
  const fmt = d => `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  const dS = new Date(); dS.setHours(dS.getHours() + 2, 0, 0, 0);
  const dE = new Date(dS); dE.setHours(dE.getHours() + 1);
  return { start: fmt(dS), end: fmt(dE) };
};

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

  const [medias, setMedias] = useState([]);
  const [modalEvent, setModalEvent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newEvent, setNewEvent] = useState(() => {
    const { start, end } = mkDates();
    return { title_event: '', event_description: '', ev_start_time: start, ev_end_time: end, max_participants: 30, location: '', categories: [], stat_event: 'brouillon' };
  });

  const [userSearch, setUserSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [filtreStatut, setFiltreStatut] = useState('tous');
  const [showMonEspace, setShowMonEspace] = useState(false);

  // ── Participation aux événements (comme un utilisateur) ─
  const [mesInscriptions, setMesInscriptions] = useState([]);
  const [evenementsDispos, setEvenementsDispos] = useState([]);
  const [mesRecompenses, setMesRecompenses]     = useState([]);
  const [suggestions, setSuggestions]           = useState([]);
  const [qrModal, setQrModal]                   = useState(null);

  // ── Gestion des catégories / suggestions de sports ───────
  const [suggestionsCats, setSuggestionsCats]   = useState([]);
  const [raisonRefusCat, setRaisonRefusCat]     = useState({});
  const [savingCat, setSavingCat]               = useState({});

  // ── Lieux ──────────────────────────────────────────────────
  const [suggestionLieux, setSuggestionLieux]   = useState([]);
  const [raisonRefusLieu, setRaisonRefusLieu]   = useState({});
  const [savingLieu, setSavingLieu]             = useState({});
  // Formulaires inline dans la modale de création d'événement
  const [showSuggCat, setShowSuggCat]           = useState(false);
  const [suggCatForm, setSuggCatForm]           = useState({ event_categ: '', event_type: '' });
  const [savingSuggCat, setSavingSuggCat]       = useState(false);
  const [showSuggLieu, setShowSuggLieu]         = useState(false);
  const [suggLieuNom, setSuggLieuNom]           = useState('');
  const [suggLieuCap, setSuggLieuCap]           = useState('');
  const [savingSuggLieu, setSavingSuggLieu]     = useState(false);

  // ── Cycle de vie : annulation + validation modifications ─
  const [modalAnnulerEv, setModalAnnulerEv]     = useState(null);
  const [raisonAnnulEv, setRaisonAnnulEv]       = useState('');
  const [savingAnnulEv, setSavingAnnulEv]       = useState(false);
  const [refusModifId, setRefusModifId]         = useState(null);
  const [raisonRefus, setRaisonRefus]           = useState('');
  const [savingModifAction, setSavingModifAction] = useState(false);

  // ── Scanner de présences QR ────────────────────────────────
  const [scanToken, setScanToken]       = useState('');
  const [scanResultat, setScanResultat] = useState(null);
  const [scanErreur, setScanErreur]     = useState('');
  const [scanEnCours, setScanEnCours]   = useState(false);
  const [qrEventId, setQrEventId]       = useState('');

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
      const [usersR, evsR, locsR, catsR, mediasR, inscR, dispoR, suggR, suggCatsR, suggLieuxR] = await Promise.allSettled([
        api.get('/utilisateurs'),
        api.get('/evenements/all'),
        api.get('/locations'),
        api.get('/categories'),
        api.get('/medias/moderation'),
        api.get('/participations/mes-inscriptions'),
        api.get('/evenements'),
        api.get('/evenements/suggestions'),
        api.get('/categories/suggestions'),
        api.get('/locations/suggestions'),
      ]);
      if (mediasR.status === 'fulfilled') setMedias(mediasR.value?.data?.medias || []);
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
      if (inscR.status === 'fulfilled')  setMesInscriptions(inscR.value.data.participations || []);
      if (dispoR.status === 'fulfilled') setEvenementsDispos(dispoR.value.data.evenements || []);
      if (suggR.status === 'fulfilled')       setSuggestions(suggR.value.data.suggestions || []);
      if (suggCatsR.status === 'fulfilled')   setSuggestionsCats(suggCatsR.value.data.suggestions || []);
      if (suggLieuxR.status === 'fulfilled')  setSuggestionLieux(suggLieuxR.value.data.suggestions || []);
      try {
        const rew = await api.get('/recompenses/mes-coupons');
        setMesRecompenses(rew.data.coupons || []);
      } catch { setMesRecompenses([]); }
    } finally { setLoading(false); }
  };

  const flash = (type, msg) => { setNotif({ type, msg }); setTimeout(() => setNotif(null), 4000); };

  // ── Suggérer une catégorie depuis le formulaire d'événement ─
  const soumettreSuggCat = async () => {
    if (!suggCatForm.event_categ.trim() || !suggCatForm.event_type.trim()) {
      flash('error', 'Groupe et sport sont obligatoires');
      return;
    }
    setSavingSuggCat(true);
    try {
      const res = await api.post('/categories/suggerer', suggCatForm);
      flash('success', res.data.message);
      setSuggCatForm({ event_categ: '', event_type: '' });
      setShowSuggCat(false);
    } catch (err) {
      flash('error', err.response?.data?.message || 'Erreur suggestion');
    } finally {
      setSavingSuggCat(false);
    }
  };

  // ── Suggérer un lieu depuis le formulaire d'événement ───
  const soumettreSuggLieu = async () => {
    if (!suggLieuNom.trim()) { flash('error', 'Le nom du lieu est obligatoire'); return; }
    setSavingSuggLieu(true);
    try {
      const res = await api.post('/locations/suggerer', {
        name_location: suggLieuNom.trim(),
        location_capacity: suggLieuCap ? Number(suggLieuCap) : 0,
      });
      flash('success', res.data.message);
      setSuggLieuNom('');
      setSuggLieuCap('');
      setShowSuggLieu(false);
      charger();
    } catch (err) {
      flash('error', err.response?.data?.message || 'Erreur suggestion');
    } finally {
      setSavingSuggLieu(false);
    }
  };

  // ── Valider un lieu suggéré ───────────────────────────────
  const validerLieu = async (lieuId) => {
    setSavingLieu(p => ({ ...p, [lieuId]: true }));
    try {
      const res = await api.put(`/locations/${lieuId}/valider`);
      flash('success', res.data.message);
      setSuggestionLieux(p => p.filter(l => l._id !== lieuId));
      const locsRes = await api.get('/locations');
      setLocations(locsRes.data.locations || []);
    } catch (err) {
      flash('error', err.response?.data?.message || 'Erreur validation');
    } finally {
      setSavingLieu(p => ({ ...p, [lieuId]: false }));
    }
  };

  // ── Refuser un lieu suggéré ───────────────────────────────
  const refuserLieu = async (lieuId) => {
    setSavingLieu(p => ({ ...p, [lieuId]: true }));
    try {
      const res = await api.put(`/locations/${lieuId}/refuser`, {
        raison: raisonRefusLieu[lieuId]?.trim() || '',
      });
      flash('success', res.data.message);
      setSuggestionLieux(p => p.filter(l => l._id !== lieuId));
      setRaisonRefusLieu(p => { const n = { ...p }; delete n[lieuId]; return n; });
    } catch (err) {
      flash('error', err.response?.data?.message || 'Erreur refus');
    } finally {
      setSavingLieu(p => ({ ...p, [lieuId]: false }));
    }
  };

  // ── Valider une suggestion de catégorie sportive ─────────
  const validerCat = async (catId) => {
    setSavingCat(p => ({ ...p, [catId]: true }));
    try {
      const res = await api.put(`/categories/${catId}/valider`);
      flash('success', res.data.message);
      setSuggestionsCats(p => p.filter(c => c._id !== catId));
      // Rafraîchir la liste des catégories actives
      const catsRes = await api.get('/categories');
      setCategories(catsRes.data.categories || []);
    } catch (err) {
      flash('error', err.response?.data?.message || 'Erreur validation');
    } finally {
      setSavingCat(p => ({ ...p, [catId]: false }));
    }
  };

  // ── Refuser une suggestion de catégorie sportive ─────────
  const refuserCat = async (catId) => {
    setSavingCat(p => ({ ...p, [catId]: true }));
    try {
      const res = await api.put(`/categories/${catId}/refuser`, {
        raison: raisonRefusCat[catId]?.trim() || '',
      });
      flash('success', res.data.message);
      setSuggestionsCats(p => p.filter(c => c._id !== catId));
      setRaisonRefusCat(p => { const n = { ...p }; delete n[catId]; return n; });
    } catch (err) {
      flash('error', err.response?.data?.message || 'Erreur refus');
    } finally {
      setSavingCat(p => ({ ...p, [catId]: false }));
    }
  };

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
      const { start, end } = mkDates();
      setNewEvent({ title_event: '', event_description: '', ev_start_time: start, ev_end_time: end, max_participants: 30, location: '', categories: [], stat_event: 'brouillon' });
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

  const validerMedia = async (mediaId, statut) => {
    try {
      await api.put(`/medias/${mediaId}/valider`, { statut });
      setMedias(p => p.filter(m => m._id !== mediaId));
      flash('success', statut === 'approuve' ? 'Média approuvé' : 'Média refusé');
    } catch { flash('error', 'Erreur modération'); }
  };

  const sInscrire = async (eventId) => {
    try {
      await api.post(`/participations/${eventId}/inscription`);
      flash('success', 'Inscription confirmée !');
      charger();
      setActiveTab('mes-inscriptions');
    } catch (err) {
      flash('error', err.response?.data?.message || 'Erreur inscription');
    }
  };

  const annulerInscription = async (eventId) => {
    if (!window.confirm('Annuler votre inscription ?')) return;
    try {
      await api.delete(`/participations/${eventId}/annuler`);
      flash('success', 'Inscription annulée');
      charger();
    } catch (err) {
      flash('error', err.response?.data?.message || 'Erreur annulation');
    }
  };

  const supprimerMedia = async (mediaId) => {
    try {
      await api.delete(`/medias/${mediaId}`);
      setMedias(p => p.filter(m => m._id !== mediaId));
      flash('success', 'Média supprimé');
    } catch { flash('error', 'Erreur suppression'); }
  };

  // ── Annuler un événement avec raison obligatoire ────────
  const confirmerAnnulationEv = async (e) => {
    e.preventDefault();
    if (!raisonAnnulEv.trim()) { flash('error', 'La raison est obligatoire'); return; }
    setSavingAnnulEv(true);
    try {
      const res = await api.post(`/evenements/${modalAnnulerEv._id}/annuler`, { raison: raisonAnnulEv.trim() });
      flash('success', res.data.message);
      setModalAnnulerEv(null);
      setRaisonAnnulEv('');
      charger();
    } catch (err) {
      flash('error', err.response?.data?.message || 'Erreur annulation');
    } finally { setSavingAnnulEv(false); }
  };

  // ── Approuver une modification soumise par un créateur ──
  const approuverModif = async (eventId) => {
    setSavingModifAction(true);
    try {
      const res = await api.post(`/evenements/${eventId}/approuver-modification`);
      flash('success', res.data.message);
      charger();
    } catch (err) {
      flash('error', err.response?.data?.message || 'Erreur approbation');
    } finally { setSavingModifAction(false); }
  };

  // ── Refuser une modification avec raison obligatoire ────
  const refuserModif = async (e) => {
    e.preventDefault();
    if (!raisonRefus.trim()) { flash('error', 'La raison est obligatoire'); return; }
    setSavingModifAction(true);
    try {
      const res = await api.post(`/evenements/${refusModifId}/refuser-modification`, { raison: raisonRefus.trim() });
      flash('success', res.data.message);
      setRefusModifId(null);
      setRaisonRefus('');
      charger();
    } catch (err) {
      flash('error', err.response?.data?.message || 'Erreur refus');
    } finally { setSavingModifAction(false); }
  };

  const usersFiltres = utilisateurs.filter(u => {
    const q = userSearch.toLowerCase();
    return !q || `${u.first_name} ${u.last_name} ${u.email} ${u.telephone || ''} ${u.role}`.toLowerCase().includes(q);
  });
  const evsFiltres = filtreStatut === 'tous' ? evenements : evenements.filter(e => e.stat_event === filtreStatut);

  // Événements soumis par des users qui attendent validation (publication)
  const aValider = evenements.filter(ev =>
    ev.stat_event === 'brouillon' &&
    ev.createur?._id &&
    adminUser?._id &&
    ev.createur._id.toString() !== adminUser._id.toString()
  );

  // Événements avec une modification en attente d'approbation
  const aModifier = evenements.filter(ev => ev.modification_en_attente);

  // ── Scanner : calcule si le scan est autorisé maintenant ──
  const statutFenetreHoraire = (ev) => {
    if (!ev?.ev_start_time) return 'autre_jour';
    const maintenant = new Date();
    const debut      = new Date(ev.ev_start_time);
    const fin        = ev.ev_end_time ? new Date(ev.ev_end_time) : null;
    const memeJour =
      maintenant.getFullYear() === debut.getFullYear() &&
      maintenant.getMonth()    === debut.getMonth()    &&
      maintenant.getDate()     === debut.getDate();
    if (!memeJour)               return maintenant < debut ? 'avant' : 'apres';
    if (maintenant < debut)      return 'avant';
    if (fin && maintenant > fin) return 'apres';
    return 'pendant';
  };

  const soumettreScan = async (e) => {
    e.preventDefault();
    const token = scanToken.trim();
    if (!token) return;
    setScanEnCours(true);
    setScanResultat(null);
    setScanErreur('');
    try {
      const res = await api.post('/participations/valider-presence', { qr_token: token });
      setScanResultat(res.data.participant);
      setScanToken('');
    } catch (err) {
      setScanErreur(err.response?.data?.message || 'Erreur lors de la validation');
    } finally {
      setScanEnCours(false);
    }
  };

  const evScan      = evenements.find(e => e._id === qrEventId) || null;
  const fenetre     = evScan ? statutFenetreHoraire(evScan) : null;
  const fenetreInfo = fenetre ? ({
    pendant:    { color: '#00e676', bg: 'rgba(0,230,118,.12)',    label: '🟢 Scan autorisé — événement en cours' },
    avant:      { color: '#ff6b00', bg: 'rgba(255,107,0,.10)',    label: '🟡 Événement pas encore commencé' },
    apres:      { color: '#8888aa', bg: 'rgba(136,136,170,.10)',  label: '⬜ Événement terminé' },
    autre_jour: { color: '#ff4d6d', bg: 'rgba(255,77,109,.10)',   label: "🔴 Le scan n'est autorisé que le jour de l'événement" },
  }[fenetre] || null) : null;
  const estTermine  = fenetre === 'apres';

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
          <NotificationBell />
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
            { key: 'overview',          label: 'Vue globale',      icon: '📊' },
            { key: 'users',             label: 'Utilisateurs',     icon: '👥' },
            { key: 'events',            label: 'Événements',       icon: '🏟' },
            { key: 'categories',         label: 'Catégories',       icon: '🏷' },
            { key: 'scanner',           label: 'QR Code',          icon: '📷' },
            { key: 'medias',            label: 'Médias',           icon: '🖼' },
            { key: 'explorer',          label: 'Explorer',         icon: '🔍' },
            { key: 'mes-inscriptions',  label: 'Mes inscriptions', icon: '🎟' },
            { key: 'recompenses',       label: 'Récompenses',      icon: '🎫' },
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
              {t.key === 'categories' && (suggestionsCats.length + suggestionLieux.length) > 0 && (
                <span style={{ background: '#a78bfa', color: '#fff', borderRadius: '999px', fontSize: '10px', fontWeight: 700, padding: '1px 6px' }}>
                  {suggestionsCats.length + suggestionLieux.length}
                </span>
              )}
              {t.key === 'medias' && medias.length > 0 && (
                <span style={{ background: '#f59e0b', color: '#000', borderRadius: '999px', fontSize: '10px', fontWeight: 700, padding: '1px 6px' }}>
                  {medias.length}
                </span>
              )}
              {t.key === 'mes-inscriptions' && mesInscriptions.length > 0 && (
                <span className="dash-tab-badge">{mesInscriptions.length}</span>
              )}
              {t.key === 'recompenses' && mesRecompenses.filter(r => !r.is_redeemed).length > 0 && (
                <span style={{ background: '#ff6b00', color: '#fff', borderRadius: '999px', fontSize: '10px', fontWeight: 700, padding: '1px 6px' }}>
                  {mesRecompenses.filter(r => !r.is_redeemed).length}
                </span>
              )}
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

            {/* ── Modifications en attente ── */}
            {aModifier.length > 0 && (
              <div style={{ marginBottom: '1.5rem', padding: '14px 16px', background: 'rgba(245,158,11,.06)', border: '1px solid rgba(245,158,11,.25)', borderRadius: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b', marginBottom: 12 }}>
                  ⏳ Modifications en attente de validation ({aModifier.length})
                </div>
                {aModifier.map(ev => (
                  <div key={ev._id} style={{ background: '#0a0a1a', borderRadius: 10, padding: '12px 14px', marginBottom: 10 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#e8e8f0', marginBottom: 8 }}>{ev.title_event}</div>
                    {/* Comparaison avant / après */}
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
                      <div style={{ flex: 1, minWidth: 180, padding: '8px 10px', background: 'rgba(255,77,109,.06)', border: '1px solid rgba(255,77,109,.2)', borderRadius: 8 }}>
                        <div style={{ fontSize: 10, color: '#ff4d6d', fontWeight: 700, marginBottom: 4 }}>ACTUEL</div>
                        {ev.modification_proposee?.titre && <div style={{ fontSize: 12, color: '#8888aa' }}>Titre : {ev.title_event}</div>}
                        {ev.modification_proposee?.ev_start_time && (
                          <div style={{ fontSize: 12, color: '#8888aa' }}>
                            Début : {new Date(ev.ev_start_time).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                        {ev.modification_proposee?.max_participants && <div style={{ fontSize: 12, color: '#8888aa' }}>Participants max : {ev.max_participants}</div>}
                      </div>
                      <div style={{ flex: 1, minWidth: 180, padding: '8px 10px', background: 'rgba(0,230,118,.06)', border: '1px solid rgba(0,230,118,.2)', borderRadius: 8 }}>
                        <div style={{ fontSize: 10, color: '#00e676', fontWeight: 700, marginBottom: 4 }}>PROPOSÉ</div>
                        {ev.modification_proposee?.titre && <div style={{ fontSize: 12, color: '#e8e8f0' }}>Titre : {ev.modification_proposee.titre}</div>}
                        {ev.modification_proposee?.ev_start_time && (
                          <div style={{ fontSize: 12, color: '#e8e8f0' }}>
                            Début : {new Date(ev.modification_proposee.ev_start_time).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                        {ev.modification_proposee?.max_participants && <div style={{ fontSize: 12, color: '#e8e8f0' }}>Participants max : {ev.modification_proposee.max_participants}</div>}
                        {ev.modification_proposee?.proposee_par && (
                          <div style={{ fontSize: 11, color: '#8888aa', marginTop: 4 }}>
                            par {ev.modification_proposee.proposee_par?.first_name} {ev.modification_proposee.proposee_par?.last_name}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => approuverModif(ev._id)} disabled={savingModifAction}
                        style={{ padding: '6px 14px', background: 'rgba(0,230,118,.15)', color: '#00e676', border: '1px solid rgba(0,230,118,.3)', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontWeight: 600 }}>
                        ✓ Approuver
                      </button>
                      <button onClick={() => { setRefusModifId(ev._id); setRaisonRefus(''); }}
                        style={{ padding: '6px 14px', background: 'rgba(255,77,109,.15)', color: '#ff4d6d', border: '1px solid rgba(255,77,109,.3)', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontWeight: 600 }}>
                        ✕ Refuser
                      </button>
                    </div>
                  </div>
                ))}
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
                        <td>
                          <span className={`badge ${b.cls}`}>{b.label}</span>
                          {/* Badge modification en attente */}
                          {ev.modification_en_attente && (
                            <span style={{ marginLeft: 4, padding: '2px 7px', borderRadius: 99, fontSize: 10, fontWeight: 700, background: 'rgba(245,158,11,.15)', color: '#f59e0b', display: 'inline-block' }}>
                              ⏳
                            </span>
                          )}
                        </td>
                        <td>
                          <div className="admin-actions">
                            {ev.stat_event === 'brouillon' && <button className="admin-btn-sm admin-btn-success" onClick={() => changerStatut(ev._id, 'publié')}>Publier</button>}
                            {ev.stat_event === 'publié' && (
                              <button className="admin-btn-sm"
                                style={{ background: '#00d4ff22', color: '#00d4ff', border: '1px solid #00d4ff44' }}
                                onClick={() => { setQrEventId(ev._id); setScanResultat(null); setScanErreur(''); setScanToken(''); setActiveTab('scanner'); }}>
                                📷 QR
                              </button>
                            )}
                            {ev.stat_event === 'publié' && (
                              <button className="admin-btn-sm admin-btn-warning"
                                onClick={() => { setModalAnnulerEv(ev); setRaisonAnnulEv(''); }}>
                                Annuler
                              </button>
                            )}
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
                          onChange={e => {
                            const start = e.target.value;
                            let autoFin = '';
                            if (start) {
                              const d = new Date(start);
                              d.setHours(d.getHours() + 1);
                              const p = n => String(n).padStart(2, '0');
                              autoFin = `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
                            }
                            setNewEvent({ ...newEvent, ev_start_time: start, ev_end_time: autoFin });
                          }} required />
                      </div>
                      <div className="form-group">
                        <label>Date fin <span style={{ fontSize: 10, color: '#666' }}>(auto +1h)</span></label>
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
                        {locations.map(l => <option key={l._id} value={l._id}>{l.name_location}{l.location_capacity ? ` (${l.location_capacity} pers.)` : ''}</option>)}
                      </select>
                      {!showSuggLieu ? (
                        <button type="button" onClick={() => setShowSuggLieu(true)}
                          style={{ marginTop: 5, fontSize: 11, color: '#8888aa', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'block' }}>
                          + Mon lieu n'est pas dans la liste ? Suggérer
                        </button>
                      ) : (
                        <div style={{ marginTop: 8, padding: '12px', background: 'rgba(0,212,255,.06)', border: '1px solid rgba(0,212,255,.2)', borderRadius: 8 }}>
                          <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                            <input placeholder="Nom du lieu *" value={suggLieuNom}
                              onChange={e => setSuggLieuNom(e.target.value)}
                              style={{ flex: 2, background: '#0a0a1a', color: '#e8e8f0', border: '1px solid #2a2a4a', borderRadius: 6, padding: '6px 10px', fontFamily: 'Poppins,sans-serif', fontSize: 12 }} />
                            <input placeholder="Capacité" type="number" min="0" value={suggLieuCap}
                              onChange={e => setSuggLieuCap(e.target.value)}
                              style={{ flex: 1, background: '#0a0a1a', color: '#e8e8f0', border: '1px solid #2a2a4a', borderRadius: 6, padding: '6px 10px', fontFamily: 'Poppins,sans-serif', fontSize: 12 }} />
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button type="button" onClick={soumettreSuggLieu} disabled={savingSuggLieu}
                              style={{ padding: '5px 12px', background: 'rgba(0,212,255,.2)', color: '#00d4ff', border: '1px solid rgba(0,212,255,.3)', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontWeight: 600 }}>
                              {savingSuggLieu ? '...' : '📍 Ajouter'}
                            </button>
                            <button type="button" onClick={() => { setShowSuggLieu(false); setSuggLieuNom(''); setSuggLieuCap(''); }}
                              style={{ padding: '5px 10px', background: 'transparent', color: '#8888aa', border: '1px solid #2a2a4a', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontFamily: 'Poppins,sans-serif' }}>
                              Annuler
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="form-group">
                      <label>Type de sport</label>
                      <select value={newEvent.categories[0] || ''}
                        onChange={e => setNewEvent({ ...newEvent, categories: e.target.value ? [e.target.value] : [] })}
                        style={{ background: '#1a1a35', color: '#e8e8f0', cursor: 'pointer' }}>
                        <option value="">— Sélectionner —</option>
                        {categories.map(c => <option key={c._id} value={c._id}>{c.event_categ} — {c.event_type}</option>)}
                      </select>
                      {!showSuggCat ? (
                        <button type="button" onClick={() => setShowSuggCat(true)}
                          style={{ marginTop: 5, fontSize: 11, color: '#8888aa', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'block' }}>
                          + Mon sport n'est pas dans la liste ? Suggérer
                        </button>
                      ) : (
                        <div style={{ marginTop: 8, padding: '12px', background: 'rgba(167,139,250,.06)', border: '1px solid rgba(167,139,250,.2)', borderRadius: 8 }}>
                          <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                            <input placeholder="Groupe (ex: Aquatique)" value={suggCatForm.event_categ}
                              onChange={e => setSuggCatForm(p => ({ ...p, event_categ: e.target.value }))}
                              style={{ flex: 1, background: '#0a0a1a', color: '#e8e8f0', border: '1px solid #2a2a4a', borderRadius: 6, padding: '6px 10px', fontFamily: 'Poppins,sans-serif', fontSize: 12 }} />
                            <input placeholder="Sport (ex: Natation)" value={suggCatForm.event_type}
                              onChange={e => setSuggCatForm(p => ({ ...p, event_type: e.target.value }))}
                              style={{ flex: 1, background: '#0a0a1a', color: '#e8e8f0', border: '1px solid #2a2a4a', borderRadius: 6, padding: '6px 10px', fontFamily: 'Poppins,sans-serif', fontSize: 12 }} />
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button type="button" onClick={soumettreSuggCat} disabled={savingSuggCat}
                              style={{ padding: '5px 12px', background: 'rgba(167,139,250,.2)', color: '#a78bfa', border: '1px solid rgba(167,139,250,.3)', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontWeight: 600 }}>
                              {savingSuggCat ? '...' : '🏷 Suggérer'}
                            </button>
                            <button type="button" onClick={() => { setShowSuggCat(false); setSuggCatForm({ event_categ: '', event_type: '' }); }}
                              style={{ padding: '5px 10px', background: 'transparent', color: '#8888aa', border: '1px solid #2a2a4a', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontFamily: 'Poppins,sans-serif' }}>
                              Annuler
                            </button>
                          </div>
                        </div>
                      )}
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

        {/* ══ CATÉGORIES ══ */}
        {activeTab === 'categories' && (
          <div>
            <h2 className="dash-section-title" style={{ marginBottom: '1.5rem' }}>Catégories & Lieux</h2>

            {/* ── Lieux en attente ── */}
            {suggestionLieux.length > 0 && (
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#00d4ff', marginBottom: 12 }}>
                  📍 Lieux en attente ({suggestionLieux.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {suggestionLieux.map(lieu => (
                    <div key={lieu._id} style={{
                      background: 'rgba(0,212,255,.05)', border: '1px solid rgba(0,212,255,.2)',
                      borderRadius: 12, padding: '14px 16px',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 600, color: '#e8e8f0' }}>
                            {lieu.name_location}
                            {lieu.location_capacity > 0 && (
                              <span style={{ fontSize: 12, color: '#8888aa', marginLeft: 8 }}>· {lieu.location_capacity} pers.</span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: '#555577', marginTop: 4 }}>
                            Proposé par : {lieu.suggere_par?.first_name} {lieu.suggere_par?.last_name}
                            {' · '}{new Date(lieu.createdAt).toLocaleDateString('fr-FR')}
                          </div>
                        </div>
                        <button onClick={() => validerLieu(lieu._id)} disabled={savingLieu[lieu._id]} style={{
                          padding: '7px 16px', background: 'rgba(0,230,118,.15)', color: '#00e676',
                          border: '1px solid rgba(0,230,118,.3)', borderRadius: 7, cursor: 'pointer',
                          fontFamily: 'Poppins,sans-serif', fontSize: 12, fontWeight: 600, alignSelf: 'flex-start',
                        }}>
                          ✓ Valider
                        </button>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input type="text"
                          value={raisonRefusLieu[lieu._id] || ''}
                          onChange={e => setRaisonRefusLieu(p => ({ ...p, [lieu._id]: e.target.value }))}
                          placeholder="Raison du refus (optionnel)"
                          style={{ flex: 1, background: '#1a1a35', color: '#e8e8f0', border: '1px solid #2a2a4a', borderRadius: 6, padding: '6px 10px', fontFamily: 'Poppins,sans-serif', fontSize: 12 }} />
                        <button onClick={() => refuserLieu(lieu._id)} disabled={savingLieu[lieu._id]} style={{
                          padding: '7px 14px', background: 'rgba(255,77,109,.15)', color: '#ff4d6d',
                          border: '1px solid rgba(255,77,109,.3)', borderRadius: 7, cursor: 'pointer',
                          fontFamily: 'Poppins,sans-serif', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
                        }}>
                          ✕ Refuser
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Suggestions en attente ── */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: suggestionsCats.length > 0 ? '#a78bfa' : '#8888aa', marginBottom: 12 }}>
                💡 Suggestions en attente ({suggestionsCats.length})
              </h3>

              {suggestionsCats.length === 0 ? (
                <p style={{ fontSize: 13, color: '#555577', fontStyle: 'italic' }}>
                  Aucune suggestion en attente.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {suggestionsCats.map(cat => (
                    <div key={cat._id} style={{
                      background: 'rgba(167,139,250,.05)', border: '1px solid rgba(167,139,250,.2)',
                      borderRadius: 12, padding: '14px 16px',
                    }}>
                      {/* Infos de la suggestion */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 600, color: '#e8e8f0' }}>
                            {cat.event_type}
                            <span style={{ fontSize: 12, color: '#8888aa', marginLeft: 8 }}>
                              dans "{cat.event_categ}"
                            </span>
                          </div>
                          {cat.raison_suggestion && (
                            <div style={{ fontSize: 12, color: '#8888aa', marginTop: 4, fontStyle: 'italic' }}>
                              "{cat.raison_suggestion}"
                            </div>
                          )}
                          <div style={{ fontSize: 11, color: '#555577', marginTop: 4 }}>
                            Proposé par : {cat.suggere_par?.first_name} {cat.suggere_par?.last_name}
                            {' · '}{new Date(cat.createdAt).toLocaleDateString('fr-FR')}
                          </div>
                        </div>
                        {/* Bouton Valider */}
                        <button onClick={() => validerCat(cat._id)} disabled={savingCat[cat._id]} style={{
                          padding: '7px 16px', background: 'rgba(0,230,118,.15)', color: '#00e676',
                          border: '1px solid rgba(0,230,118,.3)', borderRadius: 7, cursor: 'pointer',
                          fontFamily: 'Poppins,sans-serif', fontSize: 12, fontWeight: 600, alignSelf: 'flex-start',
                        }}>
                          ✓ Valider
                        </button>
                      </div>

                      {/* Champ raison refus + bouton Refuser */}
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input type="text"
                          value={raisonRefusCat[cat._id] || ''}
                          onChange={e => setRaisonRefusCat(p => ({ ...p, [cat._id]: e.target.value }))}
                          placeholder="Raison du refus (optionnel)"
                          style={{ flex: 1, background: '#1a1a35', color: '#e8e8f0', border: '1px solid #2a2a4a', borderRadius: 6, padding: '6px 10px', fontFamily: 'Poppins,sans-serif', fontSize: 12 }} />
                        <button onClick={() => refuserCat(cat._id)} disabled={savingCat[cat._id]} style={{
                          padding: '7px 14px', background: 'rgba(255,77,109,.15)', color: '#ff4d6d',
                          border: '1px solid rgba(255,77,109,.3)', borderRadius: 7, cursor: 'pointer',
                          fontFamily: 'Poppins,sans-serif', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
                        }}>
                          ✕ Refuser
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Liste des catégories actives ── */}
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#00e676', marginBottom: 12 }}>
                ✓ Catégories actives ({categories.length})
              </h3>
              {categories.length === 0 ? (
                <p style={{ fontSize: 13, color: '#555577' }}>Aucune catégorie active.</p>
              ) : (
                (() => {
                  const grouped = categories.reduce((acc, c) => {
                    const k = c.event_categ || 'Autre';
                    if (!acc[k]) acc[k] = [];
                    acc[k].push(c);
                    return acc;
                  }, {});
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {Object.entries(grouped).map(([groupe, cats]) => (
                        <div key={groupe}>
                          <div style={{ fontSize: 11, color: '#8888aa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                            {groupe}
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {cats.map(c => (
                              <span key={c._id} style={{
                                padding: '4px 12px', fontSize: 12, borderRadius: 20, fontWeight: 500,
                                background: 'rgba(0,230,118,.08)', color: '#00e676',
                                border: '1px solid rgba(0,230,118,.2)',
                              }}>
                                {c.event_type || c.event_categ}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()
              )}
            </div>
          </div>
        )}

        {/* ══ MÉDIAS ══ */}
        {activeTab === 'medias' && (
          <div>
            <h2 className="dash-section-title">Modération des médias</h2>

            {medias.length === 0 ? (
              <div className="dash-empty">
                <p className="dash-empty__icon">🖼</p>
                <p className="dash-empty__text">Aucun média en attente de modération.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {medias.map(m => (
                  <div key={m._id} style={{
                    background: '#12122a',
                    border: `1px solid ${m.signale ? 'rgba(255,77,109,.4)' : '#2a2a4a'}`,
                    borderRadius: '12px',
                    padding: '14px 16px',
                    display: 'flex',
                    gap: '14px',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                  }}>
                    {/* Miniature */}
                    <div style={{ flexShrink: 0 }}>
                      <img
                        src={m.thumbnail_url || m.file_url}
                        alt=""
                        style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, display: 'block' }}
                      />
                    </div>

                    {/* Infos */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{
                          fontSize: 11, padding: '2px 8px', borderRadius: 99, fontWeight: 600,
                          background: m.type_media === 'photo_profil' ? 'rgba(0,212,255,.15)' : 'rgba(255,107,0,.15)',
                          color: m.type_media === 'photo_profil' ? '#00d4ff' : '#ff6b00',
                        }}>
                          {m.type_media === 'photo_profil' ? 'Photo profil' : m.type_media === 'photo_officielle' ? 'Officielle' : 'Événement'}
                        </span>
                        {m.signale && (
                          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: 'rgba(255,77,109,.2)', color: '#ff4d6d', fontWeight: 600 }}>
                            ⚠ Signalé
                          </span>
                        )}
                        <span style={{ fontSize: 11, color: '#888' }}>
                          {m.statut === 'en_attente' ? '⏳ En attente' : m.statut === 'approuve' ? '✓ Approuvé' : '✕ Refusé'}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: '#e8e8f0', marginBottom: 2 }}>
                        {m.utilisateur?.first_name} {m.utilisateur?.last_name}
                      </div>
                      {m.evenement && (
                        <div style={{ fontSize: 12, color: '#8888aa' }}>📍 {m.evenement.title_event}</div>
                      )}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                      <a href={m.file_url} target="_blank" rel="noreferrer"
                        style={{ fontSize: 12, padding: '6px 12px', background: '#1e1e3a', color: '#aaa', border: '1px solid #333', borderRadius: 6, textDecoration: 'none' }}>
                        Voir
                      </a>
                      {m.statut !== 'approuve' && (
                        <button onClick={() => validerMedia(m._id, 'approuve')}
                          style={{ fontSize: 12, padding: '6px 12px', background: 'rgba(0,230,118,.15)', color: '#00e676', border: '1px solid rgba(0,230,118,.3)', borderRadius: 6, cursor: 'pointer' }}>
                          ✓ Approuver
                        </button>
                      )}
                      {m.statut !== 'refuse' && (
                        <button onClick={() => validerMedia(m._id, 'refuse')}
                          style={{ fontSize: 12, padding: '6px 12px', background: 'rgba(255,107,0,.15)', color: '#ff6b00', border: '1px solid rgba(255,107,0,.3)', borderRadius: 6, cursor: 'pointer' }}>
                          ✕ Refuser
                        </button>
                      )}
                      <button onClick={() => supprimerMedia(m._id)}
                        style={{ fontSize: 12, padding: '6px 12px', background: 'rgba(255,77,109,.15)', color: '#ff4d6d', border: '1px solid rgba(255,77,109,.3)', borderRadius: 6, cursor: 'pointer' }}>
                        🗑
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ EXPLORER ══ */}
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

        {/* ══ MES INSCRIPTIONS ══ */}
        {activeTab === 'mes-inscriptions' && (
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
                      {/* Masquer si événement terminé ou annulé */}
                      {!['terminé', 'annulé'].includes(ins.stat_event) && (
                        <button onClick={() => annulerInscription(ins.eventId)}
                          style={{ fontSize: 12, padding: '5px 10px', background: 'rgba(255,77,109,.1)', color: '#ff4d6d', border: '1px solid rgba(255,77,109,.3)', borderRadius: 6, cursor: 'pointer', fontFamily: 'Poppins,sans-serif' }}>
                          Annuler
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* ══ RÉCOMPENSES ══ */}
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

        {/* ══ SCANNER QR ══ */}
        {activeTab === 'scanner' && (
          <div className="orga-scanner-section">
            <h2 className="dash-section-title">Validation des présences</h2>
            <p className="dash-section-desc">
              Scannez ou saisissez le token QR personnel de chaque participant pour confirmer sa présence.
              Le scan n'est accepté que le jour exact de l'événement, entre l'heure de début et de fin.
            </p>

            <div className="orga-scanner-card">
              {/* Sélecteur d'événement */}
              <div className="form-group" style={{ marginBottom: fenetreInfo ? '1rem' : '1.5rem' }}>
                <label style={{ fontSize: 13, color: '#8888aa', marginBottom: 6, display: 'block' }}>
                  Événement à scanner :
                </label>
                <select
                  value={qrEventId}
                  onChange={e => {
                    setQrEventId(e.target.value);
                    setScanResultat(null);
                    setScanErreur('');
                    setScanToken('');
                  }}
                  style={{
                    background: '#1a1a35', color: '#e8e8f0',
                    padding: '8px 12px', borderRadius: '8px',
                    border: '1px solid #2a2a4a', width: '100%',
                    cursor: 'pointer', fontFamily: 'Poppins,sans-serif',
                  }}
                >
                  <option value="">— Choisir un événement publié —</option>
                  {evenements.filter(e => e.stat_event === 'publié').map(e => (
                    <option key={e._id} value={e._id}>{e.title_event}</option>
                  ))}
                </select>
              </div>

              {/* Indicateur fenêtre horaire */}
              {fenetreInfo && (
                <div style={{
                  padding: '10px 14px', borderRadius: 8, marginBottom: '1.5rem',
                  background: fenetreInfo.bg,
                  border: `1px solid ${fenetreInfo.color}44`,
                  fontSize: 13, color: fenetreInfo.color, fontWeight: 600,
                }}>
                  {fenetreInfo.label}
                  {evScan?.ev_start_time && (
                    <span style={{ fontWeight: 400, color: '#8888aa', marginLeft: 10 }}>
                      {new Date(evScan.ev_start_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      {evScan.ev_end_time && ` → ${new Date(evScan.ev_end_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`}
                    </span>
                  )}
                </div>
              )}

              {/* Formulaire de saisie du token */}
              {evScan && (
                <form onSubmit={soumettreScan}>
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label style={{ fontSize: 13, color: '#8888aa', marginBottom: 6, display: 'block' }}>
                      Token QR du participant :
                    </label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        type="text"
                        value={scanToken}
                        onChange={e => { setScanToken(e.target.value); setScanErreur(''); setScanResultat(null); }}
                        placeholder={fenetre !== 'pendant' ? 'Scan non autorisé en dehors de la fenêtre horaire' : 'Collez ou scannez le token du participant…'}
                        disabled={fenetre !== 'pendant'}
                        style={{
                          flex: 1, background: fenetre !== 'pendant' ? '#0d0d20' : '#0a0a1a',
                          color: fenetre !== 'pendant' ? '#555' : '#e8e8f0',
                          border: '1px solid #2a2a4a', borderRadius: 8,
                          padding: '10px 14px', fontFamily: 'monospace',
                          fontSize: 13, cursor: fenetre !== 'pendant' ? 'not-allowed' : 'text',
                        }}
                        autoFocus={fenetre === 'pendant'}
                      />
                      <button
                        type="submit"
                        className="dash-btn-primary"
                        disabled={scanEnCours || !scanToken.trim() || fenetre !== 'pendant'}
                        style={{ whiteSpace: 'nowrap', opacity: fenetre !== 'pendant' ? 0.4 : 1 }}
                      >
                        {scanEnCours ? '…' : '✓ Valider'}
                      </button>
                    </div>
                    <p style={{ fontSize: 11, color: '#555', marginTop: 6 }}>
                      💡 Demandez au participant d'afficher son QR code, puis copiez son token ici.
                    </p>
                  </div>
                </form>
              )}

              {/* Résultat du scan — succès */}
              {scanResultat && (
                <div style={{
                  marginTop: '1rem', padding: '16px 18px',
                  background: 'rgba(0,230,118,.08)',
                  border: '1px solid rgba(0,230,118,.3)',
                  borderRadius: 12,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: '50%',
                      background: '#00e67622', border: '2px solid #00e676',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 20, fontWeight: 700, color: '#00e676',
                    }}>
                      {scanResultat.prenom?.[0]}{scanResultat.nom?.[0]}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: '#00e676', fontSize: 16 }}>
                        ✅ {scanResultat.prenom} {scanResultat.nom}
                      </div>
                      <div style={{ fontSize: 12, color: '#8888aa' }}>
                        Présence confirmée · Fiabilité {scanResultat.fiabilite}%
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 90, background: '#0a0a1a', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#00d4ff' }}>+{scanResultat.points_gagnes}</div>
                      <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>points gagnés</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 90, background: '#0a0a1a', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#ffd700' }}>{scanResultat.cumul_points}</div>
                      <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>total points</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 90, background: '#0a0a1a', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#a78bfa' }}>{scanResultat.niveau_apres}</div>
                      <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>niveau</div>
                    </div>
                  </div>
                  {scanResultat.passage_niveau && (
                    <div style={{
                      marginTop: 10, padding: '8px 12px',
                      background: 'rgba(167,139,250,.15)', border: '1px solid rgba(167,139,250,.3)',
                      borderRadius: 8, fontSize: 13, color: '#a78bfa', fontWeight: 600, textAlign: 'center',
                    }}>
                      🏆 Passage de niveau : {scanResultat.niveau_avant} → {scanResultat.niveau_apres}
                    </div>
                  )}
                  {scanResultat.coupon_declenche && (
                    <div style={{
                      marginTop: 8, padding: '8px 12px',
                      background: 'rgba(255,107,0,.12)', border: '1px solid rgba(255,107,0,.3)',
                      borderRadius: 8, fontSize: 13, color: '#ff6b00', fontWeight: 600, textAlign: 'center',
                    }}>
                      🎫 Un coupon de réduction a été débloqué pour ce participant !
                    </div>
                  )}
                </div>
              )}

              {/* Résultat du scan — erreur */}
              {scanErreur && (
                <div style={{
                  marginTop: '1rem', padding: '12px 16px',
                  background: 'rgba(255,77,109,.08)',
                  border: '1px solid rgba(255,77,109,.3)',
                  borderRadius: 10, fontSize: 13,
                  color: '#ff4d6d', fontWeight: 500,
                }}>
                  {scanErreur}
                </div>
              )}

              {/* Aucun événement sélectionné */}
              {!evScan && (
                <div className="orga-qr-zone">
                  <div className="orga-qr-icon">
                    <svg viewBox="0 0 100 100" width="80" height="80" fill="none" stroke="currentColor" strokeWidth="3">
                      <rect x="10" y="10" width="30" height="30" rx="2" />
                      <rect x="60" y="10" width="30" height="30" rx="2" />
                      <rect x="10" y="60" width="30" height="30" rx="2" />
                      <rect x="17" y="17" width="16" height="16" fill="currentColor" opacity="0.3" />
                      <rect x="67" y="17" width="16" height="16" fill="currentColor" opacity="0.3" />
                      <rect x="17" y="67" width="16" height="16" fill="currentColor" opacity="0.3" />
                    </svg>
                  </div>
                  <p className="orga-qr-hint">Sélectionnez un événement publié ci-dessus</p>
                </div>
              )}
            </div>
          </div>
        )}

      </main>
      {qrModal && <QRModal token={qrModal.token} titre={qrModal.titre} qr_utilise={qrModal.qr_utilise} onClose={() => setQrModal(null)} />}

      {/* ── MODAL ANNULATION ÉVÉNEMENT (admin) ── */}
      {modalAnnulerEv && (
        <div className="dash-overlay" onClick={() => setModalAnnulerEv(null)}>
          <div className="dash-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="dash-modal__header">
              <h3>Annuler l'événement</h3>
              <button className="dash-modal__close" onClick={() => setModalAnnulerEv(null)}>✕</button>
            </div>
            <div style={{ padding: '0 1.5rem 1rem' }}>
              <p style={{ color: '#8888aa', fontSize: 13, marginBottom: 16 }}>
                Vous êtes sur le point d'annuler <strong style={{ color: '#e8e8f0' }}>"{modalAnnulerEv.title_event}"</strong>.
                Tous les participants inscrits seront notifiés automatiquement.
              </p>
              <form onSubmit={confirmerAnnulationEv}>
                <div className="form-group">
                  <label style={{ color: '#e8e8f0', fontSize: 13 }}>Raison de l'annulation *</label>
                  <textarea rows={4}
                    value={raisonAnnulEv}
                    onChange={e => setRaisonAnnulEv(e.target.value)}
                    placeholder="Ex : Terrain indisponible suite aux intempéries, report à une date ultérieure..."
                    style={{ background: '#1a1a35', color: '#e8e8f0', border: '1px solid #2a2a4a', borderRadius: 8, padding: '10px 12px', width: '100%', fontFamily: 'Poppins,sans-serif', resize: 'vertical', boxSizing: 'border-box' }}
                    required />
                </div>
                {/* Prévisualisation du message participants */}
                {raisonAnnulEv.trim() && (
                  <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(255,77,109,.08)', border: '1px solid rgba(255,77,109,.2)', borderRadius: 8, fontSize: 12, color: '#8888aa' }}>
                    <strong style={{ color: '#ff4d6d', display: 'block', marginBottom: 4 }}>Message envoyé aux participants :</strong>
                    L'événement "{modalAnnulerEv.title_event}" a été annulé. Raison : {raisonAnnulEv.trim()}. Nous vous présentons nos excuses pour la gêne occasionnée.
                  </div>
                )}
                <div className="dash-modal__footer">
                  <button type="submit" style={{
                    padding: '10px 20px', background: 'rgba(255,77,109,.2)', color: '#ff4d6d',
                    border: '1px solid rgba(255,77,109,.5)', borderRadius: 8, cursor: 'pointer',
                    fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 14,
                  }} disabled={savingAnnulEv}>
                    {savingAnnulEv ? 'Annulation...' : '✕ Confirmer l\'annulation'}
                  </button>
                  <button type="button" className="dash-btn-ghost" onClick={() => setModalAnnulerEv(null)}>
                    Retour
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL REFUS DE MODIFICATION ── */}
      {refusModifId && (
        <div className="dash-overlay" onClick={() => setRefusModifId(null)}>
          <div className="dash-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="dash-modal__header">
              <h3>Refuser la modification</h3>
              <button className="dash-modal__close" onClick={() => setRefusModifId(null)}>✕</button>
            </div>
            <div style={{ padding: '0 1.5rem 1rem' }}>
              <p style={{ color: '#8888aa', fontSize: 13, marginBottom: 16 }}>
                Expliquez au créateur pourquoi sa modification est refusée.
                Il recevra cette raison dans sa notification.
              </p>
              <form onSubmit={refuserModif}>
                <div className="form-group">
                  <label style={{ color: '#e8e8f0', fontSize: 13 }}>Raison du refus *</label>
                  <textarea rows={3}
                    value={raisonRefus}
                    onChange={e => setRaisonRefus(e.target.value)}
                    placeholder="Ex : Les nouvelles dates entrent en conflit avec un autre événement..."
                    style={{ background: '#1a1a35', color: '#e8e8f0', border: '1px solid #2a2a4a', borderRadius: 8, padding: '10px 12px', width: '100%', fontFamily: 'Poppins,sans-serif', resize: 'vertical', boxSizing: 'border-box' }}
                    required />
                </div>
                <div className="dash-modal__footer">
                  <button type="submit" style={{
                    padding: '10px 20px', background: 'rgba(255,77,109,.2)', color: '#ff4d6d',
                    border: '1px solid rgba(255,77,109,.5)', borderRadius: 8, cursor: 'pointer',
                    fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 14,
                  }} disabled={savingModifAction}>
                    {savingModifAction ? 'Envoi...' : '✕ Confirmer le refus'}
                  </button>
                  <button type="button" className="dash-btn-ghost" onClick={() => setRefusModifId(null)}>
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardAdmin;
