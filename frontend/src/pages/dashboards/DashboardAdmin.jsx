// ============================================================
// DashboardAdmin.jsx
// Contient TOUTES les fonctionnalités :
//   - Administration : Vue globale, Statistiques, Utilisateurs,
//     Événements, Médias (modération)
//   - Espace personnel : Explorer, Mes inscriptions, Connexions,
//     Mes créations, Récompenses, Mon profil
// ============================================================

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../api';
import StatCard        from '../../components/dashboard/StatCard';
import EventCard       from '../../components/dashboard/EventCard';
import RewardCard      from '../../components/dashboard/RewardCard';
import QRModal         from '../../components/dashboard/QRModal';
import MonEspaceModal  from '../../components/dashboard/MonEspaceModal';
import ParticipantsModal from '../../components/dashboard/ParticipantsModal';
import PhotoGallery    from '../../components/PhotoGallery';
import NotificationBell from '../../components/dashboard/NotificationBell';
import GalerieModal    from '../../components/dashboard/GalerieModal';
import PeriodeSelector from '../../components/stats/PeriodeSelector';
import { fmtDate }     from '../../utils/dates';
import '../../styles/dashboard/dashboard.css';
import '../../styles/dashboard/admin.css';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts';

// ── Constantes graphiques ─────────────────────────────────────
const MOIS_FR = ['','Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc'];
const COULEURS_NIVEAUX = ['#888888','#00e676','#00d4ff','#ffd700'];
const LABELS_NIVEAUX   = ['Débutant','Actif','Avancé','Champion'];

// Calculer dates ISO pour une période prédéfinie
const calcDatesLocales = (code) => {
  const fmt = (d) => d.toISOString().split('T')[0];
  const fin = new Date(); const deb = new Date();
  switch (code) {
    case '7j':    deb.setDate(deb.getDate() - 7);       break;
    case '30j':   deb.setDate(deb.getDate() - 30);      break;
    case '90j':   deb.setDate(deb.getDate() - 90);      break;
    case '6mois': deb.setMonth(deb.getMonth() - 6);     break;
    case '1an':   deb.setFullYear(deb.getFullYear()-1);  break;
    default:      deb.setDate(deb.getDate() - 30);
  }
  return { dateDebut: fmt(deb), dateFin: fmt(fin) };
};

