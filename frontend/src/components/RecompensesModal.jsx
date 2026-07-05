import React, { useState, useEffect } from 'react';
import api from '../api';

const FORM_VIDE = {
  titre_recompense: '',
  nbre_heures_pour_recompense: '',
  nbre_participations: '',
  remise_pourcentage: '',
  duree_validite: 30,
};

const RecompensesModal = ({ onClose }) => {
  const [regles, setRegles]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [notif, setNotif]         = useState(null);
  const [form, setForm]           = useState(FORM_VIDE);
  const [editId, setEditId]       = useState(null);
  const [avertissement, setAvertissement] = useState(false);

  const flash = (type, msg) => {
    setNotif({ type, msg });
    setTimeout(() => setNotif(null), 4000);
  };

  const charger = async () => {
    setLoading(true);
    try {
      const res = await api.get('/recompenses/regles');
      setRegles(res.data.regles || []);
    } catch {
      flash('error', 'Impossible de charger les règles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { charger(); }, []);

  const resetForm = () => {
    setForm(FORM_VIDE);
    setEditId(null);
    setAvertissement(false);
  };

  const ouvrirModif = (regle) => {
    setForm({
      titre_recompense:            regle.titre_recompense,
      nbre_heures_pour_recompense: regle.nbre_heures_pour_recompense ?? '',
      nbre_participations:         regle.nbre_participations ?? '',
      remise_pourcentage:          regle.remise_pourcentage ?? '',
      duree_validite:              regle.duree_validite ?? 30,
    });
    setEditId(regle._id);
    setAvertissement(regle.est_active);
    document.getElementById('recompenses-form-top')?.scrollIntoView({ behavior: 'smooth' });
  };

  const soumettre = async (e) => {
    e.preventDefault();
    if (!form.titre_recompense.trim()) {
      flash('error', 'Le nom de la règle est obligatoire'); return;
    }
    if (!form.remise_pourcentage || Number(form.remise_pourcentage) < 1) {
      flash('error', 'La remise doit être supérieure à 0 %'); return;
    }
    setSaving(true);
    try {
      const payload = {
        titre_recompense:            form.titre_recompense.trim(),
        nbre_heures_pour_recompense: Number(form.nbre_heures_pour_recompense) || 0,
        nbre_participations:         Number(form.nbre_participations) || 0,
        remise_pourcentage:          Number(form.remise_pourcentage),
        duree_validite:              Number(form.duree_validite) || 30,
      };
      if (editId) {
        await api.put(`/recompenses/regles/${editId}`, payload);
        flash('success', 'Règle modifiée avec succès');
      } else {
        await api.post('/recompenses/regles', payload);
        flash('success', 'Règle créée avec succès');
      }
      resetForm();
      charger();
    } catch (err) {
      flash('error', err.response?.data?.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatut = async (regle) => {
    try {
      await api.patch(`/recompenses/regles/${regle._id}/statut`);
      flash('success', regle.est_active ? 'Règle désactivée' : 'Règle activée');
      charger();
    } catch {
      flash('error', 'Erreur lors du changement de statut');
    }
  };

  const champ = (key, val) => setForm(p => ({ ...p, [key]: val }));

  return (
    <div className="dash-overlay" onClick={onClose}>
      <div
        className="dash-modal"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 700, width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      >
        {/* ── Header ── */}
        <div className="dash-modal__header">
          <h3>🏆 Gestion des règles de récompenses</h3>
          <button className="dash-modal__close" onClick={onClose}>✕</button>
        </div>

        {/* ── Flash notif ── */}
        {notif && (
          <div style={{
            margin: '0 1.5rem 0',
            padding: '10px 14px',
            borderRadius: 8,
            fontSize: 13,
            background: notif.type === 'success' ? 'rgba(0,230,118,.12)' : 'rgba(255,77,109,.12)',
            color:      notif.type === 'success' ? '#00e676'              : '#ff4d6d',
            border:     `1px solid ${notif.type === 'success' ? 'rgba(0,230,118,.3)' : 'rgba(255,77,109,.3)'}`,
          }}>
            {notif.type === 'success' ? '✓' : '⚠'} {notif.msg}
          </div>
        )}

        <div style={{ overflowY: 'auto', flex: 1, padding: '1rem 1.5rem 1.5rem' }}>

          {/* ══ SECTION A — Liste des règles ══ */}
          <h4 style={{ fontSize: 12, fontWeight: 700, color: '#8888aa', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
            Règles existantes
          </h4>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: '#8888aa' }}>
              <div className="dash-spinner" style={{ margin: '0 auto 8px' }} />
              Chargement…
            </div>
          ) : regles.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: '#555577', fontSize: 13, background: '#0a0a1a', borderRadius: 10, border: '1px solid #2a2a4a' }}>
              Aucune règle de récompense définie.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              {regles.map(r => (
                <div key={r._id} style={{
                  background: '#0a0a1a',
                  border: `1px solid ${editId === r._id ? 'rgba(0,212,255,.4)' : '#2a2a4a'}`,
                  borderRadius: 10,
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  flexWrap: 'wrap',
                }}>
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <div style={{ fontWeight: 700, color: '#e8e8f0', fontSize: 14 }}>{r.titre_recompense}</div>
                    <div style={{ fontSize: 12, color: '#8888aa', marginTop: 3 }}>
                      {r.nbre_heures_pour_recompense > 0 && `${r.nbre_heures_pour_recompense}h de participation`}
                      {r.nbre_heures_pour_recompense > 0 && r.nbre_participations > 0 && ' · '}
                      {r.nbre_participations > 0 && `${r.nbre_participations} événements`}
                      {(r.nbre_heures_pour_recompense > 0 || r.nbre_participations > 0) && ' → '}
                      <span style={{ color: '#ffd700' }}>−{r.remise_pourcentage}%</span>
                      {r.duree_validite > 0 && <span style={{ color: '#8888aa' }}> · valide {r.duree_validite}j</span>}
                    </div>
                  </div>

                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 99,
                    background: r.est_active ? 'rgba(0,230,118,.15)' : 'rgba(136,136,136,.12)',
                    color:      r.est_active ? '#00e676'              : '#8888aa',
                  }}>
                    {r.est_active ? 'Actif' : 'Inactif'}
                  </span>

                  <button
                    onClick={() => toggleStatut(r)}
                    style={{
                      padding: '5px 12px', borderRadius: 6, fontSize: 12,
                      cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontWeight: 600,
                      background: r.est_active ? 'rgba(255,77,109,.12)' : 'rgba(0,230,118,.12)',
                      color:      r.est_active ? '#ff4d6d'               : '#00e676',
                      border:     `1px solid ${r.est_active ? 'rgba(255,77,109,.3)' : 'rgba(0,230,118,.3)'}`,
                    }}
                  >
                    {r.est_active ? 'Désactiver' : 'Activer'}
                  </button>

                  <button
                    onClick={() => ouvrirModif(r)}
                    style={{
                      padding: '5px 12px', borderRadius: 6, fontSize: 12,
                      cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontWeight: 600,
                      background: 'rgba(0,212,255,.1)', color: '#00d4ff',
                      border: '1px solid rgba(0,212,255,.3)',
                    }}
                  >
                    Modifier
                  </button>
                </div>
              ))}
            </div>
          )}

          <hr style={{ border: 'none', borderTop: '1px solid #2a2a4a', margin: '0 0 20px' }} />

          {/* ══ SECTION B — Formulaire ══ */}
          <h4 id="recompenses-form-top" style={{ fontSize: 12, fontWeight: 700, color: '#8888aa', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>
            {editId ? '✏️ Modifier la règle' : '＋ Nouvelle règle'}
          </h4>

          {avertissement && (
            <div style={{
              padding: '10px 14px', marginBottom: 14,
              background: 'rgba(255,107,0,.1)', border: '1px solid rgba(255,107,0,.3)',
              borderRadius: 8, fontSize: 12, color: '#ff6b00',
            }}>
              ⚠ Cette modification s'appliquera aux prochaines récompenses uniquement.
            </div>
          )}

          <form onSubmit={soumettre} className="admin-form">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label>Nom de la règle *</label>
                <input
                  type="text"
                  value={form.titre_recompense}
                  onChange={e => champ('titre_recompense', e.target.value)}
                  placeholder="Ex : Fidèle sportif — 10h de participation"
                  required
                />
              </div>

              <div className="form-group">
                <label>Seuil d'heures cumulées</label>
                <input
                  type="number" min="0"
                  value={form.nbre_heures_pour_recompense}
                  onChange={e => champ('nbre_heures_pour_recompense', e.target.value)}
                  placeholder="Ex : 10"
                />
              </div>

              <div className="form-group">
                <label>Seuil d'événements participés</label>
                <input
                  type="number" min="0"
                  value={form.nbre_participations}
                  onChange={e => champ('nbre_participations', e.target.value)}
                  placeholder="Ex : 5"
                />
              </div>

              <div className="form-group">
                <label>Remise accordée (%) *</label>
                <input
                  type="number" min="1" max="100"
                  value={form.remise_pourcentage}
                  onChange={e => champ('remise_pourcentage', e.target.value)}
                  placeholder="Ex : 15"
                  required
                />
              </div>

              <div className="form-group">
                <label>Durée de validité du coupon (jours) *</label>
                <input
                  type="number" min="1"
                  value={form.duree_validite}
                  onChange={e => champ('duree_validite', e.target.value)}
                  placeholder="Ex : 30"
                  required
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button type="submit" className="dash-btn-primary" disabled={saving}>
                {saving ? 'Enregistrement…' : (editId ? 'Enregistrer les modifications' : 'Créer la règle')}
              </button>
              {editId && (
                <button type="button" className="dash-btn-ghost" onClick={resetForm}>
                  Annuler
                </button>
              )}
            </div>
          </form>

        </div>
      </div>
    </div>
  );
};

export default RecompensesModal;
