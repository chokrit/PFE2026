// ============================================================
// MonEspaceModal.jsx — Modal "Mon compte"
// Tabs : Mes informations | Mot de passe
//
// SECTION PRÉFÉRENCES SPORTIVES (onglet infos) :
//   Mode affichage : chips colorés des sports déjà choisis
//                    + bouton "Modifier" pour entrer en mode édition
//                    + bouton "Suggérer un sport absent"
//   Mode édition   : grille toggle complète des sports disponibles
//   Formulaire suggestion : envoie POST /api/categories/suggerer
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import api from '../../api';

const MonEspaceModal = ({ utilisateur, onClose, onUpdate }) => {
  const [tab, setTab] = useState('infos');

  const [form, setForm] = useState({
    first_name: utilisateur?.first_name || '',
    last_name:  utilisateur?.last_name  || '',
    telephone:  utilisateur?.telephone  || '',
    photo:      utilisateur?.photo      || '',
  });
  const [photoPreview, setPhotoPreview] = useState(utilisateur?.photo || null);
  const fileInputRef = useRef(null);
  const [savingInfos, setSavingInfos] = useState(false);

  const [categories, setCategories]     = useState([]);
  const [selectedCats, setSelectedCats] = useState(new Set());
  const [loadingCats, setLoadingCats]   = useState(true);

  // ── États mode édition préférences ──────────────────────
  const [editPrefs, setEditPrefs]       = useState(false);

  // ── États formulaire suggestion ──────────────────────────
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [suggForm, setSuggForm]  = useState({ event_categ: '', event_type: '', raison: '' });
  const [savingSugg, setSavingSugg] = useState(false);

  const [mdp, setMdp] = useState({ ancien: '', nouveau: '', confirmer: '' });
  const [savingMdp, setSavingMdp] = useState(false);

  const [notif, setNotif] = useState(null);

  const flash = (type, msg) => {
    setNotif({ type, msg });
    setTimeout(() => setNotif(null), 3500);
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const [catsRes, interestsRes] = await Promise.all([
          api.get('/categories'),
          api.get('/utilisateurs/mes-interests'),
        ]);
        setCategories(catsRes.data.categories || []);
        const ids = new Set(
          (interestsRes.data.interests || []).map(i => i.categorie?._id).filter(Boolean)
        );
        setSelectedCats(ids);
      } catch {
        // Silencieux si pas de catégories
      } finally {
        setLoadingCats(false);
      }
    };
    loadData();
  }, []);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      flash('error', 'Veuillez sélectionner une image (JPG, PNG...)');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      flash('error', 'La photo ne doit pas dépasser 2 Mo');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const b64 = ev.target.result;
      setPhotoPreview(b64);
      setForm(f => ({ ...f, photo: b64 }));
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setPhotoPreview(null);
    setForm(f => ({ ...f, photo: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleCat = (id) => {
    setSelectedCats(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Regrouper les catégories par event_categ pour la grille d'édition
  const grouped = categories.reduce((acc, cat) => {
    const key = cat.event_categ || 'Autre';
    if (!acc[key]) acc[key] = [];
    acc[key].push(cat);
    return acc;
  }, {});

  // Sports choisis avec leur détail (pour l'affichage en chips)
  const sportsChoisis = categories.filter(c => selectedCats.has(c._id));

  const sauvegarderInfos = async (e) => {
    e.preventDefault();
    setSavingInfos(true);
    try {
      let photoUrl = form.photo;
      if (form.photo && form.photo.startsWith('data:image')) {
        const uploadRes = await api.post('/utilisateurs/upload-photo', { image: form.photo });
        photoUrl = uploadRes.data.url;
      }

      const [profilRes] = await Promise.all([
        api.put('/utilisateurs/profil', {
          first_name: form.first_name,
          last_name:  form.last_name,
          telephone:  form.telephone,
          photo:      photoUrl,
        }),
        api.put('/utilisateurs/mes-interests', {
          categories: Array.from(selectedCats),
        }),
      ]);
      const updated = profilRes.data.utilisateur;
      const stored = { ...utilisateur, ...updated };
      localStorage.setItem('event_user', JSON.stringify(stored));
      onUpdate(stored);
      setEditPrefs(false);
      flash('success', 'Profil et préférences mis à jour');
    } catch {
      flash('error', 'Erreur lors de la mise à jour');
    } finally {
      setSavingInfos(false);
    }
  };

  // ── Soumettre une suggestion de nouveau sport ────────────
  const soumettresuggestion = async (e) => {
    e.preventDefault();
    if (!suggForm.event_categ.trim() || !suggForm.event_type.trim()) {
      flash('error', 'Groupe et nom du sport obligatoires');
      return;
    }
    setSavingSugg(true);
    try {
      const res = await api.post('/categories/suggerer', {
        event_categ:       suggForm.event_categ.trim(),
        event_type:        suggForm.event_type.trim(),
        raison_suggestion: suggForm.raison.trim(),
      });
      flash('success', res.data.message);
      setSuggForm({ event_categ: '', event_type: '', raison: '' });
      setShowSuggestion(false);
    } catch (err) {
      flash('error', err.response?.data?.message || 'Erreur lors de la suggestion');
    } finally {
      setSavingSugg(false);
    }
  };

  const changerMotDePasse = async (e) => {
    e.preventDefault();
    if (mdp.nouveau !== mdp.confirmer) {
      flash('error', 'Les deux mots de passe ne correspondent pas');
      return;
    }
    if (mdp.nouveau.length < 6) {
      flash('error', 'Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    setSavingMdp(true);
    try {
      await api.put('/utilisateurs/mot-de-passe', {
        ancien_mot_de_passe: mdp.ancien,
        nouveau_mot_de_passe: mdp.nouveau,
      });
      setMdp({ ancien: '', nouveau: '', confirmer: '' });
      flash('success', 'Mot de passe modifié');
    } catch (err) {
      flash('error', err.response?.data?.message || 'Erreur changement mot de passe');
    } finally {
      setSavingMdp(false);
    }
  };

  const initials = `${utilisateur?.first_name?.[0] || ''}${utilisateur?.last_name?.[0] || ''}`;
  const roleColor = {
    admin:        { bg: 'rgba(255,77,109,.15)',  color: '#ff4d6d', border: 'rgba(255,77,109,.3)' },
    organisateur: { bg: 'rgba(255,107,0,.15)',   color: '#ff6b00', border: 'rgba(255,107,0,.3)' },
    user:         { bg: 'rgba(0,212,255,.1)',    color: '#00d4ff', border: 'rgba(0,212,255,.2)' },
  }[utilisateur?.role] || { bg: 'rgba(0,212,255,.1)', color: '#00d4ff', border: 'rgba(0,212,255,.2)' };

  return (
    <div className="dash-overlay" onClick={onClose}>
      <div
        className="dash-modal"
        style={{ maxWidth: '520px', width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="dash-modal__header">
          <h3>Mon compte</h3>
          <button className="dash-modal__close" onClick={onClose}>✕</button>
        </div>

        {/* Avatar + identité */}
        <div style={{ padding: '1rem 1.5rem 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%', overflow: 'hidden',
            background: photoPreview ? 'transparent' : 'linear-gradient(135deg,#00d4ff,#0099bb)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 700, color: '#fff', flexShrink: 0,
            border: '2px solid rgba(0,212,255,.3)',
          }}>
            {photoPreview
              ? <img src={photoPreview} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : initials}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>
              {utilisateur?.first_name} {utilisateur?.last_name}
            </div>
            <div style={{ fontSize: 12, color: '#8888aa' }}>{utilisateur?.email}</div>
          </div>
          <span style={{
            marginLeft: 'auto', padding: '2px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
            background: roleColor.bg, color: roleColor.color, border: `1px solid ${roleColor.border}`,
          }}>
            {utilisateur?.role}
          </span>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, padding: '1rem 1.5rem 0' }}>
          {[
            { key: 'infos', label: 'Mes informations' },
            { key: 'mdp',   label: 'Mot de passe' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: '6px 14px', fontSize: 12, fontWeight: tab === t.key ? 700 : 400,
              cursor: 'pointer', borderRadius: 8, fontFamily: 'Poppins,sans-serif',
              background: tab === t.key ? 'rgba(0,212,255,.1)' : 'transparent',
              color: tab === t.key ? '#00d4ff' : '#8888aa',
              border: `1px solid ${tab === t.key ? '#00d4ff' : '#2a2a4a'}`,
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Notification */}
        {notif && (
          <div style={{
            margin: '0.75rem 1.5rem 0', padding: '10px 14px', borderRadius: 8, fontSize: 13,
            background: notif.type === 'success' ? 'rgba(0,230,118,.1)' : 'rgba(255,77,109,.1)',
            border: `1px solid ${notif.type === 'success' ? 'rgba(0,230,118,.3)' : 'rgba(255,77,109,.3)'}`,
            color: notif.type === 'success' ? '#00e676' : '#ff4d6d',
          }}>
            {notif.type === 'success' ? '✓' : '⚠'} {notif.msg}
          </div>
        )}

        {/* Contenu scrollable */}
        <div style={{ padding: '1rem 1.5rem 1.5rem', overflowY: 'auto', flex: 1 }}>

          {/* ── ONGLET INFOS ── */}
          {tab === 'infos' && (
            <form onSubmit={sauvegarderInfos} className="admin-form">

              {/* Photo de profil */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: 12, color: '#8888aa', marginBottom: 8 }}>
                  Photo de profil
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: '50%', overflow: 'hidden',
                    background: photoPreview ? 'transparent' : '#1a1a35',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, fontWeight: 700, color: '#00d4ff', flexShrink: 0,
                    border: '2px dashed rgba(0,212,255,.3)',
                  }}>
                    {photoPreview
                      ? <img src={photoPreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ opacity: 0.4 }}>👤</span>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <input ref={fileInputRef} type="file" accept="image/*"
                      style={{ display: 'none' }} onChange={handlePhotoChange} />
                    <button type="button" onClick={() => fileInputRef.current?.click()} style={{
                      padding: '5px 12px', fontSize: 12, cursor: 'pointer', borderRadius: 6,
                      background: 'rgba(0,212,255,.1)', color: '#00d4ff',
                      border: '1px solid rgba(0,212,255,.3)', fontFamily: 'Poppins,sans-serif',
                    }}>
                      Choisir une image
                    </button>
                    {photoPreview && (
                      <button type="button" onClick={removePhoto} style={{
                        padding: '5px 12px', fontSize: 12, cursor: 'pointer', borderRadius: 6,
                        background: 'transparent', color: '#ff4d6d',
                        border: '1px solid rgba(255,77,109,.3)', fontFamily: 'Poppins,sans-serif',
                      }}>
                        Supprimer
                      </button>
                    )}
                    <span style={{ fontSize: 11, color: '#555577' }}>JPG, PNG — max 2 Mo</span>
                  </div>
                </div>
              </div>

              {/* Prénom + Nom */}
              <div className="form-row">
                <div className="form-group">
                  <label>Prénom *</label>
                  <input type="text" value={form.first_name} required
                    onChange={e => setForm({ ...form, first_name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Nom *</label>
                  <input type="text" value={form.last_name} required
                    onChange={e => setForm({ ...form, last_name: e.target.value })} />
                </div>
              </div>

              {/* Téléphone */}
              <div className="form-group">
                <label>Téléphone</label>
                <input type="tel" value={form.telephone}
                  onChange={e => setForm({ ...form, telephone: e.target.value })}
                  placeholder="+216 XX XXX XXX" />
              </div>

              {/* ── PRÉFÉRENCES SPORTIVES ── */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label style={{ fontSize: 12, color: '#8888aa' }}>
                    Mes préférences sportives
                  </label>
                  {/* Bouton pour basculer entre affichage et édition */}
                  {!editPrefs && (
                    <button type="button" onClick={() => setEditPrefs(true)} style={{
                      padding: '3px 10px', fontSize: 11, cursor: 'pointer', borderRadius: 6,
                      background: 'rgba(0,212,255,.08)', color: '#00d4ff',
                      border: '1px solid rgba(0,212,255,.25)', fontFamily: 'Poppins,sans-serif',
                    }}>
                      ✏️ Modifier
                    </button>
                  )}
                  {editPrefs && (
                    <button type="button" onClick={() => setEditPrefs(false)} style={{
                      padding: '3px 10px', fontSize: 11, cursor: 'pointer', borderRadius: 6,
                      background: 'transparent', color: '#8888aa',
                      border: '1px solid #2a2a4a', fontFamily: 'Poppins,sans-serif',
                    }}>
                      ✕ Fermer
                    </button>
                  )}
                </div>

                {loadingCats ? (
                  <p style={{ fontSize: 12, color: '#555577' }}>Chargement...</p>
                ) : (
                  <>
                    {/* ── MODE AFFICHAGE : chips des sports choisis ── */}
                    {!editPrefs && (
                      <div>
                        {sportsChoisis.length === 0 ? (
                          <p style={{ fontSize: 12, color: '#555577', fontStyle: 'italic' }}>
                            Aucune préférence ajoutée. Cliquez sur "Modifier" pour en choisir.
                          </p>
                        ) : (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {sportsChoisis.map(cat => (
                              <span key={cat._id} style={{
                                padding: '4px 12px', fontSize: 12, borderRadius: 20, fontWeight: 600,
                                background: 'rgba(0,212,255,.15)', color: '#00d4ff',
                                border: '1px solid rgba(0,212,255,.3)',
                              }}>
                                ✓ {cat.event_type || cat.event_categ}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── MODE ÉDITION : grille toggle complète ── */}
                    {editPrefs && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 8 }}>
                        {categories.length === 0 ? (
                          <p style={{ fontSize: 12, color: '#555577' }}>Aucune catégorie disponible.</p>
                        ) : (
                          Object.entries(grouped).map(([groupName, cats]) => (
                            <div key={groupName}>
                              <div style={{ fontSize: 11, color: '#8888aa', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                {groupName}
                              </div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {cats.map(cat => {
                                  const active = selectedCats.has(cat._id);
                                  return (
                                    <button key={cat._id} type="button" onClick={() => toggleCat(cat._id)} style={{
                                      padding: '4px 10px', fontSize: 12, cursor: 'pointer', borderRadius: 20,
                                      fontFamily: 'Poppins,sans-serif', transition: 'all .15s',
                                      background: active ? 'rgba(0,212,255,.15)' : 'transparent',
                                      color: active ? '#00d4ff' : '#666688',
                                      border: `1px solid ${active ? '#00d4ff' : '#2a2a4a'}`,
                                      fontWeight: active ? 600 : 400,
                                    }}>
                                      {active ? '✓ ' : ''}{cat.event_type || cat.event_categ}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* ── BOUTON SUGGESTION ── */}
                    <button type="button"
                      onClick={() => setShowSuggestion(s => !s)}
                      style={{
                        marginTop: 8, padding: '4px 12px', fontSize: 11, cursor: 'pointer',
                        borderRadius: 6, fontFamily: 'Poppins,sans-serif',
                        background: showSuggestion ? 'rgba(167,139,250,.1)' : 'transparent',
                        color: '#a78bfa', border: '1px solid rgba(167,139,250,.3)',
                      }}>
                      💡 {showSuggestion ? 'Annuler la suggestion' : 'Suggérer un sport absent de la liste'}
                    </button>

                    {/* ── FORMULAIRE SUGGESTION ── */}
                    {showSuggestion && (
                      <div style={{
                        marginTop: 10, padding: '12px 14px',
                        background: 'rgba(167,139,250,.05)',
                        border: '1px solid rgba(167,139,250,.2)',
                        borderRadius: 10,
                      }}>
                        <p style={{ fontSize: 12, color: '#8888aa', marginBottom: 10 }}>
                          Votre suggestion sera examinée par l'équipe. Si elle est acceptée, elle apparaîtra dans la liste pour tous les utilisateurs.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <div style={{ flex: 1 }}>
                              <label style={{ fontSize: 11, color: '#8888aa', display: 'block', marginBottom: 4 }}>
                                Groupe * <span style={{ color: '#555' }}>(ex: Sport collectif)</span>
                              </label>
                              <input type="text" value={suggForm.event_categ}
                                onChange={e => setSuggForm({ ...suggForm, event_categ: e.target.value })}
                                placeholder="Sport collectif"
                                style={{ width: '100%', background: '#1a1a35', color: '#e8e8f0', border: '1px solid #2a2a4a', borderRadius: 6, padding: '6px 10px', fontFamily: 'Poppins,sans-serif', fontSize: 12, boxSizing: 'border-box' }} />
                            </div>
                            <div style={{ flex: 1 }}>
                              <label style={{ fontSize: 11, color: '#8888aa', display: 'block', marginBottom: 4 }}>
                                Sport * <span style={{ color: '#555' }}>(ex: Volleyball)</span>
                              </label>
                              <input type="text" value={suggForm.event_type}
                                onChange={e => setSuggForm({ ...suggForm, event_type: e.target.value })}
                                placeholder="Volleyball"
                                style={{ width: '100%', background: '#1a1a35', color: '#e8e8f0', border: '1px solid #2a2a4a', borderRadius: 6, padding: '6px 10px', fontFamily: 'Poppins,sans-serif', fontSize: 12, boxSizing: 'border-box' }} />
                            </div>
                          </div>
                          <div>
                            <label style={{ fontSize: 11, color: '#8888aa', display: 'block', marginBottom: 4 }}>
                              Pourquoi ce sport ? <span style={{ color: '#555' }}>(optionnel)</span>
                            </label>
                            <textarea rows={2} value={suggForm.raison}
                              onChange={e => setSuggForm({ ...suggForm, raison: e.target.value })}
                              placeholder="Il y a beaucoup de joueurs dans ma région..."
                              style={{ width: '100%', background: '#1a1a35', color: '#e8e8f0', border: '1px solid #2a2a4a', borderRadius: 6, padding: '6px 10px', fontFamily: 'Poppins,sans-serif', fontSize: 12, resize: 'none', boxSizing: 'border-box' }} />
                          </div>
                          <button type="button" onClick={soumettresuggestion} disabled={savingSugg} style={{
                            padding: '7px 16px', background: 'rgba(167,139,250,.2)', color: '#a78bfa',
                            border: '1px solid rgba(167,139,250,.4)', borderRadius: 6, cursor: 'pointer',
                            fontFamily: 'Poppins,sans-serif', fontSize: 12, fontWeight: 600, alignSelf: 'flex-start',
                          }}>
                            {savingSugg ? 'Envoi...' : '📨 Envoyer la suggestion'}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Stats lecture seule */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem' }}>
                {[
                  { label: 'Points',    value: utilisateur?.cumul_points || 0,                   color: '#00d4ff' },
                  { label: 'Heures',    value: `${utilisateur?.cumul_heures_participation || 0}h`, color: '#00e676' },
                  { label: 'Fiabilité', value: `${utilisateur?.reliabilite_score ?? 100}%`,        color: '#ffd700' },
                ].map(s => (
                  <div key={s.label} style={{
                    flex: 1, background: '#0a0a1a', borderRadius: 8, padding: '8px', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 17, fontWeight: 700, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 10, color: '#8888aa', marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              <button type="submit" className="dash-btn-primary" disabled={savingInfos} style={{ width: '100%' }}>
                {savingInfos ? 'Enregistrement...' : 'Sauvegarder'}
              </button>
            </form>
          )}

          {/* ── ONGLET MOT DE PASSE ── */}
          {tab === 'mdp' && (
            <form onSubmit={changerMotDePasse} className="admin-form">
              <div className="form-group">
                <label>Mot de passe actuel *</label>
                <input type="password" value={mdp.ancien}
                  onChange={e => setMdp({ ...mdp, ancien: e.target.value })}
                  placeholder="••••••••" required autoComplete="current-password" />
              </div>
              <div className="form-group">
                <label>Nouveau mot de passe *</label>
                <input type="password" value={mdp.nouveau}
                  onChange={e => setMdp({ ...mdp, nouveau: e.target.value })}
                  placeholder="Min. 6 caractères" required autoComplete="new-password" />
              </div>
              <div className="form-group">
                <label>Confirmer le nouveau mot de passe *</label>
                <input type="password" value={mdp.confirmer}
                  onChange={e => setMdp({ ...mdp, confirmer: e.target.value })}
                  placeholder="••••••••" required autoComplete="new-password" />
              </div>
              {mdp.nouveau && mdp.confirmer && mdp.nouveau !== mdp.confirmer && (
                <p style={{ color: '#ff4d6d', fontSize: 12, marginBottom: 8 }}>
                  ⚠ Les mots de passe ne correspondent pas
                </p>
              )}
              <button type="submit" className="dash-btn-primary" disabled={savingMdp} style={{ width: '100%' }}>
                {savingMdp ? 'Modification...' : 'Changer le mot de passe'}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};

export default MonEspaceModal;
