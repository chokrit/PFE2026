import { useState, useEffect, useCallback } from 'react';
import api from '../../api';
import PhotoLightbox from '../PhotoLightbox';
import { fmtDate } from '../../utils/dates';

const VIDEO_FORMATS = ['mp4', 'mov', 'avi', 'webm', 'mkv'];
const estVideo = (media) => VIDEO_FORMATS.includes((media?.format || '').toLowerCase());

export default function GalerieModal({ onClose, isAdmin = false }) {
  const [photos, setPhotos]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur]   = useState(null);
  const [lightbox, setLightbox] = useState(null); // { photos, idx }
  const [deleting, setDeleting] = useState({});

  const charger = useCallback(async () => {
    setLoading(true);
    setErreur(null);
    try {
      const { data } = await api.get('/medias/galerie');
      setPhotos(data.photos || []);
    } catch {
      setErreur('Impossible de charger la galerie.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { charger(); }, [charger]);

  // Fermer avec Escape
  useEffect(() => {
    const handle = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [onClose]);

  const supprimer = async (mediaId) => {
    if (!window.confirm('Supprimer définitivement cette photo ?')) return;
    setDeleting(d => ({ ...d, [mediaId]: true }));
    try {
      await api.delete(`/medias/${mediaId}`);
      setPhotos(prev => prev.filter(p => p._id !== mediaId));
    } catch {
      alert('Erreur lors de la suppression.');
    } finally {
      setDeleting(d => ({ ...d, [mediaId]: false }));
    }
  };

  // ── Grouper par événement, triés par date déc. ──
  const grouped = {};
  for (const p of photos) {
    const key = p.evenement?._id || '__sans__';
    if (!grouped[key]) {
      grouped[key] = {
        titre: p.evenement?.title_event || 'Sans événement',
        date:  p.evenement?.ev_start_time || null,
        photos: [],
      };
    }
    grouped[key].photos.push(p);
  }
  const groupes = Object.values(grouped).sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(b.date) - new Date(a.date);
  });

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.75)',
          zIndex: 8000,
        }}
      />

      {/* Panneau */}
      <div style={{
        position: 'fixed', inset: 0,
        zIndex: 8001,
        overflowY: 'auto',
        padding: '2rem 1rem',
      }}>
        <div
          onClick={e => e.stopPropagation()}
          style={{
            maxWidth: 1100, margin: '0 auto',
            background: '#0d0d1f',
            border: '1px solid #2a2a4a',
            borderRadius: 18,
            overflow: 'hidden',
          }}
        >
          {/* ── Header ── */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '1.25rem 1.5rem',
            background: '#0a0a1a',
            borderBottom: '1px solid #1e1e3a',
          }}>
            <div>
              <h2 style={{ margin: 0, color: '#e8e8f0', fontSize: 20, fontWeight: 700 }}>
                📸 Galerie photos
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#8888aa' }}>
                {photos.length} média{photos.length !== 1 ? 's' : ''} · classés par événement
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid #333',
                color: '#ccc', borderRadius: 8, width: 36, height: 36,
                fontSize: 20, cursor: 'pointer', lineHeight: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >×</button>
          </div>

          {/* ── Corps ── */}
          <div style={{ padding: '1.5rem' }}>
            {loading && (
              <p style={{ textAlign: 'center', color: '#8888aa', padding: '3rem 0' }}>
                Chargement…
              </p>
            )}
            {erreur && (
              <p style={{ textAlign: 'center', color: '#ff4d6d', padding: '3rem 0' }}>
                {erreur}
              </p>
            )}
            {!loading && !erreur && groupes.length === 0 && (
              <p style={{ textAlign: 'center', color: '#8888aa', padding: '3rem 0' }}>
                Aucune photo disponible pour l'instant.
              </p>
            )}

            {groupes.map((groupe, gi) => (
              <div key={gi} style={{ marginBottom: '2.5rem' }}>
                {/* Titre de l'événement */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  marginBottom: 14, paddingBottom: 10,
                  borderBottom: '1px solid #1e1e3a',
                }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#e8e8f0' }}>
                    {groupe.titre}
                  </span>
                  {groupe.date && (
                    <span style={{
                      fontSize: 11, color: '#00d4ff',
                      background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.25)',
                      borderRadius: 99, padding: '1px 8px',
                    }}>
                      {fmtDate(groupe.date)}
                    </span>
                  )}
                  <span style={{ fontSize: 11, color: '#555577', marginLeft: 'auto' }}>
                    {groupe.photos.length} média{groupe.photos.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Grille de photos */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {groupe.photos.map((photo, pi) => (
                    <div key={photo._id} style={{ position: 'relative', flexShrink: 0 }}>
                      {/* Vignette */}
                      <div
                        onClick={() => setLightbox({ photos: groupe.photos, idx: pi })}
                        style={{
                          width: 140, height: 140, borderRadius: 10, overflow: 'hidden',
                          cursor: 'pointer', border: '2px solid #1e1e3a',
                          transition: 'border-color .15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = '#00d4ff'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = '#1e1e3a'}
                      >
                        {estVideo(photo) ? (
                          <video
                            src={photo.file_url}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            muted
                          />
                        ) : (
                          <img
                            src={photo.thumbnail_url || photo.file_url}
                            alt=""
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        )}
                      </div>

                      {/* Auteur + date */}
                      <div style={{ fontSize: 10, color: '#555577', marginTop: 3, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {photo.utilisateur?.first_name} {photo.utilisateur?.last_name}
                      </div>
                      <div style={{ fontSize: 10, color: '#444466' }}>
                        {fmtDate(photo.uploaded_at)}
                      </div>

                      {/* Bouton supprimer (admin uniquement) */}
                      {isAdmin && (
                        <button
                          onClick={() => supprimer(photo._id)}
                          disabled={deleting[photo._id]}
                          title="Supprimer cette photo"
                          style={{
                            position: 'absolute', top: 5, right: 5,
                            background: 'rgba(255,77,109,0.85)',
                            border: 'none', borderRadius: 6,
                            color: '#fff', fontSize: 13, cursor: 'pointer',
                            width: 26, height: 26, lineHeight: 1,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            opacity: deleting[photo._id] ? 0.5 : 1,
                          }}
                        >
                          🗑
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <PhotoLightbox
          photos={lightbox.photos}
          indexInitial={lightbox.idx}
          onClose={() => setLightbox(null)}
        />
      )}
    </>
  );
}
