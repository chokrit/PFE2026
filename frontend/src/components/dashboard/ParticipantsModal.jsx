import { useState, useEffect } from 'react';
import api from '../../api';

const NIVEAU_COLORS = {
  Champion: '#f59e0b',
  Avancé:   '#10b981',
  Actif:    '#3b82f6',
  Débutant: '#9ca3af',
};

function Avatar({ user }) {
  const colors = ['#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444'];
  const color = colors[(user.first_name?.charCodeAt(0) || 0) % colors.length];
  if (user.thumbnail_url || user.file_url) {
    return (
      <img
        src={user.thumbnail_url || user.file_url}
        alt=""
        style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
      />
    );
  }
  return (
    <div style={{
      width: 48, height: 48, borderRadius: '50%', background: color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 700, fontSize: 16, flexShrink: 0,
    }}>
      {user.first_name?.[0]}{user.last_name?.[0]}
    </div>
  );
}

export default function ParticipantsModal({ evenementId, onClose }) {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recherche, setRecherche] = useState('');
  const [pending, setPending] = useState({});

  useEffect(() => {
    api.get(`/connexions/participants/${evenementId}`)
      .then(r => setParticipants(r.data.participants || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [evenementId]);

  const toggleLike = async (p) => {
    setPending(prev => ({ ...prev, [p._id]: true }));
    try {
      const r = await api.post('/connexions/like', { evenement_id: evenementId, receveur_id: p._id });
      const action = r.data.action;
      setParticipants(prev => prev.map(x =>
        x._id === p._id
          ? { ...x, connexion_statut: action === 'like' ? 'like' : null, connexion_id: action === 'like' ? x.connexion_id : null }
          : x
      ));
    } catch {}
    setPending(prev => ({ ...prev, [p._id]: false }));
  };

  const demanderPartenaire = async (p) => {
    setPending(prev => ({ ...prev, [`p_${p._id}`]: true }));
    try {
      const r = await api.post('/connexions/partenaire', { evenement_id: evenementId, receveur_id: p._id });
      if (r.data.success) {
        setParticipants(prev => prev.map(x =>
          x._id === p._id ? { ...x, connexion_statut: 'partenaire_en_attente', connexion_id: r.data.connexion._id } : x
        ));
      }
    } catch {}
    setPending(prev => ({ ...prev, [`p_${p._id}`]: false }));
  };

  const filtered = participants.filter(p => {
    const q = recherche.toLowerCase();
    return !q || `${p.first_name} ${p.last_name}`.toLowerCase().includes(q);
  });

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#1e1e2e', borderRadius: 16, width: '100%', maxWidth: 560,
          maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #333', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#fff', flex: 1 }}>👥 Participants</span>
          <input
            value={recherche}
            onChange={e => setRecherche(e.target.value)}
            placeholder="Rechercher..."
            style={{
              background: '#2a2a3e', border: '1px solid #444', borderRadius: 8,
              color: '#fff', padding: '6px 12px', fontSize: 13, width: 160,
            }}
          />
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', fontSize: 22, cursor: 'pointer' }}>×</button>
        </div>

        {/* List */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {loading && <p style={{ color: '#888', textAlign: 'center' }}>Chargement...</p>}
          {!loading && filtered.length === 0 && (
            <p style={{ color: '#666', textAlign: 'center', marginTop: 32 }}>Aucun participant</p>
          )}
          {filtered.map(p => (
            <div key={p._id} style={{
              background: '#2a2a3e', borderRadius: 10, padding: '12px 14px',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <Avatar user={p} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>
                    {p.first_name} {p.last_name}
                  </span>
                  <span style={{
                    fontSize: 11, padding: '2px 7px', borderRadius: 99,
                    background: NIVEAU_COLORS[p.niveau] + '22',
                    color: NIVEAU_COLORS[p.niveau], fontWeight: 600,
                  }}>{p.niveau}</span>
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                  {p.sports_preferes?.slice(0, 3).map(s => (
                    <span key={s._id} style={{
                      fontSize: 10, background: '#3b3b55', color: '#aaa',
                      borderRadius: 99, padding: '1px 6px',
                    }}>{s.event_type}</span>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: '#666', marginTop: 3 }}>
                  ⭐ {p.cumul_points} pts · 🎯 {p.reliabilite_score}% · 🤝 {p.score_social} social
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {/* Like button */}
                <button
                  onClick={() => toggleLike(p)}
                  disabled={!!pending[p._id]}
                  title={p.connexion_statut === 'like' ? 'Retirer le like' : 'Aimer'}
                  style={{
                    background: p.connexion_statut === 'like' ? '#ef444433' : '#2a2a4e',
                    border: `1px solid ${p.connexion_statut === 'like' ? '#ef4444' : '#444'}`,
                    color: p.connexion_statut === 'like' ? '#ef4444' : '#888',
                    borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 14,
                  }}
                >❤️</button>

                {/* Partenaire button */}
                {p.connexion_statut === 'partenaire_accepte' ? (
                  <span style={{ fontSize: 11, color: '#10b981', padding: '6px 8px' }}>✅ Partenaires</span>
                ) : p.connexion_statut === 'partenaire_en_attente' ? (
                  <span style={{ fontSize: 11, color: '#f59e0b', padding: '6px 8px' }}>⏳ En attente</span>
                ) : p.connexion_statut === 'partenaire_refuse' ? (
                  <span style={{ fontSize: 11, color: '#ef4444', padding: '6px 8px' }}>✗ Refusé</span>
                ) : (
                  <button
                    onClick={() => demanderPartenaire(p)}
                    disabled={!!pending[`p_${p._id}`]}
                    title="Demander en partenaire"
                    style={{
                      background: '#2a2a4e', border: '1px solid #444',
                      color: '#a78bfa', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 14,
                    }}
                  >🤝</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
