import { useState, useEffect } from 'react';

export default function PhotoLightbox({ photos, indexInitial = 0, onClose }) {
  const [idx, setIdx] = useState(indexInitial);
  const total = photos.length;
  const src = photos[idx]?.file_url || photos[idx]?.thumbnail_url || photos[idx] || '';

  useEffect(() => {
    const handle = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setIdx(i => (i + 1) % total);
      if (e.key === 'ArrowLeft') setIdx(i => (i - 1 + total) % total);
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [onClose, total]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)',
        zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {total > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); setIdx(i => (i - 1 + total) % total); }}
          style={navBtn('left')}
        >‹</button>
      )}

      <img
        src={src}
        alt=""
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8 }}
      />

      {total > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); setIdx(i => (i + 1) % total); }}
          style={navBtn('right')}
        >›</button>
      )}

      <button onClick={onClose} style={{
        position: 'absolute', top: 16, right: 20,
        background: 'none', border: 'none', color: '#fff', fontSize: 32, cursor: 'pointer',
      }}>×</button>

      {total > 1 && (
        <div style={{ position: 'absolute', bottom: 16, color: '#ccc', fontSize: 13 }}>
          {idx + 1} / {total}
        </div>
      )}
    </div>
  );
}

const navBtn = (side) => ({
  position: 'absolute', [side]: 16,
  background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff',
  fontSize: 40, cursor: 'pointer', borderRadius: '50%',
  width: 52, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center',
});
