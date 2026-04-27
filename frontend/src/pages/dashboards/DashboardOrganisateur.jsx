import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../api';
import StatCard from '../../components/dashboard/StatCard';
import MonEspaceModal from '../../components/dashboard/MonEspaceModal';
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
            const res = await api.get('/evenements/mes-evenements');
            setMesEvents(res.data.evenements || []);
        } catch {
            notif('error', 'Erreur chargement événements');
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

    const getStatutColor = (s) => ({
        'publié': '#00e676', 'brouillon': '#ff6b00', 'annulé': '#ff4d6d', 'terminé': '#888'
    }[s] || '#888');

    const totalInscrits = mesEvents.reduce((s, e) => s + (e.nb_inscrits || 0), 0);
    const eventQR = mesEvents.find(e => e._id === qrEventId);

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
                        { key: 'mes-events', label: 'Mes événements' },
                        { key: 'scanner', label: '📷 QR Code' },
                        { key: 'participants', label: 'Participants' },
                        { key: 'profil', label: 'Mon profil' },
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
                                                onChange={e => setFormEvent({ ...formEvent, ev_start_time: e.target.value })} required />
                                        </div>
                                        <div className="form-group">
                                            <label>Fin</label>
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

                {/* ── QR CODE ── */}
                {activeTab === 'scanner' && (
                    <div className="orga-scanner-section">
                        <h2 className="dash-section-title">QR Code de présence</h2>
                        <p className="dash-section-desc">
                            Partagez ce token avec les participants pour qu'ils confirment leur présence.
                        </p>

                        <div className="orga-scanner-card">
                            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                <label className="dash-section-desc" style={{ marginBottom: '8px', display: 'block' }}>
                                    Sélectionner un événement :
                                </label>
                                <select
                                    value={qrEventId}
                                    onChange={e => setQrEventId(e.target.value)}
                                    style={{ background: '#1a1a35', color: '#e8e8f0', padding: '8px 12px', borderRadius: '8px', border: '1px solid #2a2a4a', width: '100%', cursor: 'pointer', fontFamily: 'Poppins,sans-serif' }}>
                                    <option value="">— Choisir un événement publié —</option>
                                    {mesEvents.filter(e => e.stat_event === 'publié').map(e => (
                                        <option key={e._id} value={e._id}>{e.title_event}</option>
                                    ))}
                                </select>
                            </div>

                            {eventQR ? (
                                eventQR.qr_code_token ? (
                                    <div style={{ textAlign: 'center' }}>
                                        <p style={{ color: '#8888aa', fontSize: '13px', marginBottom: '12px' }}>
                                            Token QR pour <strong style={{ color: '#e8e8f0' }}>{eventQR.title_event}</strong> :
                                        </p>
                                        <div style={{
                                            background: '#0a0a1a', border: '1px solid #2a2a4a', borderRadius: '12px',
                                            padding: '16px', fontFamily: 'monospace', fontSize: '12px',
                                            color: '#00d4ff', wordBreak: 'break-all', lineHeight: '1.6', textAlign: 'left',
                                        }}>
                                            {eventQR.qr_code_token}
                                        </div>
                                        <p style={{ color: '#8888aa', fontSize: '11px', marginTop: '8px' }}>
                                            Les participants copient ce token dans leur tableau de bord → Mes inscriptions → Scanner
                                        </p>
                                    </div>
                                ) : (
                                    <p style={{ color: '#ff6b00', textAlign: 'center', padding: '1rem' }}>
                                        Cet événement n'a pas de token QR. Publiez-le d'abord.
                                    </p>
                                )
                            ) : (
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
        </div>
    );
};

export default DashboardOrganisateur;
