// ============================================================
// Register.jsx
// Chemin : frontend/src/pages/Register.jsx
// Route  : /register
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';
import Logo from '../components/Logo';
import LanguageSwitcher from '../components/LanguageSwitcher';

const Register = () => {
    const navigate = useNavigate();
    const { t, isRTL } = useLanguage();

    // ── États du formulaire ──────────────────────────────────────
    const [form, setForm] = useState({
        first_name:     '',
        last_name:      '',
        email:          '',
        password:       '',
        confirmPassword:'',
        telephone:      '',
        date_naissance: '',
        sexe:           '',
        roleAffiche:    'sportif',
    });

    const [photoPreview, setPhotoPreview] = useState(null);
    const [photoB64, setPhotoB64] = useState('');
    const fileInputRef = useRef(null);

    const [selectedCats, setSelectedCats] = useState(new Set());
    const [categories, setCategories] = useState([]);

    const [showPw, setShowPw]   = useState(false);
    const [showPw2, setShowPw2] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState('');
    const [success, setSuccess] = useState(false);

    // ── Charger les catégories au montage ───────────────────────
    useEffect(() => {
        axios.get('/api/categories')
            .then(r => setCategories(r.data.categories || []))
            .catch(() => {});
    }, []);

    // ── Mise à jour d'un champ ───────────────────────────────────
    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        setError('');
    };

    // ── Photo → base64 ──────────────────────────────────────────
    const handlePhoto = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setError(t('errorPhotoType'));
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            setError('La photo ne doit pas dépasser 2 Mo.');
            return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
            setPhotoPreview(ev.target.result);
            setPhotoB64(ev.target.result);
        };
        reader.readAsDataURL(file);
    };

    const removePhoto = () => {
        setPhotoPreview(null);
        setPhotoB64('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // ── Toggle intérêt ───────────────────────────────────────────
    const toggleCat = (id) => {
        setSelectedCats(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    // Regrouper par event_categ
    const grouped = categories.reduce((acc, cat) => {
        const key = cat.event_categ || 'Autre';
        if (!acc[key]) acc[key] = [];
        acc[key].push(cat);
        return acc;
    }, {});

    // ── Validation ───────────────────────────────────────────────
    const valider = () => {
        if (!form.first_name.trim() || !form.last_name.trim()) {
            setError('Le prénom et le nom sont obligatoires.');
            return false;
        }
        if (!form.email.trim() || !/^\S+@\S+\.\S+$/.test(form.email)) {
            setError(t('errorEmail'));
            return false;
        }
        if (form.password.length < 6) {
            setError(t('errorPasswordLen'));
            return false;
        }
        if (form.password !== form.confirmPassword) {
            setError(t('errorPasswordMatch'));
            return false;
        }
        return true;
    };

    // ── Soumission ───────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!valider()) return;

        setLoading(true);
        try {
            // Inscription sans photo (pas encore de token)
            const response = await axios.post('/api/auth/register', {
                first_name:     form.first_name.trim(),
                last_name:      form.last_name.trim(),
                email:          form.email.toLowerCase().trim(),
                password:       form.password,
                telephone:      form.telephone.trim() || undefined,
                sexe:           form.sexe || undefined,
                date_naissance: form.date_naissance || undefined,
                langue:         localStorage.getItem('event_langue') || 'fr',
            });

            if (response.data.success) {
                const token = response.data.token;
                let utilisateurStocke = response.data.utilisateur;
                localStorage.setItem('event_token', token);

                const authHeader = { headers: { Authorization: `Bearer ${token}` } };

                // Upload photo vers Cloudinary maintenant qu'on a le token
                if (photoB64) {
                    try {
                        const photoRes = await axios.post('/api/utilisateurs/upload-photo',
                            { image: photoB64 }, authHeader);
                        const photoUrl = photoRes.data.url;
                        await axios.put('/api/utilisateurs/profil', { photo: photoUrl }, authHeader);
                        utilisateurStocke = { ...utilisateurStocke, photo: photoUrl };
                    } catch {
                        // Non bloquant
                    }
                }

                localStorage.setItem('event_user', JSON.stringify(utilisateurStocke));

                // Sauvegarder les intérêts si l'utilisateur en a sélectionné
                if (selectedCats.size > 0) {
                    try {
                        await axios.put('/api/utilisateurs/mes-interests',
                            { categories: Array.from(selectedCats) },
                            authHeader
                        );
                    } catch {
                        // Non bloquant — le compte est créé
                    }
                }

                setSuccess(true);
                setTimeout(() => navigate('/dashboards'), 1500);
            }
        } catch (err) {
            setError(err.response?.data?.message || t('error'));
        } finally {
            setLoading(false);
        }
    };

    // ── Écran de succès ─────────────────────────────────────────
    if (success) {
        return (
            <div className={`login-page ${isRTL ? 'rtl' : ''}`}>
                <div className="login-container" style={{ textAlign: 'center' }}>
                    <Logo size={60} color="#00e676" />
                    <div style={{ marginTop: '2rem' }}>
                        <div style={{ fontSize: '48px', marginBottom: '1rem' }}>✓</div>
                        <h2 style={{ color: '#00e676', marginBottom: '8px' }}>Compte créé !</h2>
                        <p style={{ color: '#8888aa', fontSize: '14px' }}>
                            Redirection vers votre espace...
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`login-page ${isRTL ? 'rtl' : ''}`}>

            <div className="lang-switcher-top">
                <LanguageSwitcher />
            </div>

            <div className="login-container" style={{ maxWidth: '480px' }}>

                <div className="login-logo">
                    <Logo size={60} color="#00d4ff" />
                </div>

                <h2 style={{
                    textAlign: 'center', fontSize: '20px', fontWeight: 700,
                    marginBottom: '1.5rem', color: '#e8e8f0',
                }}>
                    {t('createAccount')}
                </h2>

                <form className="login-form" onSubmit={handleSubmit} noValidate>

                    {/* ── PHOTO DE PROFIL ── */}
                    <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                        <div style={{
                            width: 80, height: 80, borderRadius: '50%',
                            border: '2px dashed #2a2a4a', margin: '0 auto 8px',
                            overflow: 'hidden', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', background: '#12122a',
                        }}>
                            {photoPreview
                                ? <img src={photoPreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                : <span style={{ fontSize: 28 }}>📷</span>}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <button type="button"
                                onClick={() => fileInputRef.current?.click()}
                                style={{
                                    fontSize: 11, padding: '4px 10px', cursor: 'pointer', borderRadius: 6,
                                    background: 'rgba(0,212,255,.08)', color: '#00d4ff',
                                    border: '1px solid rgba(0,212,255,.3)', fontFamily: 'Poppins,sans-serif',
                                }}>
                                {t('profilePhoto')} <span style={{ opacity: .6 }}>({t('optional')})</span>
                            </button>
                            {photoPreview && (
                                <button type="button" onClick={removePhoto}
                                    style={{
                                        fontSize: 11, padding: '4px 10px', cursor: 'pointer', borderRadius: 6,
                                        background: 'transparent', color: '#ff4d6d',
                                        border: '1px solid rgba(255,77,109,.3)', fontFamily: 'Poppins,sans-serif',
                                    }}>
                                    Supprimer
                                </button>
                            )}
                        </div>
                        <input ref={fileInputRef} id="photo-input" type="file" accept="image/*"
                            onChange={handlePhoto} style={{ display: 'none' }} />
                        <p style={{ fontSize: 10, color: '#555577', marginTop: 4 }}>JPG, PNG — max 2 Mo</p>
                    </div>

                    {/* ── NOM ET PRÉNOM ── */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div className="form-group">
                            <label className="form-label">{t('firstName')} *</label>
                            <input className="form-input" type="text" name="first_name"
                                value={form.first_name} onChange={handleChange}
                                placeholder={t('firstName')} autoComplete="given-name"
                                dir={isRTL ? 'rtl' : 'ltr'} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">{t('lastName')} *</label>
                            <input className="form-input" type="text" name="last_name"
                                value={form.last_name} onChange={handleChange}
                                placeholder={t('lastName')} autoComplete="family-name"
                                dir={isRTL ? 'rtl' : 'ltr'} />
                        </div>
                    </div>

                    {/* ── EMAIL ── */}
                    <div className="form-group">
                        <label className="form-label">{t('email')} *</label>
                        <input className="form-input" type="email" name="email"
                            value={form.email} onChange={handleChange}
                            placeholder="exemple@email.com" autoComplete="email" dir="ltr" />
                    </div>

                    {/* ── MOT DE PASSE ── */}
                    <div className="form-group">
                        <label className="form-label">{t('password')} *</label>
                        <div className="password-wrapper">
                            <input className="form-input" type={showPw ? 'text' : 'password'}
                                name="password" value={form.password} onChange={handleChange}
                                placeholder="6 caractères minimum" autoComplete="new-password" dir="ltr" />
                            <button type="button" className="toggle-password" onClick={() => setShowPw(!showPw)}>
                                {showPw ? '🙈' : '👁️'}
                            </button>
                        </div>
                    </div>

                    {/* ── CONFIRMATION MOT DE PASSE ── */}
                    <div className="form-group">
                        <label className="form-label">{t('confirmPassword')} *</label>
                        <div className="password-wrapper">
                            <input className="form-input" type={showPw2 ? 'text' : 'password'}
                                name="confirmPassword" value={form.confirmPassword} onChange={handleChange}
                                placeholder={t('confirmPassword')} autoComplete="new-password" dir="ltr" />
                            <button type="button" className="toggle-password" onClick={() => setShowPw2(!showPw2)}>
                                {showPw2 ? '🙈' : '👁️'}
                            </button>
                        </div>
                    </div>

                    {/* ── TÉLÉPHONE ── */}
                    <div className="form-group">
                        <label className="form-label">
                            {t('phone')}
                            <span style={{ color: '#8888aa', marginLeft: 4, fontSize: 11 }}>({t('optional')})</span>
                        </label>
                        <input className="form-input" type="tel" name="telephone"
                            value={form.telephone} onChange={handleChange}
                            placeholder="+216 XX XXX XXX" autoComplete="tel" dir="ltr" />
                    </div>

                    {/* ── DATE DE NAISSANCE ── */}
                    <div className="form-group">
                        <label className="form-label">
                            {t('birthDate')}
                            <span style={{ color: '#8888aa', marginLeft: 4, fontSize: 11 }}>({t('optional')})</span>
                        </label>
                        <input className="form-input" type="date" name="date_naissance"
                            value={form.date_naissance} onChange={handleChange}
                            max={new Date().toISOString().split('T')[0]}
                            style={{ colorScheme: 'dark' }} />
                    </div>

                    {/* ── SEXE ── */}
                    <div className="form-group">
                        <label className="form-label">
                            {t('sexe')}
                            <span style={{ color: '#8888aa', marginLeft: 4, fontSize: 11 }}>({t('optional')})</span>
                        </label>
                        <select className="form-input" name="sexe" value={form.sexe} onChange={handleChange}
                            style={{ background: '#1a1a35', color: '#e8e8f0', cursor: 'pointer' }}>
                            <option value="">— Sélectionner —</option>
                            <option value="homme">{t('sexeHomme')}</option>
                            <option value="femme">{t('sexeFemme')}</option>
                        </select>
                    </div>

                    {/* ── RÔLE (visuel — backend force 'user') ── */}
                    <div className="form-group">
                        <label className="form-label">{t('role')}</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                            {[
                                { value: 'sportif',      label: t('roleSportif'),      icon: '🏃' },
                                { value: 'organisateur', label: t('roleOrganisateur'), icon: '🏟' },
                                { value: 'spectateur',   label: t('roleSpectateur'),   icon: '👁' },
                            ].map(opt => (
                                <label key={opt.value} style={{
                                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                                    gap: 4, padding: '10px 8px',
                                    background: form.roleAffiche === opt.value ? 'rgba(0,212,255,.1)' : '#1a1a35',
                                    border: `1px solid ${form.roleAffiche === opt.value ? '#00d4ff' : '#2a2a4a'}`,
                                    borderRadius: 8, cursor: 'pointer', fontSize: 12,
                                    color: form.roleAffiche === opt.value ? '#00d4ff' : '#8888aa',
                                    transition: 'all .2s',
                                }}>
                                    <input type="radio" name="roleAffiche" value={opt.value}
                                        checked={form.roleAffiche === opt.value} onChange={handleChange}
                                        style={{ display: 'none' }} />
                                    <span style={{ fontSize: 20 }}>{opt.icon}</span>
                                    <span>{opt.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* ── CENTRES D'INTÉRÊT ── */}
                    {categories.length > 0 && (
                        <div className="form-group">
                            <label className="form-label">
                                Centres d'intérêt
                                <span style={{ color: '#8888aa', marginLeft: 4, fontSize: 11 }}>({t('optional')})</span>
                            </label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {Object.entries(grouped).map(([groupName, cats]) => (
                                    <div key={groupName}>
                                        <div style={{ fontSize: 10, color: '#8888aa', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            {groupName}
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                            {cats.map(cat => {
                                                const active = selectedCats.has(cat._id);
                                                return (
                                                    <button key={cat._id} type="button"
                                                        onClick={() => toggleCat(cat._id)}
                                                        style={{
                                                            padding: '4px 10px', fontSize: 12, cursor: 'pointer',
                                                            borderRadius: 20, fontFamily: 'Poppins,sans-serif',
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
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── ERREUR ── */}
                    {error && (
                        <div className="error-message" role="alert">⚠ {error}</div>
                    )}

                    {/* ── BOUTON INSCRIPTION ── */}
                    <button type="submit" className="btn-login" disabled={loading}>
                        {loading ? t('loading') : t('createAccount')}
                    </button>

                    {/* ── LIEN LOGIN ── */}
                    <div className="login-links" style={{ justifyContent: 'center' }}>
                        <span style={{ color: '#8888aa', fontSize: 13 }}>{t('alreadyAccount')}</span>
                        <Link to="/login" className="link-primary">{t('login')}</Link>
                    </div>

                </form>
            </div>
        </div>
    );
};

export default Register;
