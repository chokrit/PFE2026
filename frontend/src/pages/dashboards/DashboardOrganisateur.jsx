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
import '../../styles/dashboard/organisateur.css';

const DashboardOrganisateur = () => {
    const navigate = useNavigate();
    const { isRTL } = useLanguage();

    const [organisateur, setOrganisateur] = useState(null);
    const [mesEvents, setMesEvents] = useState([]);
    const [activeTab, setActiveTab] = useState('mes-events');
    const [loading, setLoading] = useState(true);
    const [notification, setNotification] = useState(null);

    const [showFormEvent, setShowFormEvent] = useState(false);
    const [formEvent, setFormEvent] = useState({
        title_event: '', event_description: '', ev_start_time: '',
        ev_end_time: '', max_participants: 30,
    });
    const [savingEvent, setSavingEvent] = useState(false);

    const [eventSelectionne, setEventSelectionne] = useState(null);
    const [participants, setParticipants] = useState([]);

    const [profilForm, setProfilForm] = useState({
        first_name: '', last_name: '', telephone: '', sexe: '', langue: 'fr',
    });
    const [savingProfil, setSavingProfil] = useState(false);

    const [qrEventId, setQrEventId] = useState('');
    const [showMonEspace, setShowMonEspace] = useState(false);

    // ── État du scanner de présence ───────────────────────
    const [scanToken, setScanToken]         = useState('');
    const [scanResultat, setScanResultat]   = useState(null);
    const [scanErreur, setScanErreur]       = useState('');
    const [scanEnCours, setScanEnCours]     = useState(false);
    const [envoisAbsents, setEnvoisAbsents] = useState({});

    // ── Participation aux événements (comme un utilisateur) ─
    const [mesInscriptions, setMesInscriptions] = useState([]);
    const [evenementsDispos, setEvenementsDispos] = useState([]);
    const [mesRecompenses, setMesRecompenses]     = useState([]);
    const [suggestions, setSuggestions]           = useState([]);
    const [qrModal, setQrModal]                   = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('event_token');
        const user = localStorage.getItem('event_user');
        if (!token) { navigate('/login'); return; }
        if (user) {
            const u = JSON.parse(user);
            if (!['admin', 'organisateur'].includes(u.role)) { navigate('/dashboards'); return; }
            setOrganisateur(u);
            setProfilForm({
                first_name: u.first_name || '',
                last_name: u.last_name || '',
                telephone: u.telephone || '',
                sexe: u.sexe || '',
                langue: u.langue || 'fr',
            });
        }
        chargerMesEvents();
    }, [navigate]);

    const chargerMesEvents = async () => {
        setLoading(true);
        try {
            const [evsR, inscR, dispoR, suggR] = await Promise.allSettled([
                api.get('/evenements/mes-evenements'),
                api.get('/participations/mes-inscriptions'),
                api.get('/evenements'),
                api.get('/evenements/suggestions'),
            ]);
            if (evsR.status === 'fulfilled')   setMesEvents(evsR.value.data.evenements || []);
            if (inscR.status === 'fulfilled')  setMesInscriptions(inscR.value.data.participations || []);
            if (dispoR.status === 'fulfilled') setEvenementsDispos(dispoR.value.data.evenements || []);
            if (suggR.status === 'fulfilled')  setSuggestions(suggR.value.data.suggestions || []);
            try {
                const rew = await api.get('/recompenses/mes-coupons');
                setMesRecompenses(rew.data.coupons || []);
            } catch { setMesRecompenses([]); }
        } catch {
            notif('error', 'Erreur chargement données');
        } finally {
            setLoading(false);
        }
    };

    const chargerParticipants = async (eventId) => {
        try {
            const res = await api.get(`/participations/evenement/${eventId}`);
            setParticipants(res.data.participants || []);
        } catch {
            notif('error', 'Erreur chargement participants');
        }
    };

    const notif = (type, msg) => {
        setNotification({ type, msg });
        setTimeout(() => setNotification(null), 3000);
    };

    const creerEvent = async (e) => {
        e.preventDefault();
        setSavingEvent(true);
        try {
            await api.post('/evenements', { ...formEvent, stat_event: 'publié' });
            notif('success', 'Événement créé et publié !');
            setShowFormEvent(false);
            setFormEvent({ title_event: '', event_description: '', ev_start_time: '', ev_end_time: '', max_participants: 30 });
            chargerMesEvents();
        } catch (err) {
            notif('error', err.response?.data?.message || 'Erreur création');
        } finally {
            setSavingEvent(false);
        }
    };

    const changerStatut = async (eventId, statut) => {
        try {
            await api.put(`/evenements/${eventId}`, { stat_event: statut });
            setMesEvents(prev => prev.map(e => e._id === eventId ? { ...e, stat_event: statut } : e));
            notif('success', `Événement : ${statut}`);
        } catch {
            notif('error', 'Erreur changement statut');
        }
    };

    const marquerPresent = async (participationId) => {
        try {
            await api.post(`/participations/marquer-present/${participationId}`);
            notif('success', 'Présence confirmée');
            chargerParticipants(eventSelectionne._id);
        } catch {
            notif('error', 'Erreur marquage présence');
        }
    };

    const sauvegarderProfil = async (e) => {
        e.preventDefault();
        setSavingProfil(true);
        try {
            const res = await api.put('/utilisateurs/profil', profilForm);
            const updated = res.data.utilisateur;
            const stored = { ...organisateur, ...updated };
            localStorage.setItem('event_user', JSON.stringify(stored));
            setOrganisateur(stored);
            notif('success', 'Profil mis à jour');
        } catch {
            notif('error', 'Erreur mise à jour profil');
        } finally {
            setSavingProfil(false);
        }
    };

    const voirParticipants = (event) => {
        setEventSelectionne(event);
        chargerParticipants(event._id);
        setActiveTab('participants');
    };

    const sInscrire = async (eventId) => {
        try {
            await api.post(`/participations/${eventId}/inscription`);
            notif('success', 'Inscription confirmée !');
            chargerMesEvents();
            setActiveTab('mes-inscriptions');
        } catch (err) {
            notif('error', err.response?.data?.message || 'Erreur inscription');
        }
    };

    const annulerInscription = async (eventId) => {
        if (!window.confirm('Annuler votre inscription ?')) return;
        try {
            await api.delete(`/participations/${eventId}/annuler`);
            notif('success', 'Inscription annulée');
            chargerMesEvents();
        } catch (err) {
            notif('error', err.response?.data?.message || 'Erreur annulation');
        }
    };

    // ── Soumettre un token QR pour valider une présence ──
    const soumettreScan = async (e) => {
        e.preventDefault();
        const token = scanToken.trim();
        if (!token) return;

        setScanEnCours(true);
        setScanResultat(null);
        setScanErreur('');

        try {
            const res = await api.post('/participations/valider-presence', { qr_token: token });
            setScanResultat(res.data.participant); // objet avec prenom, points, niveau…
            setScanToken('');                       // vider le champ pour le prochain scan
        } catch (err) {
            // Le backend renvoie un message d'erreur précis (fenêtre horaire, déjà utilisé…)
            setScanErreur(err.response?.data?.message || 'Erreur lors de la validation');
        } finally {
            setScanEnCours(false);
        }
    };

    // ── Envoyer un message d'encouragement aux absents ──
    const envoyerAbsents = async (eventId) => {
        setEnvoisAbsents(prev => ({ ...prev, [eventId]: 'sending' }));
        try {
            const res = await api.post(`/participations/message-absents/${eventId}`);
            notif('success', res.data.message);
            setEnvoisAbsents(prev => ({ ...prev, [eventId]: 'done' }));
        } catch (err) {
            notif('error', err.response?.data?.message || 'Erreur envoi messages');
            setEnvoisAbsents(prev => ({ ...prev, [eventId]: 'error' }));
        }
    };

    // ── Calculer si le scan est autorisé en ce moment ───
    // Retourne : 'avant' | 'pendant' | 'apres' | 'autre_jour'
    const statutFenetreHoraire = (ev) => {
        if (!ev?.ev_start_time) return 'autre_jour';
        const maintenant = new Date();
        const debut      = new Date(ev.ev_start_time);
        const fin        = ev.ev_end_time ? new Date(ev.ev_end_time) : null;

        // Même jour calendaire ?
        const memeJour =
            maintenant.getFullYear() === debut.getFullYear() &&
            maintenant.getMonth()    === debut.getMonth()    &&
            maintenant.getDate()     === debut.getDate();

        if (!memeJour)            return maintenant < debut ? 'avant' : 'apres';
        if (maintenant < debut)   return 'avant';
        if (fin && maintenant > fin) return 'apres';
        return 'pendant'; // ✅ fenêtre ouverte
    };

    const getStatutColor = (s) => ({
        'publié': '#00e676', 'brouillon': '#ff6b00', 'annulé': '#ff4d6d', 'terminé': '#888'
    }[s] || '#888');

    const totalInscrits = mesEvents.reduce((s, e) => s + (e.nb_inscrits || 0), 0);

    // ── Variables du scanner (calculées ici pour éviter un IIFE dans le JSX) ──
    const evScan      = mesEvents.find(e => e._id === qrEventId) || null;
    const fenetre     = evScan ? statutFenetreHoraire(evScan) : null;
    const fenetreInfo = fenetre ? ({
        pendant:    { color: '#00e676', bg: 'rgba(0,230,118,.12)',    label: '🟢 Scan autorisé — événement en cours' },
        avant:      { color: '#ff6b00', bg: 'rgba(255,107,0,.10)',    label: '🟡 Événement pas encore commencé' },
        apres:      { color: '#8888aa', bg: 'rgba(136,136,170,.10)', label: '⬜ Événement terminé' },
        autre_jour: { color: '#ff4d6d', bg: 'rgba(255,77,109,.10)',  label: "🔴 Le scan n'est autorisé que le jour de l'événement" },
    }[fenetre] || null) : null;
    const estTermine  = fenetre === 'apres';

    if (loading) {
        return (
            <div className="dash-loading">
                <div className="dash-spinner"></div>
                <p>Chargement de votre espace organisateur...</p>
            </div>
        );
    }

    return (
        <div className={`dashboard-page orga-page ${isRTL ? 'rtl' : ''}`}>

            {showMonEspace && (
                <MonEspaceModal
                    utilisateur={organisateur}
                    onClose={() => setShowMonEspace(false)}
                    onUpdate={(u) => setOrganisateur(u)}
                />
            )}

            {notification && (
                <div className={`dash-notif dash-notif--${notification.type}`}>
                    {notification.type === 'success' ? '✓' : '⚠'} {notification.msg}
                </div>
            )}

            <header className="dash-header orga-header">
                <div className="dash-header__left">
                    <Link to="/" className="dash-logo">EVENT</Link>
                    <span className="dash-breadcrumb">/ Organisateur</span>
                    <span className="orga-badge">ORGANISATEUR</span>
                </div>
                <div className="dash-header__right">
                    {organisateur?.role === 'admin' && (
                        <Link to="/admin" className="dash-btn-ghost">Panneau Admin</Link>
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
                    <span className="dash-username">{organisateur?.first_name}</span>
                    <button className="dash-btn-logout" onClick={() => { localStorage.clear(); navigate('/login'); }}>
                        Déconnexion
                    </button>
                </div>
            </header>

            <main className="dash-main">

                <div className="dash-stats-grid" style={{ marginBottom: '1.5rem' }}>
                    <StatCard label="Mes événements" value={mesEvents.length} icon="🏟" color="#00d4ff" />
                    <StatCard label="Total inscrits" value={totalInscrits} icon="👥" color="#00e676" />
                    <StatCard label="Points" value={organisateur?.cumul_points || 0} icon="⭐" color="#ff6b00" />
                    <StatCard label="Fiabilité" value={`${organisateur?.reliabilite_score ?? 100}%`} icon="📊" color="#ffd700" />
                </div>

                <div className="dash-tabs" style={{ marginBottom: '1.5rem' }}>
                    {[
                        { key: 'mes-events',       label: 'Mes événements' },
                        { key: 'scanner',          label: '📷 QR Code' },
                        { key: 'participants',     label: 'Participants' },
                        { key: 'explorer',         label: '🔍 Explorer' },
                        { key: 'mes-inscriptions', label: 'Mes inscriptions', badge: mesInscriptions.length },
                        { key: 'recompenses',      label: '🎫 Récompenses',  badge: mesRecompenses.filter(r => !r.is_redeemed).length },
                        { key: 'profil',           label: 'Mon profil' },
                    ].map(t => (
                        <button
                            key={t.key}
                            className={`dash-tab ${activeTab === t.key ? 'active' : ''}`}
                            onClick={() => setActiveTab(t.key)}
                        >
                            {t.label}
                            {t.badge > 0 && (
                                <span className="dash-tab-badge">{t.badge}</span>
                            )}
                        </button>
                    ))}
                </div>

                {/* ── MES ÉVÉNEMENTS ── */}
                {activeTab === 'mes-events' && (
                    <div>
                        <div className="admin-section-header" style={{ marginBottom: '1rem' }}>
                            <h2 className="dash-section-title">Mes événements</h2>
                            <button className="dash-btn-primary" onClick={() => setShowFormEvent(!showFormEvent)}>
                                {showFormEvent ? '✕ Fermer' : '+ Créer un événement'}
                            </button>
                        </div>

                        {showFormEvent && (
                            <div className="orga-form-card">
                                <h3 className="orga-form-title">Nouvel événement</h3>
                                <form onSubmit={creerEvent} className="admin-form">
                                    <div className="form-group">
                                        <label>Titre de l'événement *</label>
                                        <input type="text" value={formEvent.title_event}
                                            onChange={e => setFormEvent({ ...formEvent, title_event: e.target.value })}
                                            placeholder="Ex: Tournoi de football — Ariana" required />
                                    </div>
                                    <div className="form-group">
                                        <label>Description</label>
                                        <textarea rows={3} value={formEvent.event_description}
                                            onChange={e => setFormEvent({ ...formEvent, event_description: e.target.value })}
                                            placeholder="Décrivez l'événement..." />
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Début *</label>
                                            <input type="datetime-local" value={formEvent.ev_start_time}
                                                onChange={e => {
                                                    const start = e.target.value;
                                                    let autoFin = '';
                                                    if (start) {
                                                        const d = new Date(start);
                                                        d.setHours(d.getHours() + 1);
                                                        const p = n => String(n).padStart(2, '0');
                                                        autoFin = `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
                                                    }
                                                    setFormEvent({ ...formEvent, ev_start_time: start, ev_end_time: autoFin });
                                                }} required />
                                        </div>
                                        <div className="form-group">
                                            <label>Fin <span style={{ fontSize: 10, color: '#666' }}>(auto +1h, modifiable)</span></label>
                                            <input type="datetime-local" value={formEvent.ev_end_time}
                                                onChange={e => setFormEvent({ ...formEvent, ev_end_time: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>Participants max</label>
                                        <input type="number" min="1" value={formEvent.max_participants}
                                            onChange={e => setFormEvent({ ...formEvent, max_participants: +e.target.value })} />
                                    </div>
                                    <div style={{ display: 'flex', gap: '12px', marginTop: '1rem' }}>
                                        <button type="submit" className="dash-btn-primary" disabled={savingEvent}>
                                            {savingEvent ? 'Création...' : 'Créer et publier'}
                                        </button>
                                        <button type="button" className="dash-btn-ghost" onClick={() => setShowFormEvent(false)}>Annuler</button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {mesEvents.length === 0 ? (
                            <div className="dash-empty">
                                <p className="dash-empty__icon">🏟</p>
                                <p className="dash-empty__text">Aucun événement créé. Commencez par en créer un !</p>
                            </div>
                        ) : (
                            <div className="orga-events-list">
                                {mesEvents.map(ev => (
                                    <div key={ev._id} className="orga-event-row">
                                        <div className="orga-event-row__info">
                                            <div className="orga-event-row__title">{ev.title_event}</div>
                                            <div className="orga-event-row__meta">
                                                <span>{new Date(ev.ev_start_time).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                                <span>·</span>
                                                <span>{ev.lieu || 'Lieu non défini'}</span>
                                                <span>·</span>
                                                <span>{ev.nb_inscrits || 0}/{ev.max_participants} inscrits</span>
                                            </div>
                                        </div>
                                        <div className="orga-event-row__right">
                                            <span className="orga-statut-pill"
                                                style={{ background: getStatutColor(ev.stat_event) + '22', color: getStatutColor(ev.stat_event) }}>
                                                {ev.stat_event}
                                            </span>
                                            <div className="orga-event-actions">
                                                <button className="admin-btn-sm admin-btn-ghost" onClick={() => voirParticipants(ev)}>
                                                    Participants
                                                </button>
                                                {ev.stat_event === 'publié' && (
                                                    <button className="admin-btn-sm"
                                                        style={{ background: '#00d4ff22', color: '#00d4ff', border: '1px solid #00d4ff44' }}
                                                        onClick={() => { setQrEventId(ev._id); setActiveTab('scanner'); }}>
                                                        QR
                                                    </button>
                                                )}
                                                {ev.stat_event === 'brouillon' && (
                                                    <button className="admin-btn-sm admin-btn-success" onClick={() => changerStatut(ev._id, 'publié')}>
                                                        Publier
                                                    </button>
                                                )}
                                                {ev.stat_event === 'publié' && (
                                                    <button className="admin-btn-sm"
                                                        style={{ background: '#ff4d6d22', color: '#ff4d6d', border: '1px solid #ff4d6d44' }}
                                                        onClick={() => changerStatut(ev._id, 'annulé')}>
                                                        Annuler
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ── SCANNER DE PRÉSENCE ── */}
                {activeTab === 'scanner' && (
                        <div className="orga-scanner-section">
                            <h2 className="dash-section-title">Validation des présences</h2>
                            <p className="dash-section-desc">
                                Scannez ou saisissez le token QR personnel de chaque participant pour confirmer sa présence.
                                Le scan n'est accepté que le jour exact de l'événement, entre l'heure de début et de fin.
                            </p>

                            {/* ── Sélecteur d'événement ── */}
                            <div className="orga-scanner-card">
                                <div className="form-group" style={{ marginBottom: fenetreInfo ? '1rem' : '1.5rem' }}>
                                    <label style={{ fontSize: 13, color: '#8888aa', marginBottom: 6, display: 'block' }}>
                                        Événement à scanner :
                                    </label>
                                    <select
                                        value={qrEventId}
                                        onChange={e => {
                                            setQrEventId(e.target.value);
                                            // Réinitialiser le résultat précédent quand on change d'événement
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
                                        {mesEvents.filter(e => e.stat_event === 'publié').map(e => (
                                            <option key={e._id} value={e._id}>{e.title_event}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* ── Indicateur fenêtre horaire ── */}
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

                                {/* ── Formulaire de saisie du token ── */}
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
                                                    onChange={e => {
                                                        setScanToken(e.target.value);
                                                        // Effacer l'erreur précédente dès que l'utilisateur retape
                                                        setScanErreur('');
                                                        setScanResultat(null);
                                                    }}
                                                    placeholder="Collez ou scannez le token du participant…"
                                                    style={{
                                                        flex: 1, background: '#0a0a1a', color: '#e8e8f0',
                                                        border: '1px solid #2a2a4a', borderRadius: 8,
                                                        padding: '10px 14px', fontFamily: 'monospace',
                                                        fontSize: 13,
                                                    }}
                                                    autoFocus
                                                />
                                                <button
                                                    type="submit"
                                                    className="dash-btn-primary"
                                                    disabled={scanEnCours || !scanToken.trim()}
                                                    style={{ whiteSpace: 'nowrap' }}
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

                                {/* ── Résultat du scan — succès ── */}
                                {scanResultat && (
                                    <div style={{
                                        marginTop: '1rem', padding: '16px 18px',
                                        background: 'rgba(0,230,118,.08)',
                                        border: '1px solid rgba(0,230,118,.3)',
                                        borderRadius: 12,
                                    }}>
                                        {/* En-tête : nom du participant */}
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

                                        {/* Stats gagnées */}
                                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                            <div style={{
                                                flex: 1, minWidth: 90, background: '#0a0a1a',
                                                borderRadius: 8, padding: '10px 12px', textAlign: 'center',
                                            }}>
                                                <div style={{ fontSize: 20, fontWeight: 700, color: '#00d4ff' }}>
                                                    +{scanResultat.points_gagnes}
                                                </div>
                                                <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>points gagnés</div>
                                            </div>
                                            <div style={{
                                                flex: 1, minWidth: 90, background: '#0a0a1a',
                                                borderRadius: 8, padding: '10px 12px', textAlign: 'center',
                                            }}>
                                                <div style={{ fontSize: 20, fontWeight: 700, color: '#ffd700' }}>
                                                    {scanResultat.cumul_points}
                                                </div>
                                                <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>total points</div>
                                            </div>
                                            <div style={{
                                                flex: 1, minWidth: 90, background: '#0a0a1a',
                                                borderRadius: 8, padding: '10px 12px', textAlign: 'center',
                                            }}>
                                                <div style={{ fontSize: 14, fontWeight: 700, color: '#a78bfa' }}>
                                                    {scanResultat.niveau_apres}
                                                </div>
                                                <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>niveau</div>
                                            </div>
                                        </div>

                                        {/* Passage de niveau */}
                                        {scanResultat.passage_niveau && (
                                            <div style={{
                                                marginTop: 10, padding: '8px 12px',
                                                background: 'rgba(167,139,250,.15)',
                                                border: '1px solid rgba(167,139,250,.3)',
                                                borderRadius: 8, fontSize: 13,
                                                color: '#a78bfa', fontWeight: 600, textAlign: 'center',
                                            }}>
                                                🏆 Passage de niveau : {scanResultat.niveau_avant} → {scanResultat.niveau_apres}
                                            </div>
                                        )}

                                        {/* Coupon débloqué */}
                                        {scanResultat.coupon_declenche && (
                                            <div style={{
                                                marginTop: 8, padding: '8px 12px',
                                                background: 'rgba(255,107,0,.12)',
                                                border: '1px solid rgba(255,107,0,.3)',
                                                borderRadius: 8, fontSize: 13,
                                                color: '#ff6b00', fontWeight: 600, textAlign: 'center',
                                            }}>
                                                🎫 Un coupon de réduction a été débloqué pour ce participant !
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ── Résultat du scan — erreur ── */}
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

                                {/* ── Aucun événement sélectionné ── */}
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

                            {/* ── Message aux absents (visible seulement après la fin) ── */}
                            {evScan && estTermine && (
                                <div style={{
                                    marginTop: '1.5rem', padding: '16px 18px',
                                    background: 'rgba(0,212,255,.06)',
                                    border: '1px solid rgba(0,212,255,.2)',
                                    borderRadius: 12,
                                    display: 'flex', justifyContent: 'space-between',
                                    alignItems: 'center', gap: 14, flexWrap: 'wrap',
                                }}>
                                    <div>
                                        <div style={{ fontWeight: 600, color: '#e8e8f0', fontSize: 14 }}>
                                            💙 Envoyer un message aux absents
                                        </div>
                                        <div style={{ fontSize: 12, color: '#8888aa', marginTop: 4 }}>
                                            Un message chaleureux et encourageant sera envoyé à chaque participant absent.
                                        </div>
                                    </div>
                                    <button
                                        className="dash-btn-primary"
                                        disabled={envoisAbsents[qrEventId] === 'sending' || envoisAbsents[qrEventId] === 'done'}
                                        onClick={() => envoyerAbsents(qrEventId)}
                                        style={{
                                            // Griser le bouton si déjà envoyé
                                            opacity: envoisAbsents[qrEventId] === 'done' ? 0.6 : 1,
                                        }}
                                    >
                                        {envoisAbsents[qrEventId] === 'sending' && '⏳ Envoi…'}
                                        {envoisAbsents[qrEventId] === 'done'    && '✓ Envoyé'}
                                        {!envoisAbsents[qrEventId]             && '📩 Envoyer'}
                                    </button>
                                </div>
                            )}
                        </div>
                )}

                {/* ── PARTICIPANTS ── */}
                {activeTab === 'participants' && (
                    <div>
                        {!eventSelectionne ? (
                            <div className="dash-empty">
                                <p className="dash-empty__text">Sélectionnez un événement pour voir ses participants.</p>
                                <button className="dash-btn-primary" onClick={() => setActiveTab('mes-events')}>
                                    Voir mes événements →
                                </button>
                            </div>
                        ) : (
                            <div>
                                <div className="admin-section-header">
                                    <div>
                                        <h2 className="dash-section-title">{eventSelectionne.title_event}</h2>
                                        <p className="dash-section-desc">
                                            {participants.filter(p => p.is_present).length} / {participants.length} présents
                                        </p>
                                    </div>
                                    <button className="dash-btn-ghost" onClick={() => { setEventSelectionne(null); setActiveTab('mes-events'); }}>
                                        ← Retour
                                    </button>
                                </div>

                                <div className="dash-progress-bar" style={{ marginBottom: '1.5rem' }}>
                                    <div className="dash-progress-fill" style={{
                                        width: `${(participants.filter(p => p.is_present).length / Math.max(participants.length, 1)) * 100}%`,
                                        background: '#00e676'
                                    }} />
                                </div>

                                <div className="admin-card">
                                    <table className="admin-table">
                                        <thead>
                                            <tr>
                                                <th>Participant</th>
                                                <th>Email</th>
                                                <th>Présent</th>
                                                <th>Scanné le</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {participants.length === 0 ? (
                                                <tr><td colSpan="5" style={{ textAlign: 'center', color: '#8888aa', padding: '2rem' }}>Aucun inscrit.</td></tr>
                                            ) : participants.map(p => (
                                                <tr key={p._id}>
                                                    <td>
                                                        <div className="admin-user-cell">
                                                            <div className="dash-avatar dash-avatar--sm">
                                                                {p.utilisateur?.first_name?.[0]}{p.utilisateur?.last_name?.[0]}
                                                            </div>
                                                            {p.utilisateur?.first_name} {p.utilisateur?.last_name}
                                                        </div>
                                                    </td>
                                                    <td className="text-muted">{p.utilisateur?.email}</td>
                                                    <td>
                                                        <span className={`badge ${p.is_present ? 'badge-success' : 'badge-gray'}`}>
                                                            {p.is_present ? '✓ Présent' : 'Absent'}
                                                        </span>
                                                    </td>
                                                    <td className="text-muted">
                                                        {p.scanner_date ? new Date(p.scanner_date).toLocaleTimeString('fr-FR') : '—'}
                                                    </td>
                                                    <td>
                                                        {!p.is_present && (
                                                            <button className="admin-btn-sm admin-btn-success"
                                                                onClick={() => marquerPresent(p._id)}>
                                                                Marquer présent
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── EXPLORER ── */}
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

                {/* ── MES INSCRIPTIONS ── */}
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
                                            <button onClick={() => annulerInscription(ins.eventId)}
                                                style={{ fontSize: 12, padding: '5px 10px', background: 'rgba(255,77,109,.1)', color: '#ff4d6d', border: '1px solid rgba(255,77,109,.3)', borderRadius: 6, cursor: 'pointer', fontFamily: 'Poppins,sans-serif' }}>
                                                Annuler
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                )}

                {/* ── RÉCOMPENSES ── */}
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

                {/* ── PROFIL ── */}
                {activeTab === 'profil' && (
                    <div>
                        <h2 className="dash-section-title" style={{ marginBottom: '1.5rem' }}>Mon profil</h2>
                        <div className="orga-form-card" style={{ maxWidth: '520px' }}>
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
                                        <div style={{ fontSize: '22px', fontWeight: 700, color: '#00d4ff' }}>{organisateur?.cumul_points || 0}</div>
                                        <div style={{ fontSize: '11px', color: '#8888aa', marginTop: '4px' }}>Points</div>
                                    </div>
                                    <div style={{ flex: 1, minWidth: '110px', background: '#0a0a1a', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                                        <div style={{ fontSize: '22px', fontWeight: 700, color: '#00e676' }}>{organisateur?.cumul_heures_participation || 0}h</div>
                                        <div style={{ fontSize: '11px', color: '#8888aa', marginTop: '4px' }}>Heures</div>
                                    </div>
                                    <div style={{ flex: 1, minWidth: '110px', background: '#0a0a1a', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                                        <div style={{ fontSize: '22px', fontWeight: 700, color: '#ffd700' }}>{organisateur?.reliabilite_score ?? 100}%</div>
                                        <div style={{ fontSize: '11px', color: '#8888aa', marginTop: '4px' }}>Fiabilité</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </main>
            {qrModal && <QRModal token={qrModal.token} titre={qrModal.titre} qr_utilise={qrModal.qr_utilise} onClose={() => setQrModal(null)} />}
        </div>
    );
};

export default DashboardOrganisateur;
