import { useState } from 'react';
import PhotoLightbox from './PhotoLightbox';

export default function PhotoGallery({ photos = [], onAjouter, peutAjouter = false, uploading = false }) {
  const [lightboxIdx, setLightboxIdx] = useState(null);

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {photos.map((photo, i) => (
          <div
            key={photo._id || i}
            onClick={() => setLightboxIdx(i)}
            style={{
              width: 150, height: 150, borderRadius: 8, overflow: 'hidden',
              cursor: 'pointer', border: '2px solid #333', flexShrink: 0,
            }}
          >
            <img
              src={photo.thumbnail_url || photo.file_url || photo}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        ))}

        {peutAjouter && (
          <label style={{
            width: 150, height: 150, borderRadius: 8, border: '2px dashed #555',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', cursor: uploading ? 'not-allowed' : 'pointer',
            color: '#888', fontSize: 13, flexShrink: 0,
          }}>
            <span style={{ fontSize: 28, marginBottom: 4 }}>📷</span>
            {uploading ? 'Envoi...' : 'Ajouter'}
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              disabled={uploading}
              onChange={(e) => {
                if (e.target.files[0]) onAjouter(e.target.files[0]);
                e.target.value = '';
              }}
            />
          </label>
        )}

        {photos.length === 0 && !peutAjouter && (
          <p style={{ color: '#666', fontSize: 13, margin: 0 }}>Aucune photo</p>
        )}
      </div>

      {lightboxIdx !== null && (
        <PhotoLightbox
          photos={photos}
          indexInitial={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
        />
      )}
    </div>
  );
}