// Pré-remplir les champs date/heure du formulaire de création
const mkDates = () => {
  const p = n => String(n).padStart(2,'0');
  const fmt = d => `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  const dS = new Date(); dS.setHours(dS.getHours()+2,0,0,0);
  const dE = new Date(dS); dE.setHours(dE.getHours()+1);
  return { start: fmt(dS), end: fmt(dE) };
};

// ── Composants internes ───────────────────────────────────────
const KpiCard = ({ label, value, icon, color = '#00d4ff', sub }) => (
  <div style={{ background:'#12122a', border:'1px solid #2a2a4a', borderRadius:14, padding:'18px 20px', display:'flex', alignItems:'center', gap:14 }}>
    <div style={{ width:48, height:48, borderRadius:12, background:`${color}22`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>
      {icon}
    </div>
    <div>
      <div style={{ fontSize:22, fontWeight:700, color }}>{value}</div>
      <div style={{ fontSize:12, color:'#8888aa', marginTop:2 }}>{label}</div>
      {sub && <div style={{ fontSize:11, color:'#8888aa', marginTop:1 }}>{sub}</div>}
    </div>
  </div>
);

const SecTitle = ({ children }) => (
  <h3 style={{ fontSize:13, fontWeight:700, color:'#8888aa', textTransform:'uppercase', letterSpacing:'0.06em', margin:'28px 0 14px' }}>
    {children}
  </h3>
);

// ─────────────────────────────────────────────────────────────

const DashboardAdmin = () => {
  const navigate = useNavigate();
  const { isRTL, langue, setLangue, t } = useLanguage();

  // ── Utilisateur connecté ──────────────────────────────────
  const [adminUser, setAdminUser] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading]     = useState(true);
  const [notif, setNotif]         = useState(null);

  // ── Données admin ─────────────────────────────────────────
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [evenements, setEvenements]     = useState([]);
  const [locations, setLocations]       = useState([]);
  const [categories, setCategories]     = useState([]);
  const [kpis, setKpis] = useState({ totalUsers:0, activeEvents:0, totalParticipations:0, avgReliability:0 });

  const [modalEvent, setModalEvent] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [newEvent, setNewEvent] = useState({
    title_event:'', event_description:'', ev_start_time:'',
    ev_end_time:'', max_participants:30, location:'', categories:[], stat_event:'brouillon',
  });
  const [userSearch, setUserSearch]       = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [filtreStatut, setFiltreStatut]   = useState('tous');

  // ── Médias (modération) ───────────────────────────────────
  const [mediasModeration, setMediasModeration] = useState([]);
  const [mediasLoading, setMediasLoading]       = useState(false);

  // ── Statistiques ──────────────────────────────────────────
  const [statsData, setStatsData]           = useState(null);
  const [statsLoading, setStatsLoading]     = useState(false);
  const [statsErreur, setStatsErreur]       = useState('');
  const [statsPeriode, setStatsPeriode]     = useState('30j');
  const [statsDateDebut, setStatsDateDebut] = useState('');
  const [statsDateFin, setStatsDateFin]     = useState('');
  const [reactivationEnCours, setReactivationEnCours] = useState(false);

  // ── Données personnelles (admin = utilisateur aussi) ──────
  const [mesInscriptions, setMesInscriptions] = useState([]);
  const [evenementsDispos, setEvenementsDispos] = useState([]);
  const [mesCreations, setMesCreations]       = useState([]);
  const [mesRecompenses, setMesRecompenses]   = useState([]);
  const [suggestions, setSuggestions]         = useState([]);
  const [connexions, setConnexions] = useState({ demandes_recues:[], partenaires:[], likes_donnes:[], likes_recus:[] });

  // ── Modaux personnels ─────────────────────────────────────
  const [showMonEspace, setShowMonEspace]   = useState(false);
  const [galerieOpen, setGalerieOpen]       = useState(false);
  const [qrModal, setQrModal]               = useState(null);
  const [participantsModal, setParticipantsModal] = useState(null);

  // ── Formulaire création événement (espace perso) ──────────
  const [modalCreer, setModalCreer] = useState(false);
  const [savingEvent, setSavingEvent] = useState(false);
  const [form, setForm] = useState(() => {
    const { start, end } = mkDates();
    return { title_event:'', event_description:'', ev_start_time:start, ev_end_time:end, max_participants:10, location:'', categories:[] };
  });

  // ── Suggestion catégorie / lieu ───────────────────────────
  const [showSuggCat, setShowSuggCat]     = useState(false);
  const [suggCatForm, setSuggCatForm]     = useState({ event_categ:'', event_type:'' });
  const [savingSuggCat, setSavingSuggCat] = useState(false);
  const [showSuggLieu, setShowSuggLieu]   = useState(false);
  const [suggLieuNom, setSuggLieuNom]     = useState('');
  const [suggLieuCap, setSuggLieuCap]     = useState('');
  const [savingSuggLieu, setSavingSuggLieu] = useState(false);

  // ── Modification / annulation événement (espace perso) ────
  const [modalModifier, setModalModifier]       = useState(null);
  const [formModif, setFormModif]               = useState({});
  const [savingModif, setSavingModif]           = useState(false);
  const [modalAnnuler, setModalAnnuler]         = useState(null);
  const [raisonAnnulation, setRaisonAnnulation] = useState('');
  const [savingAnnulation, setSavingAnnulation] = useState(false);

  // ── Photos et notation ────────────────────────────────────
  const [notingEvent, setNotingEvent]   = useState(null);
  const [noteValue, setNoteValue]       = useState(0);
  const [uploadingPhoto, setUploadingPhoto] = useState({});
  const [photosModal, setPhotosModal]   = useState(null);
  const [photosData, setPhotosData]     = useState({});

  // ── Profil personnel ──────────────────────────────────────
  const [profilForm, setProfilForm]   = useState({ first_name:'', last_name:'', telephone:'', langue:'fr' });
  const [savingProfil, setSavingProfil] = useState(false);

  // ── Initialisation ────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('event_token');
    const user  = localStorage.getItem('event_user');
    if (!token) { navigate('/login'); return; }
    if (user) {
      const u = JSON.parse(user);
      if (u.role !== 'admin') { navigate('/dashboard'); return; }
      setAdminUser(u);
      setProfilForm({ first_name:u.first_name||'', last_name:u.last_name||'', telephone:u.telephone||'', langue });
    }
    charger();
  }, [navigate]);

  // Charger les stats au premier accès à l'onglet statistiques
  useEffect(() => {
    if (activeTab === 'statistiques' && !statsData && !statsLoading) {
      const { dateDebut, dateFin } = calcDatesLocales('30j');
      chargerStats(dateDebut, dateFin, '30j');
    }
    if (activeTab === 'medias' && mediasModeration.length === 0 && !mediasLoading) {
      chargerMedias();
    }
  }, [activeTab]);

  // ── Chargement global ─────────────────────────────────────
  const charger = async () => {
    setLoading(true);
    try {
      const [usersR, evsR, locsR, catsR, inscR, dispoR, creaR, suggR, cxR] = await Promise.allSettled([
        api.get('/utilisateurs'),
        api.get('/evenements/all'),
        api.get('/locations'),
        api.get('/categories'),
        api.get('/participations/mes-inscriptions'),
        api.get('/evenements'),
        api.get('/evenements/mes-evenements'),
        api.get('/evenements/suggestions'),
        api.get('/connexions/mes-connexions'),
      ]);

      if (usersR.status === 'fulfilled') {
        const users = usersR.value.data.utilisateurs || [];
        setUtilisateurs(users);
        setKpis(p => ({ ...p, totalUsers:users.length, avgReliability:users.length>0 ? Math.round(users.reduce((s,u)=>s+(u.reliabilite_score||0),0)/users.length) : 0 }));
      }
      if (evsR.status === 'fulfilled') {
        const evs = evsR.value.data.evenements || [];
        setEvenements(evs);
        setKpis(p => ({ ...p, activeEvents:evs.filter(e=>e.stat_event==='publié').length, totalParticipations:evs.reduce((s,e)=>s+(e.nb_inscrits||0),0) }));
      }
      if (locsR.status === 'fulfilled') setLocations(locsR.value.data.locations || []);
      if (catsR.status === 'fulfilled') setCategories(catsR.value.data.categories || []);
      if (inscR.status === 'fulfilled') setMesInscriptions(inscR.value.data.participations || []);
      if (dispoR.status === 'fulfilled') setEvenementsDispos(dispoR.value.data.evenements || []);
      if (creaR.status === 'fulfilled') setMesCreations(creaR.value.data.evenements || []);
      if (suggR.status === 'fulfilled') setSuggestions(suggR.value.data.suggestions || []);
      if (cxR.status === 'fulfilled') setConnexions(cxR.value.data.connexions || {});

      try {
        const rew = await api.get('/recompenses/mes-coupons');
        setMesRecompenses(rew.data.coupons || []);
      } catch { setMesRecompenses([]); }
    } finally { setLoading(false); }
  };

  const chargerMedias = async () => {
    setMediasLoading(true);
    try {
      const r = await api.get('/medias/moderation');
      setMediasModeration(r.data.medias || []);
    } catch { flash('error', 'Erreur chargement médias'); }
    finally { setMediasLoading(false); }
  };

  const flash = (type, msg) => {
    setNotif({ type, msg });
    setTimeout(() => setNotif(null), 4000);
  };

  // ── Statistiques ──────────────────────────────────────────
  const chargerStats = async (dateDebut, dateFin, periode, force = false) => {
    setStatsLoading(true); setStatsErreur('');
    setStatsDateDebut(dateDebut); setStatsDateFin(dateFin); setStatsPeriode(periode);
    try {
      const params = new URLSearchParams({ dateDebut, dateFin, periode });
      if (force) params.append('force','1');
      const res = await api.get(`/stats/admin?${params.toString()}`);
      setStatsData(res.data);
    } catch (err) {
      setStatsErreur(err.response?.data?.message || 'Erreur chargement statistiques');
    } finally { setStatsLoading(false); }
  };

  const envoyerReactivation = async (userIds) => {
    if (!userIds?.length) return;
    setReactivationEnCours(true);
    try {
      const res = await api.post('/notifications/reactivation', { userIds });
      flash('success', res.data.message);
    } catch (err) {
      flash('error', err.response?.data?.message || 'Erreur réactivation');
    } finally { setReactivationEnCours(false); }
  };

  // ── Gestion utilisateurs (admin) ──────────────────────────
  const changerRole = async (userId, role) => {
    try {
      await api.put(`/utilisateurs/${userId}/role`, { role });
      setUtilisateurs(p => p.map(u => u._id===userId ? {...u,role} : u));
      flash('success', `Rôle changé en "${role}"`);
    } catch { flash('error', 'Erreur changement rôle'); }
  };

  const supprimerUser = async (userId) => {
    try {
      await api.delete(`/utilisateurs/${userId}`);
      setUtilisateurs(p => p.filter(u => u._id!==userId));
      setConfirmDelete(null);
      flash('success', 'Utilisateur supprimé');
    } catch { flash('error', 'Erreur suppression'); }
  };

  // ── Gestion événements (admin) ────────────────────────────
  const creerEvent = async (e) => {
    e.preventDefault();
    if (!newEvent.title_event.trim() || !newEvent.ev_start_time) { flash('error','Titre et date obligatoires'); return; }
    setSaving(true);
    try {
      const payload = { title_event:newEvent.title_event.trim(), event_description:newEvent.event_description.trim(), ev_start_time:newEvent.ev_start_time, ev_end_time:newEvent.ev_end_time||undefined, max_participants:Number(newEvent.max_participants), stat_event:newEvent.stat_event };
      if (newEvent.location) payload.location = newEvent.location;
      if (newEvent.categories.length) payload.categories = newEvent.categories;
      const res = await api.post('/evenements', payload);
      flash('success', res.data.message || 'Événement créé !');
      setModalEvent(false);
      setNewEvent({ title_event:'', event_description:'', ev_start_time:'', ev_end_time:'', max_participants:30, location:'', categories:[], stat_event:'brouillon' });
      charger();
    } catch (err) { flash('error', err.response?.data?.message || 'Erreur création'); }
    finally { setSaving(false); }
  };

  const changerStatut = async (id, statut) => {
    try {
      await api.put(`/evenements/${id}`, { stat_event:statut });
      setEvenements(p => p.map(e => e._id===id ? {...e,stat_event:statut} : e));
      flash('success', `Événement ${statut}`);
    } catch { flash('error', 'Erreur statut'); }
  };

  const supprimerEvent = async (id) => {
    if (!window.confirm('Supprimer cet événement et toutes ses inscriptions ?')) return;
    try {
      await api.delete(`/evenements/${id}`);
      setEvenements(p => p.filter(e => e._id!==id));
      flash('success', 'Événement supprimé');
    } catch { flash('error', 'Erreur suppression'); }
  };

  // ── Modération médias ─────────────────────────────────────
  const validerMedia = async (mediaId, statut) => {
    try {
      await api.put(`/medias/${mediaId}/valider`, { statut });
      setMediasModeration(p => p.filter(m => m._id!==mediaId));
      flash('success', statut==='approuve' ? 'Photo approuvée' : 'Photo refusée');
    } catch { flash('error', 'Erreur modération'); }
  };

  const supprimerMedia = async (mediaId) => {
    try {
      await api.delete(`/medias/${mediaId}`);
      setMediasModeration(p => p.filter(m => m._id!==mediaId));
      flash('success', 'Photo supprimée');
    } catch { flash('error', 'Erreur suppression photo'); }
  };

  // ── Fonctions personnelles (admin en tant qu'utilisateur) ─
  const sInscrire = async (eventId) => {
    try {
      await api.post(`/participations/${eventId}/inscription`);
      flash('success', 'Inscription confirmée !');
      charger(); setActiveTab('inscrits');
    } catch (err) { flash('error', err.response?.data?.message || 'Erreur inscription'); }
  };

  const annulerInscription = async (eventId) => {
    if (!window.confirm('Annuler votre inscription ?')) return;
    try {
      await api.delete(`/participations/${eventId}/annuler`);
      flash('success', 'Inscription annulée'); charger();
    } catch (err) { flash('error', err.response?.data?.message || 'Erreur annulation'); }
  };

  const sauvegarderProfil = async (e) => {
    e.preventDefault(); setSavingProfil(true);
    try {
      const res = await api.put('/utilisateurs/profil', profilForm);
      const updated = res.data.utilisateur;
      const stored = { ...adminUser, ...updated };
      localStorage.setItem('event_user', JSON.stringify(stored));
      setAdminUser(stored);
      setLangue(profilForm.langue);
      flash('success', 'Profil mis à jour');
    } catch { flash('error', 'Erreur mise à jour profil'); }
    finally { setSavingProfil(false); }
  };

  const soumettreSuggCat = async () => {
    if (!suggCatForm.event_categ.trim() || !suggCatForm.event_type.trim()) { flash('error','Groupe et sport obligatoires'); return; }
    setSavingSuggCat(true);
    try {
      const res = await api.post('/categories/suggerer', suggCatForm);
      flash('success', res.data.message); setSuggCatForm({ event_categ:'', event_type:'' }); setShowSuggCat(false);
    } catch (err) { flash('error', err.response?.data?.message || 'Erreur suggestion'); }
    finally { setSavingSuggCat(false); }
  };

  const soumettreSuggLieu = async () => {
    if (!suggLieuNom.trim()) { flash('error','Le nom du lieu est obligatoire'); return; }
    setSavingSuggLieu(true);
    try {
      const res = await api.post('/locations/suggerer', { name_location:suggLieuNom.trim(), location_capacity:suggLieuCap ? Number(suggLieuCap) : 0 });
      flash('success', res.data.message); setSuggLieuNom(''); setSuggLieuCap(''); setShowSuggLieu(false);
    } catch (err) { flash('error', err.response?.data?.message || 'Erreur suggestion'); }
    finally { setSavingSuggLieu(false); }
  };

  const soumettreEvent = async (e) => {
    e.preventDefault();
    if (!form.title_event.trim() || !form.ev_start_time) { flash('error','Titre et date obligatoires'); return; }
    setSavingEvent(true);
    try {
      const payload = { title_event:form.title_event.trim(), event_description:form.event_description.trim(), ev_start_time:form.ev_start_time, ev_end_time:form.ev_end_time||undefined, max_participants:Number(form.max_participants) };
      if (form.location) payload.location = form.location;
      if (form.categories.length) payload.categories = form.categories;
      const res = await api.post('/evenements', payload);
      flash('success', res.data.message);
      setModalCreer(false);
      const { start, end } = mkDates();
      setForm({ title_event:'', event_description:'', ev_start_time:start, ev_end_time:end, max_participants:10, location:'', categories:[] });
      charger(); setActiveTab('creations');
    } catch (err) { flash('error', err.response?.data?.message || 'Erreur création'); }
    finally { setSavingEvent(false); }
  };

  const ouvrirModification = (ev) => {
    const p = n => String(n).padStart(2,'0');
    const fmt = (d) => { if (!d) return ''; const dt=new Date(d); return `${dt.getFullYear()}-${p(dt.getMonth()+1)}-${p(dt.getDate())}T${p(dt.getHours())}:${p(dt.getMinutes())}`; };
    setFormModif({ title_event:ev.title_event||'', event_description:ev.event_description||'', ev_start_time:fmt(ev.ev_start_time), ev_end_time:fmt(ev.ev_end_time), max_participants:ev.max_participants||10, location:ev.location?._id||ev.location||'', categories:ev.categories?.map(c=>c._id||c)||[] });
    setModalModifier(ev);
  };

  const soumettreModification = async (e) => {
    e.preventDefault();
    if (!formModif.title_event?.trim() || !formModif.ev_start_time) { flash('error','Titre et date obligatoires'); return; }
    setSavingModif(true);
    try {
      const res = await api.put(`/evenements/${modalModifier._id}`, { title_event:formModif.title_event.trim(), event_description:formModif.event_description?.trim()||'', ev_start_time:formModif.ev_start_time, ev_end_time:formModif.ev_end_time||undefined, max_participants:Number(formModif.max_participants), location:formModif.location||undefined, categories:formModif.categories?.length ? formModif.categories : undefined });
      flash('success', res.data.message); setModalModifier(null); charger();
    } catch (err) { flash('error', err.response?.data?.message || 'Erreur modification'); }
    finally { setSavingModif(false); }
  };

  const confirmerAnnulation = async (e) => {
    e.preventDefault();
    if (!raisonAnnulation.trim()) { flash('error','La raison est obligatoire'); return; }
    setSavingAnnulation(true);
    try {
      const res = await api.post(`/evenements/${modalAnnuler._id}/annuler`, { raison:raisonAnnulation.trim() });
      flash('success', res.data.message); setModalAnnuler(null); setRaisonAnnulation(''); charger();
    } catch (err) { flash('error', err.response?.data?.message || 'Erreur annulation'); }
    finally { setSavingAnnulation(false); }
  };

  const supprimerCreation = async (eventId) => {
    if (!window.confirm('Supprimer cet événement ?')) return;
    try {
      await api.delete(`/evenements/${eventId}`); flash('success','Événement supprimé'); charger();
    } catch (err) { flash('error', err.response?.data?.message || 'Erreur suppression'); }
  };

  const ouvrirPhotos = async (eventId) => {
    setPhotosModal(eventId);
    if (!photosData[eventId]) {
      try {
        const r = await api.get(`/medias/evenement/${eventId}`);
        setPhotosData(p => ({ ...p, [eventId]:r.data.medias||[] }));
      } catch { setPhotosData(p => ({ ...p, [eventId]:[] })); }
    }
  };

  const uploaderPhoto = async (eventId, file) => {
    setUploadingPhoto(p => ({ ...p, [eventId]:true }));
    try {
      const fd = new FormData();
      fd.append('photo', file); fd.append('type_media','photo_evenement'); fd.append('evenement_id', eventId);
      const r = await api.post('/medias/upload', fd, { headers:{ 'Content-Type':'multipart/form-data' } });
      if (r.data.success) { setPhotosData(p => ({ ...p, [eventId]:[...(p[eventId]||[]),r.data.media] })); flash('success','Photo ajoutée !'); }
    } catch { flash('error','Erreur upload photo'); }
    setUploadingPhoto(p => ({ ...p, [eventId]:false }));
  };

  const soumettreNote = async () => {
    if (!notingEvent || noteValue < 1) return;
    try {
      await api.post(`/evenements/${notingEvent}/noter`, { note:noteValue });
      flash('success','Note enregistrée !'); setNotingEvent(null); setNoteValue(0);
    } catch (err) { flash('error', err.response?.data?.message || 'Erreur notation'); }
  };

  const repondrePartenaire = async (connexionId, statut) => {
    try {
      await api.put(`/connexions/partenaire/${connexionId}`, { statut });
      flash('success', statut==='accepte' ? 'Partenariat accepté !' : 'Demande refusée'); charger();
    } catch { flash('error','Erreur'); }
  };

  // ── Calculs dérivés ───────────────────────────────────────
  const getNiveau = (pts) => {
    if (pts >= 500) return { label:'Champion', color:'#ffd700', icon:'🏆' };
    if (pts >= 200) return { label:'Avancé',   color:'#00d4ff', icon:'⚡' };
    if (pts >= 50)  return { label:'Actif',    color:'#00e676', icon:'🌟' };
    return                 { label:'Débutant', color:'#888',    icon:'🎯' };
  };

  const statutStyle = (s) => ({
    publié:   { bg:'rgba(0,230,118,.15)',  color:'#00e676', label:'✓ Publié' },
    brouillon:{ bg:'rgba(255,107,0,.15)',  color:'#ff6b00', label:'⏳ En attente de validation' },
    annulé:   { bg:'rgba(255,77,109,.15)', color:'#ff4d6d', label:'✕ Annulé' },
    terminé:  { bg:'rgba(136,136,136,.15)',color:'#888',    label:'■ Terminé' },
  }[s] || { bg:'#1a1a35', color:'#888', label:s });

  const usersFiltres = utilisateurs.filter(u =>
    `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(userSearch.toLowerCase())
  );
  const evsFiltres = filtreStatut==='tous' ? evenements : evenements.filter(e=>e.stat_event===filtreStatut);
  const aValider = evenements.filter(ev => ev.stat_event==='brouillon' && ev.createur?._id && adminUser?._id && ev.createur._id.toString()!==adminUser._id.toString());
  const badge = (s) => ({ publié:{cls:'badge-success',label:'Publié'}, brouillon:{cls:'badge-warning',label:'Brouillon'}, annulé:{cls:'badge-danger',label:'Annulé'}, terminé:{cls:'badge-gray',label:'Terminé'} }[s] || {cls:'badge-gray',label:s});
  const niveau = getNiveau(adminUser?.cumul_points || 0);
  const inscritIds = new Set(mesInscriptions.map(i => i.eventId));

  // Données graphiques
  const dataEvolution = (statsData?.participation?.evolution_mensuelle||[]).map(m => ({ name:`${MOIS_FR[m.mois]||m.mois}/${String(m.annee).slice(-2)}`, Inscrits:m.nb_inscrits, 'Présences':m.nb_presences }));
  const dataNiveaux = LABELS_NIVEAUX.map((label,i) => ({ name:label, value:Object.values(statsData?.utilisateurs?.repartition_niveaux||{})[i]||0 }));
  const dataStatuts = Object.entries(statsData?.evenements?.repartition_statuts||{}).map(([name,value])=>({name,value}));
  const dataCategories = (statsData?.evenements?.top5_categories||[]).map(c=>({ name:c.categorie, value:c.nb_participations, note:c.note_moyenne }));

  if (loading) return (
    <div className="dash-loading">
      <div className="dash-spinner"></div>
      <p>Chargement admin...</p>
    </div>
  );

  return (
    <div className={`dashboard-page admin-page ${isRTL ? 'rtl' : ''}`}>

      {/* Flash notification */}
      {notif && (
        <div className={`dash-notif dash-notif--${notif.type}`}>
          {notif.type==='success' ? '✓' : '⚠'} {notif.msg}
        </div>
      )}

      {/* Confirmation suppression utilisateur */}
      {confirmDelete && (
        <div className="dash-overlay">
          <div className="dash-confirm-modal">
            <h3>Confirmer la suppression</h3>
            <p>Supprimer <strong>{confirmDelete.nom}</strong> ?</p>
            <p className="dash-confirm-warning">⚠ Action irréversible.</p>
            <div className="dash-confirm-btns">
              <button className="dash-btn-danger" onClick={() => supprimerUser(confirmDelete.id)}>Supprimer</button>
              <button className="dash-btn-ghost"  onClick={() => setConfirmDelete(null)}>Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* ── HEADER ────────────────────────────────────────────── */}
      <header className="dash-header admin-header">
        <div className="dash-header__left">
          <Link to="/" className="dash-logo">EVENT</Link>
          <span className="dash-breadcrumb">/ Administration</span>
          <span className="admin-badge">ADMIN</span>
        </div>

        <div className="dash-header__right">
          {/* Niveau de l'admin */}
          <div className="dash-niveau" style={{ color:niveau.color }}>
            <span>{niveau.icon}</span>
            <span>{niveau.label}</span>
          </div>

          {/* Avatar avec initiales */}
          <div className="dash-user-chip">
            <div className="dash-avatar" style={{ overflow:'hidden', padding:adminUser?.photo ? 0 : undefined }}>
              {adminUser?.photo
                ? <img src={adminUser.photo} alt="avatar" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
                : <>{adminUser?.first_name?.[0]}{adminUser?.last_name?.[0]}</>
              }
            </div>
            <span className="dash-username">{adminUser?.first_name} {adminUser?.last_name}</span>
          </div>

          {/* Cloche de notifications */}
          <NotificationBell />

          {/* Bouton Mon compte */}
          <button
            className="dash-btn-ghost"
            onClick={() => setShowMonEspace(true)}
            title="Modifier vos informations personnelles et mot de passe"
            style={{ display:'flex', alignItems:'center', gap:6 }}
          >
            👤 Mon compte
          </button>

          {/* Galerie photos */}
          <button
            className="dash-btn-ghost"
            onClick={() => setGalerieOpen(true)}
            title="Galerie photos"
            style={{ display:'flex', alignItems:'center', gap:6 }}
          >
            📸 Galerie
          </button>

          {/* Espace utilisateur */}
          <button
            className="dash-btn-ghost"
            onClick={() => navigate('/dashboard')}
            title="Accéder à votre espace participant"
            style={{ display:'flex', alignItems:'center', gap:6 }}
          >
            🏃 Espace utilisateur
          </button>

          <button className="dash-btn-logout" onClick={() => { localStorage.clear(); navigate('/login'); }}>
            Déconnexion
          </button>
        </div>
      </header>

      {/* Modaux globaux */}
      {galerieOpen && <GalerieModal onClose={() => setGalerieOpen(false)} isAdmin={true} />}
      {showMonEspace && (
        <MonEspaceModal
          utilisateur={adminUser}
          onClose={() => setShowMonEspace(false)}
          onUpdate={(u) => setAdminUser(u)}
        />
      )}

      <main className="dash-main">

        {/* ── NAVIGATION ────────────────────────────────────────── */}
        <nav className="admin-nav">
          {/* Onglets administration */}
          {[
            { key:'overview',      label:'Vue globale',   icon:'📊' },
            { key:'statistiques',  label:'Statistiques',  icon:'📈' },
            { key:'users',         label:'Utilisateurs',  icon:'👥' },
            { key:'events',        label:'Événements',    icon:'🏟' },
            { key:'medias',        label:'Médias',        icon:'📷' },
          ].map(t => (
            <button key={t.key} className={`admin-nav-btn ${activeTab===t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>
              <span className="admin-nav-icon">{t.icon}</span>
              {t.label}
              {t.key==='users' && <span className="dash-tab-badge">{utilisateurs.length}</span>}
              {t.key==='events' && (
                <>
                  <span className="dash-tab-badge">{evenements.length}</span>
                  {aValider.length > 0 && <span style={{ background:'#ff4d6d', color:'#fff', borderRadius:'999px', fontSize:'10px', fontWeight:700, padding:'1px 6px' }}>{aValider.length} à valider</span>}
                </>
              )}
              {t.key==='medias' && mediasModeration.length > 0 && <span className="dash-tab-badge" style={{ background:'#ff4d6d' }}>{mediasModeration.length}</span>}
            </button>
          ))}

          {/* Séparateur visuel */}
          <span style={{ width:1, background:'#2a2a4a', margin:'4px 6px', alignSelf:'stretch' }} />

          {/* Onglets espace personnel */}
          {[
            { key:'explorer',    label:'Explorer',        icon:'🔍', count:evenementsDispos.length },
            { key:'inscrits',    label:'Mes inscriptions',icon:'🗓',  count:mesInscriptions.length },
            { key:'connexions',  label:'Connexions',      icon:'🤝', count:connexions.demandes_recues?.length||0, color:'#ec4899' },
            { key:'creations',   label:'Mes créations',   icon:'📋', count:mesCreations.length, color:'#9c27b0' },
            { key:'recompenses', label:'Récompenses',     icon:'🎫', count:mesRecompenses.filter(r=>!r.is_redeemed).length, color:'#ff6b00' },
            { key:'profil',      label:'Mon profil',      icon:'👤', count:0 },
          ].map(t => (
            <button key={t.key} className={`admin-nav-btn ${activeTab===t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>
              <span className="admin-nav-icon">{t.icon}</span>
              {t.label}
              {t.count > 0 && <span className="dash-tab-badge" style={t.color ? { background:t.color } : {}}>{t.count}</span>}
            </button>
          ))}
        </nav>

        {/* ══ VUE GLOBALE ══════════════════════════════════════ */}
        {activeTab==='overview' && (
          <div>
            <h2 className="dash-section-title">Vue d'ensemble</h2>
            <div className="dash-stats-grid">
              <StatCard label="Utilisateurs"   value={kpis.totalUsers}          icon="👥" color="#00d4ff" />
              <StatCard label="Publiés"         value={kpis.activeEvents}        icon="🏟" color="#00e676" />
              <StatCard label="Participations"  value={kpis.totalParticipations} icon="✅" color="#ff6b00" />
              <StatCard label="Fiabilité moy." value={`${kpis.avgReliability}%`} icon="📈" color="#ffd700" />
            </div>

            {aValider.length > 0 && (
              <div style={{ marginTop:'1.5rem', padding:'14px 18px', background:'rgba(255,107,0,.1)', border:'1px solid rgba(255,107,0,.4)', borderRadius:'12px', display:'flex', justifyContent:'space-between', alignItems:'center', gap:'12px', flexWrap:'wrap' }}>
                <div>
                  <span style={{ color:'#ff6b00', fontWeight:700, fontSize:'15px' }}>
                    ⏳ {aValider.length} événement{aValider.length>1?'s':''} en attente de validation
                  </span>
                  <p style={{ color:'#8888aa', fontSize:'12px', margin:'4px 0 0' }}>
                    Des utilisateurs ont soumis des événements qui nécessitent votre approbation.
                  </p>
                </div>
                <button className="dash-btn-primary" onClick={() => setActiveTab('events')}>Valider maintenant →</button>
              </div>
            )}

            <div className="admin-card" style={{ marginTop:'1.5rem' }}>
              <div className="admin-card__header">
                <h3>Derniers événements</h3>
                <button className="dash-btn-primary" onClick={() => setActiveTab('events')}>Gérer →</button>
              </div>
              <table className="admin-table">
                <thead><tr><th>Titre</th><th>Créateur</th><th>Statut</th><th>Inscrits</th></tr></thead>
                <tbody>
                  {evenements.slice(0,5).map(ev => {
                    const b = badge(ev.stat_event);
                    return (
                      <tr key={ev._id}>
                        <td>{ev.title_event}</td>
                        <td className="text-muted" style={{ fontSize:'12px' }}>{ev.createur?.first_name} {ev.createur?.last_name}</td>
                        <td><span className={`badge ${b.cls}`}>{b.label}</span></td>
                        <td>{ev.nb_inscrits||0}/{ev.max_participants}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══ STATISTIQUES ═════════════════════════════════════ */}
        {activeTab==='statistiques' && (
          <div>
            <h2 className="dash-section-title">Statistiques</h2>

            <PeriodeSelector
              periodeActive={statsPeriode}
              periodeInfo={statsData?.periode_info}
              loading={statsLoading}
              onPeriodeChange={(dateDebut, dateFin, periode, force) => chargerStats(dateDebut, dateFin, periode, force)}
            />

            {statsErreur && (
              <div style={{ padding:'12px 16px', background:'rgba(255,77,109,.1)', border:'1px solid rgba(255,77,109,.3)', borderRadius:10, color:'#ff4d6d', marginBottom:20 }}>
                ⚠ {statsErreur}
              </div>
            )}

            {statsLoading && !statsData && (
              <div style={{ textAlign:'center', padding:'3rem', color:'#8888aa' }}>
                <div className="dash-spinner" style={{ margin:'0 auto 12px' }}></div>
                Calcul des statistiques en cours…
              </div>
            )}

            {statsData && (
              <>
                {statsData.periode_info && (
                  <div style={{ padding:'10px 16px', background:'#0a0a1a', borderRadius:10, marginBottom:20, fontSize:12, color:'#8888aa' }}>
                    Analyse sur <strong style={{ color:'#00d4ff' }}>{statsData.periode_info.nb_jours} jours</strong>
                    {' '}— du <strong style={{ color:'#e8e8f0' }}>{statsData.periode_info.dateDebut}</strong>
                    {' '}au <strong style={{ color:'#e8e8f0' }}>{statsData.periode_info.dateFin}</strong>
                  </div>
                )}

                <SecTitle>Indicateurs clés</SecTitle>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:14, marginBottom:8 }}>
                  <KpiCard label="Taux de présence"   value={`${statsData.participation.taux_presence_global}%`} icon="✅" color="#00e676" sub={`${statsData.participation.taux_abandon}% d'abandon`} />
                  <KpiCard label="Événements créés"   value={statsData.evenements.total_crees} icon="🏟" color="#00d4ff" sub={`${statsData.evenements.total_publies} publiés · ${statsData.evenements.taux_annulation}% annulés`} />
                  <KpiCard label="Utilisateurs actifs" value={`${statsData.utilisateurs.taux_activation}%`} icon="👥" color="#a78bfa" sub={`${statsData.utilisateurs.nouveaux_periode} nouveaux inscrits`} />
                  <KpiCard label="Connexions créées"  value={statsData.social.connexions_creees} icon="🤝" color="#ffd700" sub={`${statsData.social.taux_acceptation_partenariats}% partenariats acceptés`} />
                </div>

                <SecTitle>Graphiques</SecTitle>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(340px,1fr))', gap:20, marginBottom:8 }}>
                  <div style={{ background:'#12122a', border:'1px solid #2a2a4a', borderRadius:14, padding:'18px 16px' }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'#e8e8f0', marginBottom:14 }}>Évolution des participations</div>
                    {dataEvolution.length > 0 ? (
                      <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={dataEvolution}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
                          <XAxis dataKey="name" tick={{ fill:'#8888aa', fontSize:11 }} />
                          <YAxis tick={{ fill:'#8888aa', fontSize:11 }} />
                          <Tooltip contentStyle={{ background:'#12122a', border:'1px solid #2a2a4a', borderRadius:8 }} labelStyle={{ color:'#e8e8f0' }} />
                          <Legend wrapperStyle={{ fontSize:11 }} />
                          <Line type="monotone" dataKey="Inscrits"   stroke="#00d4ff" strokeWidth={2} dot={{ r:3 }} />
                          <Line type="monotone" dataKey="Présences"  stroke="#ff6b00" strokeWidth={2} strokeDasharray="5 3" dot={{ r:3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div style={{ height:220, display:'flex', alignItems:'center', justifyContent:'center', color:'#8888aa', fontSize:13 }}>Aucune donnée sur la période</div>
                    )}
                  </div>

                  <div style={{ background:'#12122a', border:'1px solid #2a2a4a', borderRadius:14, padding:'18px 16px' }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'#e8e8f0', marginBottom:14 }}>Répartition des niveaux utilisateurs</div>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={dataNiveaux} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                          {dataNiveaux.map((_,i) => <Cell key={i} fill={COULEURS_NIVEAUX[i]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background:'#12122a', border:'1px solid #2a2a4a', borderRadius:8 }} formatter={(v,name) => [`${v} utilisateurs`, name]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ display:'flex', gap:10, flexWrap:'wrap', justifyContent:'center', marginTop:6 }}>
                      {LABELS_NIVEAUX.map((l,i) => (
                        <span key={l} style={{ fontSize:11, color:'#8888aa', display:'flex', alignItems:'center', gap:4 }}>
                          <span style={{ width:10, height:10, borderRadius:'50%', background:COULEURS_NIVEAUX[i], display:'inline-block' }} />
                          {l} ({dataNiveaux[i]?.value||0})
                        </span>
                      ))}
                    </div>
                  </div>

                  <div style={{ background:'#12122a', border:'1px solid #2a2a4a', borderRadius:14, padding:'18px 16px' }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'#e8e8f0', marginBottom:14 }}>État des événements</div>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={dataStatuts}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
                        <XAxis dataKey="name" tick={{ fill:'#8888aa', fontSize:11 }} />
                        <YAxis tick={{ fill:'#8888aa', fontSize:11 }} />
                        <Tooltip contentStyle={{ background:'#12122a', border:'1px solid #2a2a4a', borderRadius:8 }} />
                        <Bar dataKey="value" label={{ position:'top', fill:'#8888aa', fontSize:11 }}>
                          {dataStatuts.map((entry,i) => <Cell key={i} fill={entry.name==='publié'?'#00684A':entry.name==='brouillon'?'#E87722':entry.name==='annulé'?'#CC0000':'#888888'} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div style={{ background:'#12122a', border:'1px solid #2a2a4a', borderRadius:14, padding:'18px 16px' }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'#e8e8f0', marginBottom:14 }}>Top 5 sports pratiqués</div>
                    {dataCategories.length > 0 ? (
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={dataCategories} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
                          <XAxis type="number" tick={{ fill:'#8888aa', fontSize:11 }} />
                          <YAxis type="category" dataKey="name" tick={{ fill:'#8888aa', fontSize:11 }} width={70} />
                          <Tooltip contentStyle={{ background:'#12122a', border:'1px solid #2a2a4a', borderRadius:8 }} formatter={(v,name,{payload}) => [`${v} participations · Note: ${payload.note}/5`, payload.name]} />
                          <Bar dataKey="value" fill="#00d4ff" radius={[0,4,4,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div style={{ height:200, display:'flex', alignItems:'center', justifyContent:'center', color:'#8888aa', fontSize:13 }}>Aucune donnée sur la période</div>
                    )}
                  </div>
                </div>

                <SecTitle>Alertes et actions</SecTitle>
                <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:8 }}>
                  {(statsData.utilisateurs.inactifs_30j?.length||0) > 0 && (
                    <div style={{ padding:'14px 18px', background:'rgba(255,107,0,.08)', border:'1px solid rgba(255,107,0,.3)', borderRadius:12, display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                      <div>
                        <div style={{ color:'#ff6b00', fontWeight:700 }}>😴 {statsData.utilisateurs.inactifs_30j.length} utilisateur{statsData.utilisateurs.inactifs_30j.length>1?'s':''} inactif{statsData.utilisateurs.inactifs_30j.length>1?'s':''} depuis 30 jours</div>
                        <div style={{ fontSize:12, color:'#8888aa', marginTop:4 }}>Ces utilisateurs n'ont pas participé depuis plus d'un mois.</div>
                      </div>
                      <button onClick={() => envoyerReactivation(statsData.utilisateurs.inactifs_30j.map(u=>u._id))} disabled={reactivationEnCours} style={{ padding:'8px 18px', background:'rgba(255,107,0,.2)', color:'#ff6b00', border:'1px solid rgba(255,107,0,.4)', borderRadius:8, cursor:'pointer', fontFamily:'Poppins,sans-serif', fontWeight:600, fontSize:12, whiteSpace:'nowrap' }}>
                        {reactivationEnCours ? '…' : '📬 Envoyer notification de réactivation'}
                      </button>
                    </div>
                  )}
                  {statsData.evenements.taux_annulation > 20 && (
                    <div style={{ padding:'14px 18px', background:'rgba(255,77,109,.08)', border:'1px solid rgba(255,77,109,.3)', borderRadius:12 }}>
                      <div style={{ color:'#ff4d6d', fontWeight:700 }}>⚠️ Taux d'annulation élevé : {statsData.evenements.taux_annulation}%</div>
                      <div style={{ fontSize:12, color:'#8888aa', marginTop:4 }}>Suggestion : vérifier les causes d'annulation dans l'onglet Événements.</div>
                    </div>
                  )}
                  <div style={{ padding:'12px 16px', background:'#12122a', border:'1px solid #2a2a4a', borderRadius:12, display:'flex', gap:16, alignItems:'center', flexWrap:'wrap' }}>
                    <span style={{ fontSize:13, color:'#8888aa' }}>Note moyenne globale :</span>
                    <span style={{ fontSize:18, fontWeight:700, color:'#ffd700' }}>⭐ {statsData.evenements.note_moyenne_globale}/5</span>
                    <span style={{ fontSize:13, color:'#8888aa' }}>Récurrence (3+ participations) :</span>
                    <span style={{ fontSize:18, fontWeight:700, color:'#00e676' }}>{statsData.participation.recurrence}%</span>
                  </div>
                </div>

                <SecTitle>Top 10 participants actifs</SecTitle>
                <div className="admin-card" style={{ marginBottom:8 }}>
                  <table className="admin-table">
                    <thead><tr><th>Rang</th><th>Nom</th><th>Points</th><th>Présences</th><th>Fiabilité</th></tr></thead>
                    <tbody>
                      {(statsData.utilisateurs.top10_actifs||[]).map((u,i) => (
                        <tr key={u._id||i} style={{ background:i%2===0?'rgba(0,212,255,.03)':'transparent' }}>
                          <td style={{ fontWeight:700, color:i===0?'#ffd700':i===1?'#c0c0c0':i===2?'#cd7f32':'#8888aa' }}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':`#${i+1}`}</td>
                          <td>{u.first_name} {u.last_name}</td>
                          <td style={{ color:'#ffd700', fontWeight:600 }}>{u.cumul_points||0} pts</td>
                          <td style={{ color:'#00e676', fontWeight:600 }}>{u.nb_presences}</td>
                          <td>
                            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                              <div style={{ flex:1, height:4, background:'#1a1a35', borderRadius:2, minWidth:60 }}>
                                <div style={{ height:'100%', background:(u.reliabilite_score||0)>=80?'#00e676':'#ff6b00', borderRadius:2, width:`${u.reliabilite_score||0}%` }} />
                              </div>
                              <span style={{ fontSize:11, color:'#8888aa' }}>{u.reliabilite_score||0}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {(statsData.utilisateurs.top10_actifs||[]).length===0 && (
                        <tr><td colSpan={5} style={{ textAlign:'center', color:'#8888aa', padding:'1.5rem' }}>Aucune présence enregistrée sur cette période.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <SecTitle>Indicateurs sociaux</SecTitle>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:12, marginBottom:8 }}>
                  <KpiCard label="Connexions créées"      value={statsData.social.connexions_creees}                        icon="🤝" color="#00d4ff" />
                  <KpiCard label="Partenariats acceptés"  value={`${statsData.social.taux_acceptation_partenariats}%`}       icon="🤜" color="#00e676" />
                  <KpiCard label="Note collab. moyenne"   value={`${statsData.social.note_collaboration_moyenne}/5`}         icon="⭐" color="#ffd700" />
                  <KpiCard label="Utilisateurs connectés" value={`${statsData.social.participants_avec_connexion}%`}         icon="🌐" color="#a78bfa" />
                  <KpiCard label="Équipes formées"        value={statsData.social.equipes_formees}                           icon="👥" color="#ff6b00" />
                </div>

                <SecTitle>IA & Récompenses</SecTitle>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:12, marginBottom:8 }}>
                  <KpiCard label="Vouchers générés"   value={statsData.ia_recompenses.vouchers_generes}                   icon="🎫" color="#00d4ff" />
                  <KpiCard label="Vouchers utilisés"  value={statsData.ia_recompenses.vouchers_utilises}                  icon="✅" color="#00e676" />
                  <KpiCard label="Taux d'utilisation" value={`${statsData.ia_recompenses.taux_utilisation_vouchers}%`}    icon="📊" color="#ffd700" />
                  <KpiCard label="Remise moyenne"     value={`${statsData.ia_recompenses.remise_moyenne}%`}               icon="💰" color="#ff6b00" />
                </div>

                <SecTitle>Médias</SecTitle>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:12, marginBottom:24 }}>
                  <KpiCard label="Photos uploadées"       value={statsData.medias.photos_uploadees}            icon="📸" color="#00d4ff" />
                  <KpiCard label="Taux d'approbation"     value={`${statsData.medias.taux_approbation}%`}      icon="✅" color="#00e676" />
                  <KpiCard label="Photos signalées"       value={statsData.medias.photos_signalees}            icon="⚠️" color="#ff4d6d" />
                  <KpiCard label="Moy. photos/événement" value={statsData.medias.photos_par_evenement_moyen}   icon="🖼" color="#a78bfa" />
                </div>
              </>
            )}
          </div>
        )}

        {/* ══ UTILISATEURS ═════════════════════════════════════ */}
        {activeTab==='users' && (
          <div>
            <div className="admin-section-header">
              <h2 className="dash-section-title">Gestion des utilisateurs</h2>
              <input type="search" className="admin-search" placeholder="Rechercher..." value={userSearch} onChange={e => setUserSearch(e.target.value)} />
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
                        <select className={`admin-role-select ${u.role==='admin'?'role-admin':'role-user'}`} value={u.role} onChange={e => changerRole(u._id, e.target.value)}>
                          <option value="user">user</option>
                          <option value="organisateur">organisateur</option>
                          <option value="admin">admin</option>
                        </select>
                      </td>
                      <td>{u.cumul_points||0} pts</td>
                      <td>
                        <div className="admin-reliability">
                          <div className="admin-reliability-bar" style={{ width:`${u.reliabilite_score||0}%`, background:(u.reliabilite_score||0)>=80?'#00e676':'#ff6b00' }} />
                          <span>{u.reliabilite_score||0}%</span>
                        </div>
                      </td>
                      <td>
                        <button className="admin-btn-icon admin-btn-danger" onClick={() => setConfirmDelete({ id:u._id, nom:`${u.first_name} ${u.last_name}` })}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══ ÉVÉNEMENTS (admin) ═══════════════════════════════ */}
        {activeTab==='events' && (
          <div>
            <div className="admin-section-header">
              <h2 className="dash-section-title">Gestion des événements</h2>
              <button className="dash-btn-primary" onClick={() => setModalEvent(true)}>+ Créer</button>
            </div>

            {aValider.length > 0 && (
              <div style={{ marginBottom:'1.5rem' }}>
                <h3 style={{ fontSize:'14px', fontWeight:600, color:'#ff6b00', marginBottom:'10px' }}>⏳ À valider ({aValider.length})</h3>
                <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                  {aValider.map(ev => (
                    <div key={ev._id} style={{ background:'rgba(255,107,0,.05)', border:'1px solid rgba(255,107,0,.3)', borderRadius:'10px', padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'center', gap:'12px', flexWrap:'wrap' }}>
                      <div>
                        <div style={{ fontWeight:600, color:'#e8e8f0', marginBottom:'4px' }}>{ev.title_event}</div>
                        <div style={{ fontSize:'12px', color:'#8888aa' }}>Soumis par : {ev.createur?.first_name} {ev.createur?.last_name} · {new Date(ev.ev_start_time).toLocaleDateString('fr-FR')}</div>
                      </div>
                      <div style={{ display:'flex', gap:'8px' }}>
                        <button className="admin-btn-sm admin-btn-success" onClick={() => changerStatut(ev._id,'publié')}>✓ Publier</button>
                        <button className="admin-btn-sm" onClick={() => supprimerEvent(ev._id)} style={{ background:'rgba(255,77,109,.15)', color:'#ff4d6d', border:'1px solid rgba(255,77,109,.3)' }}>✕ Refuser</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display:'flex', gap:'6px', marginBottom:'12px', flexWrap:'wrap' }}>
              {['tous','publié','brouillon','annulé','terminé'].map(s => (
                <button key={s} onClick={() => setFiltreStatut(s)} style={{ padding:'4px 14px', fontSize:'12px', cursor:'pointer', borderRadius:'999px', background:filtreStatut===s?'#00d4ff':'transparent', color:filtreStatut===s?'#0a0a1a':'#8888aa', border:'1px solid', borderColor:filtreStatut===s?'#00d4ff':'#2a2a4a', fontWeight:filtreStatut===s?700:400, fontFamily:'Poppins,sans-serif', textTransform:'capitalize' }}>
                  {s==='tous' ? `Tous (${evenements.length})` : `${s} (${evenements.filter(e=>e.stat_event===s).length})`}
                </button>
              ))}
            </div>

            <div className="admin-card">
              <table className="admin-table">
                <thead><tr><th>Titre</th><th>Créateur</th><th>Date</th><th>Places</th><th>Statut</th><th>Actions</th></tr></thead>
                <tbody>
                  {evsFiltres.length===0 ? (
                    <tr><td colSpan="6" style={{ textAlign:'center', color:'#8888aa', padding:'2rem' }}>Aucun événement.</td></tr>
                  ) : evsFiltres.map(ev => {
                    const b = badge(ev.stat_event);
                    return (
                      <tr key={ev._id}>
                        <td style={{ maxWidth:'180px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ev.title_event}</td>
                        <td className="text-muted" style={{ fontSize:'12px' }}>{ev.createur?.first_name} {ev.createur?.last_name}</td>
                        <td className="text-muted" style={{ fontSize:'12px' }}>{new Date(ev.ev_start_time).toLocaleDateString('fr-FR')}</td>
                        <td style={{ fontSize:'12px' }}>{ev.nb_inscrits||0}/{ev.max_participants}</td>
                        <td><span className={`badge ${b.cls}`}>{b.label}</span></td>
                        <td>
                          <div className="admin-actions">
                            {ev.stat_event==='brouillon' && <button className="admin-btn-sm admin-btn-success" onClick={() => changerStatut(ev._id,'publié')}>Publier</button>}
                            {ev.stat_event==='publié'    && <button className="admin-btn-sm admin-btn-warning" onClick={() => changerStatut(ev._id,'annulé')}>Annuler</button>}
                            <button className="admin-btn-icon admin-btn-danger" onClick={() => supprimerEvent(ev._id)} title="Supprimer">✕</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

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
                      <input type="text" value={newEvent.title_event} onChange={e => setNewEvent({...newEvent,title_event:e.target.value})} placeholder="Ex: Tournoi Football Ariana" required />
                    </div>
                    <div className="form-group">
                      <label>Description</label>
                      <textarea rows={3} value={newEvent.event_description} onChange={e => setNewEvent({...newEvent,event_description:e.target.value})} placeholder="Décrivez l'événement..." />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Date début *</label>
                        <input type="datetime-local" value={newEvent.ev_start_time} onChange={e => setNewEvent({...newEvent,ev_start_time:e.target.value})} required />
                      </div>
                      <div className="form-group">
                        <label>Date fin</label>
                        <input type="datetime-local" value={newEvent.ev_end_time} onChange={e => setNewEvent({...newEvent,ev_end_time:e.target.value})} />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Participants max</label>
                        <input type="number" min="1" value={newEvent.max_participants} onChange={e => setNewEvent({...newEvent,max_participants:e.target.value})} />
                      </div>
                      <div className="form-group">
                        <label>Statut initial</label>
                        <select value={newEvent.stat_event} onChange={e => setNewEvent({...newEvent,stat_event:e.target.value})} style={{ background:'#1a1a35', color:'#e8e8f0', cursor:'pointer' }}>
                          <option value="brouillon">Brouillon</option>
                          <option value="publié">Publier directement</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Lieu</label>
                      <select value={newEvent.location} onChange={e => setNewEvent({...newEvent,location:e.target.value})} style={{ background:'#1a1a35', color:'#e8e8f0', cursor:'pointer' }}>
                        <option value="">— Sélectionner —</option>
                        {locations.map(l => <option key={l._id} value={l._id}>{l.name_location}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Catégorie</label>
                      <select value={newEvent.categories[0]||''} onChange={e => setNewEvent({...newEvent,categories:e.target.value?[e.target.value]:[]})} style={{ background:'#1a1a35', color:'#e8e8f0', cursor:'pointer' }}>
                        <option value="">— Sélectionner —</option>
                        {categories.map(c => <option key={c._id} value={c._id}>{c.event_categ} — {c.event_type}</option>)}
                      </select>
                    </div>
                    <div className="dash-modal__footer">
                      <button type="submit" className="dash-btn-primary" disabled={saving}>{saving ? 'Enregistrement...' : 'Créer l\'événement'}</button>
                      <button type="button" className="dash-btn-ghost" onClick={() => setModalEvent(false)}>Annuler</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ MÉDIAS (modération) ══════════════════════════════ */}
        {activeTab==='medias' && (
          <div>
            <div className="admin-section-header">
              <h2 className="dash-section-title">Modération des médias</h2>
              <button className="dash-btn-ghost" onClick={chargerMedias} disabled={mediasLoading}>
                {mediasLoading ? '…' : '🔄 Actualiser'}
              </button>
            </div>

            {mediasLoading && (
              <div style={{ textAlign:'center', padding:'2rem', color:'#8888aa' }}>
                <div className="dash-spinner" style={{ margin:'0 auto 10px' }}></div>
                Chargement des médias…
              </div>
            )}

            {!mediasLoading && mediasModeration.length===0 && (
              <div className="dash-empty">
                <p className="dash-empty__icon">✅</p>
                <p className="dash-empty__text">Aucun média en attente de modération.</p>
              </div>
            )}

            {mediasModeration.length > 0 && (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:16 }}>
                {mediasModeration.map(m => (
                  <div key={m._id} style={{ background:'#12122a', border:`1px solid ${m.signale?'rgba(255,77,109,.4)':'#2a2a4a'}`, borderRadius:14, overflow:'hidden' }}>
                    <div style={{ position:'relative', aspectRatio:'16/9', background:'#0a0a1a' }}>
                      <img src={m.thumbnail_url||m.file_url} alt="media" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                      {m.signale && (
                        <span style={{ position:'absolute', top:8, right:8, background:'rgba(255,77,109,.9)', color:'#fff', fontSize:11, padding:'3px 8px', borderRadius:99, fontWeight:700 }}>
                          ⚠ Signalé ({m.signale_par?.length||0}×)
                        </span>
                      )}
                    </div>
                    <div style={{ padding:'12px 14px' }}>
                      <div style={{ fontSize:12, color:'#e8e8f0', fontWeight:600, marginBottom:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {m.evenement?.title_event || 'Événement inconnu'}
                      </div>
                      <div style={{ fontSize:11, color:'#8888aa', marginBottom:10 }}>
                        Par {m.utilisateur?.first_name} {m.utilisateur?.last_name}
                      </div>
                      <div style={{ display:'flex', gap:8 }}>
                        <button onClick={() => validerMedia(m._id,'approuve')} style={{ flex:1, padding:'6px', background:'rgba(0,230,118,.15)', color:'#00e676', border:'1px solid rgba(0,230,118,.3)', borderRadius:7, cursor:'pointer', fontSize:12, fontFamily:'Poppins,sans-serif', fontWeight:600 }}>
                          ✓ Approuver
                        </button>
                        <button onClick={() => validerMedia(m._id,'refuse')} style={{ flex:1, padding:'6px', background:'rgba(255,107,0,.15)', color:'#ff6b00', border:'1px solid rgba(255,107,0,.3)', borderRadius:7, cursor:'pointer', fontSize:12, fontFamily:'Poppins,sans-serif', fontWeight:600 }}>
                          ✕ Refuser
                        </button>
                        <button onClick={() => supprimerMedia(m._id)} title="Supprimer définitivement" style={{ padding:'6px 10px', background:'rgba(255,77,109,.15)', color:'#ff4d6d', border:'1px solid rgba(255,77,109,.3)', borderRadius:7, cursor:'pointer', fontSize:14 }}>
                          🗑
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ EXPLORER (personnel) ═════════════════════════════ */}
        {activeTab==='explorer' && (() => {
          return (
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem', flexWrap:'wrap', gap:12 }}>
                <h2 className="dash-section-title" style={{ margin:0 }}>Explorer les événements</h2>
                <button className="dash-btn-primary" onClick={() => setModalCreer(true)}>+ Proposer un événement</button>
              </div>

              {suggestions.length > 0 && (
                <div style={{ marginBottom:24 }}>
                  <h3 style={{ fontSize:14, fontWeight:600, color:'#a78bfa', marginBottom:12 }}>✨ Recommandé pour vous</h3>
                  <div className="dash-events-grid">
                    {suggestions.slice(0,4).map(ev => (
                      <div key={ev._id} style={{ position:'relative' }}>
                        <span style={{ position:'absolute', top:8, right:8, background:'#a78bfa22', color:'#a78bfa', fontSize:10, padding:'2px 7px', borderRadius:99, fontWeight:600, zIndex:1 }}>
                          {Math.round((ev.score||0)*100)}% match
                        </span>
                        <EventCard event={{ ...ev, id:ev._id }} mode="explorer" estInscrit={inscritIds.has(ev._id)} onSInscrire={() => sInscrire(ev._id)} onSeDesinscrire={() => annulerInscription(ev._id)} />
                      </div>
                    ))}
                  </div>
                  <hr style={{ border:'none', borderTop:'1px solid #2a2a4a', margin:'20px 0' }} />
                </div>
              )}

              {evenementsDispos.length===0 ? (
                <div className="dash-empty">
                  <p className="dash-empty__icon">📅</p>
                  <p className="dash-empty__text">Aucun événement disponible.</p>
                </div>
              ) : (
                <div className="dash-events-grid">
                  {evenementsDispos.map(ev => (
                    <EventCard key={ev._id} event={{ ...ev, id:ev._id }} mode="explorer" estInscrit={inscritIds.has(ev._id)} onSInscrire={() => sInscrire(ev._id)} onSeDesinscrire={() => annulerInscription(ev._id)} />
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* ══ MES INSCRIPTIONS (personnel) ════════════════════ */}
        {activeTab==='inscrits' && (
          mesInscriptions.length===0 ? (
            <div className="dash-empty">
              <p className="dash-empty__icon">🏃</p>
              <p className="dash-empty__text">Vous n'êtes inscrit à aucun événement.</p>
              <button className="dash-btn-primary" onClick={() => setActiveTab('explorer')}>Explorer →</button>
            </div>
          ) : (
            <div>
              <h2 className="dash-section-title">Mes inscriptions</h2>
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {mesInscriptions.map(ins => (
                  <div key={ins.id} style={{ background:'#12122a', border:'1px solid #2a2a4a', borderRadius:14, padding:'1rem 1.25rem' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:8 }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:15, fontWeight:600, color:'#e8e8f0', marginBottom:4 }}>{ins.titre}</div>
                        <div style={{ fontSize:12, color:'#8888aa' }}>
                          📅 {ins.date ? fmtDate(ins.date) : 'Date N/A'} · 📍 {ins.lieu||'N/A'}
                          {ins.is_present && <span style={{ marginLeft:8, color:'#10b981', fontWeight:600 }}>✅ Présent</span>}
                        </div>
                      </div>
                      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                        <button className="dash-btn-ghost" style={{ fontSize:12, padding:'5px 10px', color:ins.qr_utilise?'#10b981':undefined }} onClick={() => setQrModal({ eventId:ins.eventId, token:ins.qr_token, titre:ins.titre, qr_utilise:ins.qr_utilise })}>
                          {ins.qr_utilise ? '✅ QR scanné' : '📱 QR'}
                        </button>
                        <button className="dash-btn-ghost" style={{ fontSize:12, padding:'5px 10px' }} onClick={() => setParticipantsModal(ins.eventId)}>👥 Participants</button>
                        <button className="dash-btn-ghost" style={{ fontSize:12, padding:'5px 10px' }} onClick={() => ouvrirPhotos(ins.eventId)}>📷 Photos</button>
                        {ins.is_present && (
                          <button className="dash-btn-ghost" style={{ fontSize:12, padding:'5px 10px', color:'#f59e0b' }} onClick={() => { setNotingEvent(ins.eventId); setNoteValue(0); }}>⭐ Noter</button>
                        )}
                        {!['terminé','annulé'].includes(ins.stat_event) && (
                          <button onClick={() => annulerInscription(ins.eventId)} style={{ fontSize:12, padding:'5px 10px', background:'rgba(255,77,109,.1)', color:'#ff4d6d', border:'1px solid rgba(255,77,109,.3)', borderRadius:6, cursor:'pointer', fontFamily:'Poppins,sans-serif' }}>Annuler</button>
                        )}
                      </div>
                    </div>
                    {photosModal===ins.eventId && (
                      <div style={{ marginTop:12, paddingTop:12, borderTop:'1px solid #2a2a4a' }}>
                        <PhotoGallery photos={photosData[ins.eventId]||[]} peutAjouter={true} uploading={!!uploadingPhoto[ins.eventId]} onAjouter={(file) => uploaderPhoto(ins.eventId, file)} />
                        <button onClick={() => setPhotosModal(null)} style={{ marginTop:8, fontSize:11, color:'#666', background:'none', border:'none', cursor:'pointer' }}>Fermer galerie</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        )}

        {/* ══ CONNEXIONS (personnel) ═══════════════════════════ */}
        {activeTab==='connexions' && (
          <div>
            <h2 className="dash-section-title">Mes connexions</h2>
            <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
              {(connexions.demandes_recues?.length||0) > 0 && (
                <div>
                  <h3 style={{ fontSize:14, fontWeight:600, color:'#ec4899', marginBottom:10 }}>🤝 Demandes reçues ({connexions.demandes_recues.length})</h3>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {connexions.demandes_recues.map(cx => (
                      <div key={cx._id} style={{ background:'#12122a', border:'1px solid #2a2a4a', borderRadius:10, padding:'10px 14px', display:'flex', alignItems:'center', gap:12 }}>
                        <div style={{ flex:1 }}>
                          <span style={{ color:'#e8e8f0', fontWeight:600 }}>{cx.demandeur?.first_name} {cx.demandeur?.last_name}</span>
                          <span style={{ color:'#666', fontSize:12, marginLeft:8 }}>via {cx.evenement?.title_event}</span>
                        </div>
                        <button onClick={() => repondrePartenaire(cx._id,'accepte')} style={{ background:'#10b98122', color:'#10b981', border:'1px solid #10b981', borderRadius:6, padding:'5px 12px', cursor:'pointer', fontSize:12 }}>Accepter</button>
                        <button onClick={() => repondrePartenaire(cx._id,'refuse')}  style={{ background:'#ef444422', color:'#ef4444', border:'1px solid #ef4444', borderRadius:6, padding:'5px 12px', cursor:'pointer', fontSize:12 }}>Refuser</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <h3 style={{ fontSize:14, fontWeight:600, color:'#10b981', marginBottom:10 }}>✅ Partenaires ({connexions.partenaires?.length||0})</h3>
                {(connexions.partenaires?.length||0)===0
                  ? <p style={{ color:'#555', fontSize:13 }}>Aucun partenaire pour l'instant.</p>
                  : <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                      {connexions.partenaires.map(cx => {
                        const autre = cx.demandeur?.first_name ? cx.demandeur : cx.receveur;
                        return <div key={cx._id} style={{ background:'#12122a', border:'1px solid #2a2a4a', borderRadius:10, padding:'8px 14px', fontSize:13, color:'#e8e8f0' }}>🤝 {autre?.first_name} {autre?.last_name}</div>;
                      })}
                    </div>
                }
              </div>
              <div>
                <h3 style={{ fontSize:14, fontWeight:600, color:'#ef4444', marginBottom:10 }}>❤️ Likes donnés ({connexions.likes_donnes?.length||0})</h3>
                {(connexions.likes_donnes?.length||0)===0
                  ? <p style={{ color:'#555', fontSize:13 }}>Vous n'avez encore liké personne.</p>
                  : <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                      {connexions.likes_donnes.map(cx => (
                        <div key={cx._id} style={{ background:'#12122a', border:'1px solid #2a2a4a', borderRadius:10, padding:'8px 14px', fontSize:13, color:'#e8e8f0' }}>❤️ {cx.receveur?.first_name} {cx.receveur?.last_name}</div>
                      ))}
                    </div>
                }
              </div>
            </div>
          </div>
        )}

        {/* ══ MES CRÉATIONS (personnel) ════════════════════════ */}
        {activeTab==='creations' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
              <h2 className="dash-section-title" style={{ margin:0 }}>Mes créations</h2>
              <button className="dash-btn-primary" onClick={() => setModalCreer(true)}>+ Proposer un événement</button>
            </div>
            {mesCreations.length===0 ? (
              <div className="dash-empty">
                <p className="dash-empty__icon">📋</p>
                <p className="dash-empty__text">Vous n'avez encore proposé aucun événement.</p>
                <button className="dash-btn-primary" onClick={() => setModalCreer(true)}>Proposer mon premier événement</button>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                {mesCreations.map(ev => {
                  const s = statutStyle(ev.stat_event);
                  const peutModifier = !['annulé','terminé'].includes(ev.stat_event) && !ev.modification_en_attente;
                  const peutAnnuler  = ev.stat_event==='publié' && !ev.annulation_en_attente;
                  return (
                    <div key={ev._id} style={{ background:'#12122a', border:'1px solid #2a2a4a', borderRadius:'14px', padding:'1.25rem' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'16px' }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:'15px', fontWeight:600, color:'#e8e8f0', marginBottom:'6px' }}>{ev.title_event}</div>
                          <div style={{ display:'flex', gap:'12px', flexWrap:'wrap', fontSize:'12px', color:'#8888aa' }}>
                            <span>📅 {fmtDate(ev.ev_start_time)}</span>
                            <span>📍 {ev.lieu||'Lieu non défini'}</span>
                            <span>👥 {ev.nb_inscrits||0}/{ev.max_participants} inscrits</span>
                          </div>
                          {ev.stat_event==='annulé' && ev.raison_annulation && (
                            <div style={{ marginTop:8, padding:'6px 10px', background:'rgba(255,77,109,.08)', border:'1px solid rgba(255,77,109,.2)', borderRadius:6, fontSize:12, color:'#ff4d6d' }}>
                              Raison : {ev.raison_annulation}
                            </div>
                          )}
                        </div>
                        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'8px', flexShrink:0 }}>
                          <div style={{ display:'flex', gap:6, flexWrap:'wrap', justifyContent:'flex-end' }}>
                            <span style={{ padding:'4px 12px', borderRadius:'999px', fontSize:'11px', fontWeight:700, background:s.bg, color:s.color }}>{s.label}</span>
                            {ev.modification_en_attente && <span style={{ padding:'4px 12px', borderRadius:'999px', fontSize:'11px', fontWeight:700, background:'rgba(245,158,11,.15)', color:'#f59e0b' }}>⏳ Modification en attente</span>}
                            {ev.annulation_en_attente   && <span style={{ padding:'4px 12px', borderRadius:'999px', fontSize:'11px', fontWeight:700, background:'rgba(255,77,109,.15)', color:'#ff4d6d' }}>⚠️ Annulation en attente</span>}
                          </div>
                          <div style={{ display:'flex', gap:6 }}>
                            {peutModifier && <button onClick={() => ouvrirModification(ev)} style={{ padding:'6px 12px', background:'rgba(0,212,255,.1)', color:'#00d4ff', border:'1px solid rgba(0,212,255,.3)', borderRadius:'6px', fontSize:'12px', cursor:'pointer', fontFamily:'Poppins,sans-serif' }}>✏️ Modifier</button>}
                            {peutAnnuler  && <button onClick={() => { setModalAnnuler(ev); setRaisonAnnulation(''); }} style={{ padding:'6px 12px', background:'rgba(255,77,109,.15)', color:'#ff4d6d', border:'1px solid rgba(255,77,109,.3)', borderRadius:'6px', fontSize:'12px', cursor:'pointer', fontFamily:'Poppins,sans-serif' }}>Annuler</button>}
                            {ev.stat_event==='brouillon' && <button onClick={() => supprimerCreation(ev._id)} style={{ padding:'6px 12px', background:'rgba(255,77,109,.15)', color:'#ff4d6d', border:'1px solid rgba(255,77,109,.3)', borderRadius:'6px', fontSize:'12px', cursor:'pointer', fontFamily:'Poppins,sans-serif' }}>Supprimer</button>}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══ RÉCOMPENSES (personnel) ══════════════════════════ */}
        {activeTab==='recompenses' && (
          mesRecompenses.length===0 ? (
            <div className="dash-empty">
              <p className="dash-empty__icon">🎫</p>
              <p className="dash-empty__text">Participez à des événements pour gagner des coupons !</p>
            </div>
          ) : (
            <div>
              <h2 className="dash-section-title">Mes récompenses</h2>
              <div className="dash-rewards-grid">
                {mesRecompenses.map(r => <RewardCard key={r.id} recompense={r} />)}
              </div>
            </div>
          )
        )}

        {/* ══ MON PROFIL (personnel) ═══════════════════════════ */}
        {activeTab==='profil' && (
          <div style={{ maxWidth:'520px' }}>
            <h2 className="dash-section-title">Mon profil</h2>
            <div className="orga-form-card">
              <form onSubmit={sauvegarderProfil} className="admin-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Prénom *</label>
                    <input type="text" value={profilForm.first_name} onChange={e => setProfilForm({...profilForm,first_name:e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label>Nom *</label>
                    <input type="text" value={profilForm.last_name} onChange={e => setProfilForm({...profilForm,last_name:e.target.value})} required />
                  </div>
                </div>
                <div className="form-group">
                  <label>Téléphone</label>
                  <input type="tel" value={profilForm.telephone} onChange={e => setProfilForm({...profilForm,telephone:e.target.value})} placeholder="+216 XX XXX XXX" />
                </div>
                <div className="form-group">
                  <label>Langue</label>
                  <select value={profilForm.langue} onChange={e => setProfilForm({...profilForm,langue:e.target.value})} style={{ background:'#1a1a35', color:'#e8e8f0', cursor:'pointer' }}>
                    <option value="fr">Français</option>
                    <option value="en">English</option>
                    <option value="ar">العربية</option>
                    <option value="ar-tn">تونسي</option>
                  </select>
                </div>
                <div style={{ marginTop:'1rem' }}>
                  <button type="submit" className="dash-btn-primary" disabled={savingProfil}>
                    {savingProfil ? 'Enregistrement...' : 'Sauvegarder'}
                  </button>
                </div>
              </form>

              <div style={{ marginTop:'2rem', paddingTop:'1.5rem', borderTop:'1px solid #2a2a4a' }}>
                <h3 style={{ fontSize:'14px', fontWeight:600, marginBottom:'1rem', color:'#8888aa' }}>Mes statistiques personnelles</h3>
                <div style={{ display:'flex', gap:'1rem', flexWrap:'wrap' }}>
                  <div style={{ flex:1, minWidth:'110px', background:'#0a0a1a', borderRadius:'10px', padding:'12px', textAlign:'center' }}>
                    <div style={{ fontSize:'22px', fontWeight:700, color:'#00d4ff' }}>{adminUser?.cumul_points||0}</div>
                    <div style={{ fontSize:'11px', color:'#8888aa', marginTop:'4px' }}>Points</div>
                  </div>
                  <div style={{ flex:1, minWidth:'110px', background:'#0a0a1a', borderRadius:'10px', padding:'12px', textAlign:'center' }}>
                    <div style={{ fontSize:'22px', fontWeight:700, color:'#00e676' }}>{adminUser?.cumul_heures_participation||0}h</div>
                    <div style={{ fontSize:'11px', color:'#8888aa', marginTop:'4px' }}>Heures sport</div>
                  </div>
                  <div style={{ flex:1, minWidth:'110px', background:'#0a0a1a', borderRadius:'10px', padding:'12px', textAlign:'center' }}>
                    <div style={{ fontSize:'22px', fontWeight:700, color:'#ffd700' }}>{adminUser?.reliabilite_score??100}%</div>
                    <div style={{ fontSize:'11px', color:'#8888aa', marginTop:'4px' }}>Fiabilité</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ── MODAUX PERSONNELS ─────────────────────────────────── */}
      {qrModal && <QRModal token={qrModal.token} titre={qrModal.titre} qr_utilise={qrModal.qr_utilise} onClose={() => setQrModal(null)} />}
      {participantsModal && <ParticipantsModal evenementId={participantsModal} onClose={() => setParticipantsModal(null)} />}

      {/* Modal notation événement */}
      {notingEvent && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={() => setNotingEvent(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background:'#1e1e2e', borderRadius:16, padding:28, minWidth:280, textAlign:'center' }}>
            <h3 style={{ color:'#e8e8f0', marginBottom:16, fontSize:16 }}>⭐ Noter cet événement</h3>
            <div style={{ display:'flex', justifyContent:'center', gap:8, marginBottom:20 }}>
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => setNoteValue(n)} style={{ fontSize:28, background:'none', border:'none', cursor:'pointer', opacity:n<=noteValue?1:0.3 }}>⭐</button>
              ))}
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
              <button className="dash-btn-primary" onClick={soumettreNote} disabled={noteValue===0}>Enregistrer</button>
              <button className="dash-btn-ghost" onClick={() => setNotingEvent(null)}>Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal créer événement (espace perso) */}
      {modalCreer && (
        <div className="dash-overlay" onClick={() => setModalCreer(false)}>
          <div className="dash-modal" onClick={e => e.stopPropagation()}>
            <div className="dash-modal__header">
              <h3>Proposer un événement</h3>
              <button className="dash-modal__close" onClick={() => setModalCreer(false)}>✕</button>
            </div>
            <div style={{ margin:'0 1.5rem 0', padding:'10px 14px', background:'rgba(255,107,0,.1)', border:'1px solid rgba(255,107,0,.3)', borderRadius:'8px', fontSize:'12px', color:'#ff6b00' }}>
              💡 Votre événement sera soumis en <strong>brouillon</strong>. L'administrateur le validera avant publication.
            </div>
            <form onSubmit={soumettreEvent} className="admin-form">
              <div className="form-group">
                <label>Titre *</label>
                <input type="text" value={form.title_event} onChange={e => setForm({...form,title_event:e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea rows={3} value={form.event_description} onChange={e => setForm({...form,event_description:e.target.value})} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Date et heure de début *</label>
                  <input type="datetime-local" value={form.ev_start_time} onChange={e => { const start=e.target.value; let autoFin=''; if(start){const d=new Date(start);d.setHours(d.getHours()+1);const p=n=>String(n).padStart(2,'0');autoFin=`${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;} setForm({...form,ev_start_time:start,ev_end_time:autoFin}); }} required />
                </div>
                <div className="form-group">
                  <label>Date et heure de fin</label>
                  <input type="datetime-local" value={form.ev_end_time} onChange={e => setForm({...form,ev_end_time:e.target.value})} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Participants max</label>
                  <input type="number" min="2" value={form.max_participants} onChange={e => setForm({...form,max_participants:e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Lieu</label>
                  <select value={form.location} onChange={e => setForm({...form,location:e.target.value})} style={{ background:'#1a1a35', color:'#e8e8f0', cursor:'pointer' }}>
                    <option value="">— Sélectionner —</option>
                    {locations.map(l => <option key={l._id} value={l._id}>{l.name_location}{l.location_capacity?` (${l.location_capacity} pers.)`:''}</option>)}
                  </select>
                  {!showSuggLieu ? (
                    <button type="button" onClick={() => setShowSuggLieu(true)} style={{ marginTop:5, fontSize:11, color:'#8888aa', background:'none', border:'none', cursor:'pointer', padding:0, display:'block' }}>+ Mon lieu n'est pas dans la liste ? Suggérer</button>
                  ) : (
                    <div style={{ marginTop:8, padding:'10px', background:'rgba(0,212,255,.06)', border:'1px solid rgba(0,212,255,.2)', borderRadius:8 }}>
                      <div style={{ display:'flex', gap:6, marginBottom:6, flexWrap:'wrap' }}>
                        <input placeholder="Nom du lieu *" value={suggLieuNom} onChange={e => setSuggLieuNom(e.target.value)} style={{ flex:2, minWidth:120, background:'#1a1a35', color:'#e8e8f0', border:'1px solid #2a2a4a', borderRadius:6, padding:'6px 10px', fontFamily:'Poppins,sans-serif', fontSize:12 }} />
                        <input placeholder="Capacité" type="number" min="0" value={suggLieuCap} onChange={e => setSuggLieuCap(e.target.value)} style={{ flex:1, minWidth:80, background:'#1a1a35', color:'#e8e8f0', border:'1px solid #2a2a4a', borderRadius:6, padding:'6px 10px', fontFamily:'Poppins,sans-serif', fontSize:12 }} />
                      </div>
                      <div style={{ display:'flex', gap:6 }}>
                        <button type="button" onClick={soumettreSuggLieu} disabled={savingSuggLieu} style={{ padding:'5px 12px', background:'rgba(0,212,255,.2)', color:'#00d4ff', border:'1px solid rgba(0,212,255,.3)', borderRadius:6, fontSize:12, cursor:'pointer', fontFamily:'Poppins,sans-serif', fontWeight:600 }}>{savingSuggLieu?'...':'📍 Suggérer'}</button>
                        <button type="button" onClick={() => { setShowSuggLieu(false); setSuggLieuNom(''); setSuggLieuCap(''); }} style={{ padding:'5px 10px', background:'transparent', color:'#8888aa', border:'1px solid #2a2a4a', borderRadius:6, fontSize:12, cursor:'pointer', fontFamily:'Poppins,sans-serif' }}>Annuler</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="form-group">
                <label>Type de sport</label>
                <select value={form.categories[0]||''} onChange={e => setForm({...form,categories:e.target.value?[e.target.value]:[]})} style={{ background:'#1a1a35', color:'#e8e8f0', cursor:'pointer' }}>
                  <option value="">— Sélectionner —</option>
                  {categories.map(c => <option key={c._id} value={c._id}>{c.event_categ} — {c.event_type}</option>)}
                </select>
                {!showSuggCat ? (
                  <button type="button" onClick={() => setShowSuggCat(true)} style={{ marginTop:5, fontSize:11, color:'#8888aa', background:'none', border:'none', cursor:'pointer', padding:0, display:'block' }}>+ Mon sport n'est pas dans la liste ? Suggérer</button>
                ) : (
                  <div style={{ marginTop:8, padding:'10px', background:'rgba(167,139,250,.06)', border:'1px solid rgba(167,139,250,.2)', borderRadius:8 }}>
                    <div style={{ display:'flex', gap:6, marginBottom:6, flexWrap:'wrap' }}>
                      <input placeholder="Groupe (ex: Aquatique)" value={suggCatForm.event_categ} onChange={e => setSuggCatForm(p=>({...p,event_categ:e.target.value}))} style={{ flex:1, minWidth:120, background:'#1a1a35', color:'#e8e8f0', border:'1px solid #2a2a4a', borderRadius:6, padding:'6px 10px', fontFamily:'Poppins,sans-serif', fontSize:12 }} />
                      <input placeholder="Sport (ex: Natation)" value={suggCatForm.event_type} onChange={e => setSuggCatForm(p=>({...p,event_type:e.target.value}))} style={{ flex:1, minWidth:120, background:'#1a1a35', color:'#e8e8f0', border:'1px solid #2a2a4a', borderRadius:6, padding:'6px 10px', fontFamily:'Poppins,sans-serif', fontSize:12 }} />
                    </div>
                    <div style={{ display:'flex', gap:6 }}>
                      <button type="button" onClick={soumettreSuggCat} disabled={savingSuggCat} style={{ padding:'5px 12px', background:'rgba(167,139,250,.2)', color:'#a78bfa', border:'1px solid rgba(167,139,250,.3)', borderRadius:6, fontSize:12, cursor:'pointer', fontFamily:'Poppins,sans-serif', fontWeight:600 }}>{savingSuggCat?'...':'🏷 Suggérer'}</button>
                      <button type="button" onClick={() => { setShowSuggCat(false); setSuggCatForm({event_categ:'',event_type:''}); }} style={{ padding:'5px 10px', background:'transparent', color:'#8888aa', border:'1px solid #2a2a4a', borderRadius:6, fontSize:12, cursor:'pointer', fontFamily:'Poppins,sans-serif' }}>Annuler</button>
                    </div>
                  </div>
                )}
              </div>
              <div className="dash-modal__footer">
                <button type="submit" className="dash-btn-primary" disabled={savingEvent}>{savingEvent?'Envoi...':'📨 Soumettre l\'événement'}</button>
                <button type="button" className="dash-btn-ghost" onClick={() => setModalCreer(false)}>Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal modifier événement (espace perso) */}
      {modalModifier && (
        <div className="dash-overlay" onClick={() => setModalModifier(null)}>
          <div className="dash-modal" onClick={e => e.stopPropagation()}>
            <div className="dash-modal__header">
              <h3>Modifier l'événement</h3>
              <button className="dash-modal__close" onClick={() => setModalModifier(null)}>✕</button>
            </div>
            <div style={{ margin:'0 1.5rem 0', padding:'10px 14px', background:'rgba(245,158,11,.1)', border:'1px solid rgba(245,158,11,.3)', borderRadius:'8px', fontSize:'12px', color:'#f59e0b' }}>
              ⏳ Vos modifications seront soumises à validation avant d'être appliquées.
            </div>
            <form onSubmit={soumettreModification} className="admin-form">
              <div className="form-group"><label>Titre *</label><input type="text" value={formModif.title_event||''} onChange={e => setFormModif({...formModif,title_event:e.target.value})} required /></div>
              <div className="form-group"><label>Description</label><textarea rows={3} value={formModif.event_description||''} onChange={e => setFormModif({...formModif,event_description:e.target.value})} /></div>
              <div className="form-row">
                <div className="form-group"><label>Date début *</label><input type="datetime-local" value={formModif.ev_start_time||''} onChange={e => setFormModif({...formModif,ev_start_time:e.target.value})} required /></div>
                <div className="form-group"><label>Date fin</label><input type="datetime-local" value={formModif.ev_end_time||''} onChange={e => setFormModif({...formModif,ev_end_time:e.target.value})} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Participants max</label><input type="number" min="2" value={formModif.max_participants||10} onChange={e => setFormModif({...formModif,max_participants:e.target.value})} /></div>
                <div className="form-group">
                  <label>Lieu</label>
                  <select value={formModif.location||''} onChange={e => setFormModif({...formModif,location:e.target.value})} style={{ background:'#1a1a35', color:'#e8e8f0', cursor:'pointer' }}>
                    <option value="">— Sélectionner —</option>
                    {locations.map(l => <option key={l._id} value={l._id}>{l.name_location}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Type de sport</label>
                <select value={formModif.categories?.[0]||''} onChange={e => setFormModif({...formModif,categories:e.target.value?[e.target.value]:[]})} style={{ background:'#1a1a35', color:'#e8e8f0', cursor:'pointer' }}>
                  <option value="">— Sélectionner —</option>
                  {categories.map(c => <option key={c._id} value={c._id}>{c.event_categ} — {c.event_type}</option>)}
                </select>
              </div>
              <div className="dash-modal__footer">
                <button type="submit" className="dash-btn-primary" disabled={savingModif}>{savingModif?'Envoi...':'📨 Soumettre la modification'}</button>
                <button type="button" className="dash-btn-ghost" onClick={() => setModalModifier(null)}>Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal annuler événement (espace perso) */}
      {modalAnnuler && (
        <div className="dash-overlay" onClick={() => setModalAnnuler(null)}>
          <div className="dash-modal" onClick={e => e.stopPropagation()} style={{ maxWidth:480 }}>
            <div className="dash-modal__header">
              <h3>Annuler l'événement</h3>
              <button className="dash-modal__close" onClick={() => setModalAnnuler(null)}>✕</button>
            </div>
            <div style={{ padding:'0 1.5rem 1rem' }}>
              <p style={{ color:'#8888aa', fontSize:13, marginBottom:16 }}>
                Annuler <strong style={{ color:'#e8e8f0' }}>"{modalAnnuler.title_event}"</strong>. Un organisateur ou admin devra confirmer.
              </p>
              <form onSubmit={confirmerAnnulation}>
                <div className="form-group">
                  <label style={{ color:'#e8e8f0', fontSize:13 }}>Raison *</label>
                  <textarea rows={4} value={raisonAnnulation} onChange={e => setRaisonAnnulation(e.target.value)} placeholder="Ex : Terrain indisponible..." style={{ background:'#1a1a35', color:'#e8e8f0', border:'1px solid #2a2a4a', borderRadius:8, padding:'10px 12px', width:'100%', fontFamily:'Poppins,sans-serif', resize:'vertical', boxSizing:'border-box' }} required />
                </div>
                <div className="dash-modal__footer">
                  <button type="submit" style={{ padding:'10px 20px', background:'rgba(255,77,109,.2)', color:'#ff4d6d', border:'1px solid rgba(255,77,109,.5)', borderRadius:8, cursor:'pointer', fontFamily:'Poppins,sans-serif', fontWeight:600, fontSize:14 }} disabled={savingAnnulation}>
                    {savingAnnulation?'Envoi...':'📨 Soumettre la demande'}
                  </button>
                  <button type="button" className="dash-btn-ghost" onClick={() => setModalAnnuler(null)}>Retour</button>
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
