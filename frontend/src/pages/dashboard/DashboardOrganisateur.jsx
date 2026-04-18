// ============================================================
// DashboardOrganisateur.jsx — Dashboard pour les organisateurs
// Route : /organisateur
// Rôle  : 'admin' (l'organisateur est un admin dans ce système)
//
// Différence avec DashboardAdmin :
//   → Focalisé sur SES événements uniquement
//   → Gestion présences + QR scan
//   → Statistiques de ses propres events
//   → Pas de gestion utilisateurs globale
//
// Sections :
//   1. Mes événements créés
//   2. Scanner de présences QR
//   3. Statistiques de participation
//   4. Gestion des équipements assignés à ses events
// ============================================================

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import StatCard from '../../components/dashboard/StatCard';
import '../../styles/dashboard/dashboard.css';
import '../../styles/dashboard/organisateur.css';

// TODO: import api from '../../api';

const DashboardOrganisateur = () => {
    const navigate = useNavigate();
    const { isRTL } = useLanguage();

    const [organisateur, setOrganisateur] = useState(null);
    const [mesEvents, setMesEvents] = useState([]);
    const [activeTab, setActiveTab] = useState('mes-events');
    const [loading, setLoading] = useState(true);
    const [notification, setNotif] = useState(null);

    const [showFormEvent, setShowFormEvent] = useState(false);
    const [formEvent, setFormEvent] = useState({
        title_event: '', event_description: '', ev_start_time: '',
        ev_end_time: '', max_participants: 30, location_id: '',
    });

    const [qrInput, setQrInput] = useState('');
    const [qrResult, setQrResult] = useState(null);
    const [scanLoading, setScanLoading] = useState(false);

    const [eventSelectionne, setEventSelectionne] = useState(null);
    const [participants, setParticipants] = useState([]);

    useEffect(() => {
        const token = localStorage.getItem('event_token');
        const user = localStorage.getItem('event_user');
        if (!token) { navigate('/login'); return; }
        if (user) {
            const u = JSON.parse(user);
            if (u.role !== 'admin') { navigate('/dashboard'); return; }
            setOrganisateur(u);
        }
        chargerMesEvents();
    }, [navigate]);

    const chargerMesEvents = async () => {
        setLoading(true);
        try {
            // TODO: api.get('/evenements?createur=moi')
            await new Promise(r => setTimeout(r, 500));
            setMesEvents(MOCK_MES_EVENTS);
        } catch (e) {
            notif('error', 'Erreur chargement événements');
        } finally {
            setLoading(false);
        }
    };

    const chargerParticipants = async (eventId) => {
        try {
            // TODO: api.get(`/evenements/${eventId}/participants`)
            await new Promise(r => setTimeout(r, 300));
            setParticipants(MOCK_PARTICIPANTS);
        } catch (e) {
            notif('error', 'Erreur chargement participants');
        }
    };

    const notif = (type, msg) => {
        setNotif({ type, msg });
        setTimeout(() => setNotif(null), 3000);
    };

    const creerEvent = async (e) => {
        e.preventDefault();
        try {
            // TODO: await api.post('/evenements', { ...formEvent, stat_event: 'brouillon' });
            notif('success', 'Événement créé ! Statut : brouillon');
            setShowFormEvent(false);
            setFormEvent({ title_event: '', event_description: '', ev_start_time: '', ev_end_time: '', max_participants: 30, location_id: '' });
            chargerMesEvents();
        } catch (err) {
            notif('error', err.response?.data?.message || 'Erreur création');
        }
    };

    const changerStatut = async (eventId, statut) => {
        try {
            // TODO: await api.put(`/evenements/${eventId}`, { stat_event: statut });
            setMesEvents(prev => prev.map(e => e._id === eventId ? { ...e, stat_event: statut } : e));
            notif('success', `Événement : ${statut}`);
        } catch (err) {
            notif('error', 'Erreur changement statut');
        }
    };

    const scannerQR = async () => {
        if (!qrInput.trim()) return;
        setScanLoading(true);
        setQrResult(null);
        try {
            // TODO: await api.post(`/evenements/qr-scan`, { qr_code_token: qrInput })
            await new Promise(r => setTimeout(r, 800));
            if (qrInput.includes('abc123')) {
                setQrResult({
                    success: true,
                    message: 'Présence confirmée !',
                    participant: { nom: 'Sana Trabelsi', event: 'Match Football Ariana' }
                });
            } else {
                setQrResult({ success: false, message: 'Token QR invalide ou participant non inscrit.' });
            }
        } catch (err) {
            setQrResult({ success: false, message: 'Erreur lors du scan.' });
        } finally {
            setScanLoading(false);
            setQrInput('');
        }
    };

    const voirParticipants = (event) => {
        setEventSelectionne(event);
        chargerParticipants(event._id);
        setActiveTab('participants');
    };

    const getStatutColor = (s) => ({
        'publié': '#00e676', 'brouillon': '#ff6b00', 'annulé': '#ff4d6d', 'terminé': '#888'
    }[s] || '#888');

    const totalPresents = mesEvents.reduce((s, e) => s + (e.nb_presents || 0), 0);
    const totalInscrits = mesEvents.reduce((s, e) => s + (e.nb_inscrits || 0), 0);
    const tauxPresence = totalInscrits > 0 ? Math.round((totalPresents / totalInscrits) * 100) : 0;

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
                    <Link to="/admin" className="dash-btn-ghost">Panneau Admin</Link>
                    <Link to="/dashboard" className="dash-btn-ghost">Mon espace</Link>
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
                    <StatCard label="Présences validées" value={totalPresents} icon="✅" color="#ff6b00" />
                    <StatCard label="Taux de présence" value={`${tauxPresence}%`} icon="📊" color="#ffd700" />
                </div>

                <div className="dash-tabs" style={{ marginBottom: '1.5rem' }}>
                    {[
                        { key: 'mes-events', label: 'Mes événements' },
                        { key: 'scanner', label: '📷 Scanner QR' },
                        { key: 'participants', label: 'Participants' },
                    ].map(t => (
                        <button
                            key={t.key}
                            className={`dash-tab ${activeTab === t.key ? 'active' : ''}`}
                            onClick={() => setActiveTab(t.key)}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* ── ONGLET : MES ÉVÉNEMENTS ── */}
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
                                            placeholder="Décrivez l'événement, les règles, le niveau requis..." />
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Début *</label>
                                            <input type="datetime-local" value={formEvent.ev_start_time}
                                                onChange={e => setFormEvent({ ...formEvent, ev_start_time: e.target.value })} required />
                                        </div>
                                        <div className="form-group">
                                            <label>Fin</label>
                                            <input type="datetime-local" value={formEvent.ev_end_time}
                                                onChange={e => setFormEvent({ ...formEvent, ev_end_time: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Participants max</label>
                                            <input type="number" min="1" value={formEvent.max_participants}
                                                onChange={e => setFormEvent({ ...formEvent, max_participants: +e.target.value })} />
                                        </div>
                                        <div className="form-group">
                                            <label>Lieu</label>
                                            <input type="text" placeholder="Sélectionner un lieu"
                                                value={formEvent.location_id}
                                                onChange={e => setFormEvent({ ...formEvent, location_id: e.target.value })} />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '12px', marginTop: '1rem' }}>
                                        <button type="submit" className="dash-btn-primary">Créer (brouillon)</button>
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
                                                <span>{ev.lieu}</span>
                                                <span>·</span>
                                                <span>{ev.nb_inscrits}/{ev.max_participants} inscrits</span>
                                                {ev.nb_presents > 0 && (
                                                    <><span>·</span><span className="orga-present-count">✓ {ev.nb_presents} présents</span></>
                                                )}
                                            </div>
                                        </div>
                                        <div className="orga-event-row__right">
                                            <span
                                                className="orga-statut-pill"
                                                style={{ background: getStatutColor(ev.stat_event) + '22', color: getStatutColor(ev.stat_event) }}
                                            >
                                                {ev.stat_event}
                                            </span>
                                            <div className="orga-event-actions">
                                                <button className="admin-btn-sm admin-btn-ghost" onClick={() => voirParticipants(ev)}>
                                                    Participants
                                                </button>
                                                {ev.stat_event === 'brouillon' && (
                                                    <button className="admin-btn-sm admin-btn-success" onClick={() => changerStatut(ev._id, 'publié')}>
                                                        Publier
                                                    </button>
                                                )}
                                                {ev.stat_event === 'publié' && (
                                                    <button
                                                        className="admin-btn-sm"
                                                        style={{ background: '#ff4d6d22', color: '#ff4d6d', border: '1px solid #ff4d6d44' }}
                                                        onClick={() => changerStatut(ev._id, 'annulé')}
                                                    >Annuler</button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ── ONGLET : SCANNER QR ── */}
                {activeTab === 'scanner' && (
                    <div className="orga-scanner-section">
                        <h2 className="dash-section-title">Scanner de présence QR</h2>
                        <p className="dash-section-desc">
                            Scannez le QR code d'un participant pour confirmer sa présence.
                        </p>

                        <div className="orga-scanner-card">
                            <div className="orga-qr-zone">
                                <div className="orga-qr-icon">
                                    {/* TODO: Intégrer react-qr-scanner pour scan caméra réel */}
                                    {/* npm install react-qr-scanner */}
                                    <svg viewBox="0 0 100 100" width="80" height="80" fill="none" stroke="currentColor" strokeWidth="3">
                                        <rect x="10" y="10" width="30" height="30" rx="2" />
                                        <rect x="60" y="10" width="30" height="30" rx="2" />
                                        <rect x="10" y="60" width="30" height="30" rx="2" />
                                        <rect x="17" y="17" width="16" height="16" fill="currentColor" opacity="0.3" />
                                        <rect x="67" y="17" width="16" height="16" fill="currentColor" opacity="0.3" />
                                        <rect x="17" y="67" width="16" height="16" fill="currentColor" opacity="0.3" />
                                        <line x1="60" y1="60" x2="90" y2="60" />
                                        <line x1="60" y1="60" x2="60" y2="90" />
                                        <line x1="90" y1="70" x2="90" y2="90" strokeWidth="5" />
                                        <line x1="70" y1="90" x2="90" y2="90" strokeWidth="5" />
                                    </svg>
                                </div>
                                <p className="orga-qr-hint">
                                    Caméra QR à intégrer<br />
                                    <small style={{ opacity: 0.6 }}>npm install react-qr-scanner</small>
                                </p>
                            </div>

                            <div className="orga-manual-scan">
                                <label className="dash-section-desc" style={{ marginBottom: '8px', display: 'block' }}>
                                    Ou saisir le token manuellement :
                                </label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input
                                        type="text"
                                        value={qrInput}
                                        onChange={e => setQrInput(e.target.value)}
                                        placeholder="Ex: abc123def456..."
                                        onKeyDown={e => e.key === 'Enter' && scannerQR()}
                                        style={{ flex: 1 }}
                                    />
                                    <button
                                        className="dash-btn-primary"
                                        onClick={scannerQR}
                                        disabled={scanLoading || !qrInput.trim()}
                                    >
                                        {scanLoading ? 'Scan...' : 'Valider'}
                                    </button>
                                </div>
                                <p style={{ fontSize: '12px', opacity: 0.5, marginTop: '6px' }}>
                                    Test : taper "abc123" pour simuler une présence valide
                                </p>
                            </div>

                            {qrResult && (
                                <div className={`orga-scan-result ${qrResult.success ? 'success' : 'error'}`}>
                                    <div className="orga-scan-result__icon">{qrResult.success ? '✓' : '✕'}</div>
                                    <div>
                                        <div className="orga-scan-result__msg">{qrResult.message}</div>
                                        {qrResult.success && qrResult.participant && (
                                            <div className="orga-scan-result__detail">
                                                {qrResult.participant.nom} — {qrResult.participant.event}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── ONGLET : PARTICIPANTS ── */}
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
                                    <div
                                        className="dash-progress-fill"
                                        style={{
                                            width: `${(participants.filter(p => p.is_present).length / Math.max(participants.length, 1)) * 100}%`,
                                            background: '#00e676'
                                        }}
                                    />
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
                                            {participants.map(p => (
                                                <tr key={p._id}>
                                                    <td>
                                                        <div className="admin-user-cell">
                                                            <div className="dash-avatar dash-avatar--sm">
                                                                {p.first_name?.[0]}{p.last_name?.[0]}
                                                            </div>
                                                            {p.first_name} {p.last_name}
                                                        </div>
                                                    </td>
                                                    <td className="text-muted">{p.email}</td>
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
                                                            <button
                                                                className="admin-btn-sm admin-btn-success"
                                                                onClick={() => notif('success', `${p.first_name} marqué présent`)}
                                                            >
                                                                Marquer présent
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div style={{ marginTop: '1rem', textAlign: 'right' }}>
                                    <button className="dash-btn-ghost" onClick={() => notif('success', 'Export CSV en cours de développement')}>
                                        Exporter CSV ↓
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

            </main>
        </div>
    );
};

// ── Données fictives ──
const MOCK_MES_EVENTS = [
    { _id: 'e1', title_event: 'Match Football Ariana', ev_start_time: '2024-08-15T09:00:00', lieu: 'Complexe Ariana', max_participants: 22, nb_inscrits: 18, nb_presents: 15, stat_event: 'publié' },
    { _id: 'e2', title_event: 'Natation El Menzah', ev_start_time: '2024-08-20T07:00:00', lieu: 'Piscine El Menzah', max_participants: 30, nb_inscrits: 30, nb_presents: 28, stat_event: 'terminé' },
    DashboardOrganisateur];

const MOCK_PARTICIPANTS = [
    { _id: 'p1', first_name: 'Sana', last_name: 'Trabelsi', email: 'sana@email.com', is_present: true, scanner_date: '2024-08-15T09:05:00' },
    { _id: 'p2', first_name: 'Mohamed', last_name: 'Chaabane', email: 'med@email.com', is_present: false, scanner_date: null },
    { _id: 'p3', first_name: 'Rania', last_name: 'Mansour', email: 'rania@email.com', is_present: true, scanner_date: '2024-08-15T09:12:00' },
    { _id: 'p4', first_name: 'Karim', last_name: 'Bouzid', email: 'karim@email.com', is_present: false, scanner_date: null },
];

export default DashboardOrganisateur;