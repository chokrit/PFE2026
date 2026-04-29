import { useState, useEffect, useRef } from 'react';
import api from '../../api';

export default function NotificationBell() {
    const [notifs, setNotifs]     = useState([]);
    const [nonLues, setNonLues]   = useState(0);
    const [ouvert, setOuvert]     = useState(false);
    const [loading, setLoading]   = useState(false);
    const ref = useRef(null);

    const charger = async () => {
        try {
            const r = await api.get('/notifications');
            setNotifs(r.data.notifications || []);
            setNonLues(r.data.nonLues || 0);
        } catch {}
    };

    useEffect(() => {
        charger();
        const id = setInterval(charger, 2 * 60 * 1000); // rafraîchit toutes les 2 min
        return () => clearInterval(id);
    }, []);

    // Fermer le dropdown en cliquant ailleurs
    useEffect(() => {
        const handle = (e) => { if (ref.current && !ref.current.contains(e.target)) setOuvert(false); };
        document.addEventListener('mousedown', handle);
        return () => document.removeEventListener('mousedown', handle);
    }, []);

    const marquerLue = async (id) => {
        await api.put(`/notifications/${id}/lu`).catch(() => {});
        setNotifs(p => p.map(n => n._id === id ? { ...n, lu: true } : n));
        setNonLues(p => Math.max(0, p - 1));
    };

    const toutLire = async () => {
        setLoading(true);
        await api.put('/notifications/tout-lire').catch(() => {});
        setNotifs(p => p.map(n => ({ ...n, lu: true })));
        setNonLues(0);
        setLoading(false);
    };

    const supprimer = async (id, e) => {
        e.stopPropagation();
        await api.delete(`/notifications/${id}`).catch(() => {});
        setNotifs(p => p.filter(n => n._id !== id));
        setNonLues(p => notifs.find(n => n._id === id && !n.lu) ? Math.max(0, p - 1) : p);
    };

    const iconeType = (type) => ({
        rappel_event: '⏰',
        inscription:  '✅',
        validation:   '✓',
        systeme:      '🔔',
    }[type] || '🔔');

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            {/* Bouton cloche */}
            <button
                onClick={() => setOuvert(o => !o)}
                style={{
                    position: 'relative',
                    background: ouvert ? 'rgba(0,212,255,.15)' : 'transparent',
                    border: '1px solid',
                    borderColor: ouvert ? '#00d4ff' : '#2a2a4a',
                    borderRadius: '8px',
                    color: '#e8e8f0',
                    cursor: 'pointer',
                    fontSize: '18px',
                    padding: '6px 10px',
                    lineHeight: 1,
                    transition: 'all .2s',
                }}
                title="Notifications"
            >
                🔔
                {nonLues > 0 && (
                    <span style={{
                        position: 'absolute', top: -6, right: -6,
                        background: '#ff4d6d', color: '#fff',
                        borderRadius: '999px', fontSize: '10px', fontWeight: 700,
                        minWidth: 18, height: 18, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', padding: '0 4px',
                    }}>
                        {nonLues > 9 ? '9+' : nonLues}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {ouvert && (
                <div style={{
                    position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                    width: 340, maxHeight: 420,
                    background: '#1e1e2e', border: '1px solid #2a2a4a',
                    borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,.5)',
                    zIndex: 9999, display: 'flex', flexDirection: 'column',
                    overflow: 'hidden',
                }}>
                    {/* En-tête */}
                    <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '12px 14px', borderBottom: '1px solid #2a2a4a',
                    }}>
                        <span style={{ fontWeight: 700, color: '#e8e8f0', fontSize: 14 }}>
                            Notifications {nonLues > 0 && <span style={{ color: '#00d4ff' }}>({nonLues})</span>}
                        </span>
                        {nonLues > 0 && (
                            <button onClick={toutLire} disabled={loading} style={{
                                fontSize: 11, color: '#00d4ff', background: 'none',
                                border: 'none', cursor: 'pointer', padding: 0,
                            }}>
                                Tout lire
                            </button>
                        )}
                    </div>

                    {/* Liste */}
                    <div style={{ overflowY: 'auto', flex: 1 }}>
                        {notifs.length === 0 ? (
                            <p style={{ textAlign: 'center', color: '#555', fontSize: 13, padding: '2rem 1rem' }}>
                                Aucune notification
                            </p>
                        ) : (
                            notifs.map(n => (
                                <div
                                    key={n._id}
                                    onClick={() => !n.lu && marquerLue(n._id)}
                                    style={{
                                        padding: '10px 14px',
                                        borderBottom: '1px solid #1a1a35',
                                        cursor: n.lu ? 'default' : 'pointer',
                                        background: n.lu ? 'transparent' : 'rgba(0,212,255,.04)',
                                        display: 'flex', gap: 10, alignItems: 'flex-start',
                                        transition: 'background .15s',
                                    }}
                                >
                                    <span style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>
                                        {iconeType(n.type)}
                                    </span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{
                                            fontSize: 12, fontWeight: n.lu ? 400 : 700,
                                            color: n.lu ? '#aaa' : '#e8e8f0',
                                            marginBottom: 2,
                                        }}>
                                            {n.titre}
                                        </div>
                                        <div style={{ fontSize: 11, color: '#666', lineHeight: 1.4 }}>
                                            {n.message}
                                        </div>
                                        <div style={{ fontSize: 10, color: '#444', marginTop: 4 }}>
                                            {new Date(n.created_at).toLocaleDateString('fr-FR', {
                                                day: '2-digit', month: 'short',
                                                hour: '2-digit', minute: '2-digit',
                                            })}
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => supprimer(n._id, e)}
                                        style={{
                                            background: 'none', border: 'none', color: '#444',
                                            cursor: 'pointer', fontSize: 16, flexShrink: 0,
                                            lineHeight: 1, padding: 0,
                                        }}
                                        title="Supprimer"
                                    >×</button>
                                    {!n.lu && (
                                        <div style={{
                                            width: 7, height: 7, borderRadius: '50%',
                                            background: '#00d4ff', flexShrink: 0, marginTop: 6,
                                        }} />
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
