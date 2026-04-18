// ============================================================
// Register.jsx
// Chemin : frontend/src/pages/Register.jsx
// Route  : /register
//
// Page d'inscription à l'application EVENT.
// Accessible sans connexion, depuis le lien Login.
//
// État actuel : formulaire complet avec validation côté client.
// Backend      : appel POST /api/auth/register prêt à activer.
// ============================================================

import React, { useState } from 'react';
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
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        confirmPassword: '',
        telephone: '',
        // TODO: activer date_naissance quand le modèle Mongoose l'inclut
        // date_naissance: '',
        sexe: '',
        // TODO: role est toujours 'user' côté backend (sécurité)
        //       Ce champ est uniquement visuel pour l'UX
        roleAffiche: 'sportif',
    });

    const [photo, setPhoto] = useState(null);   // fichier image sélectionné
    const [photoPreview, setPhotoPreview] = useState(null); // URL pour prévisualisation
    const [showPw, setShowPw] = useState(false);  // toggle mot de passe
    const [showPw2, setShowPw2] = useState(false);  // toggle confirmation
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    // ── Mise à jour d'un champ ───────────────────────────────────
    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        setError(''); // effacer erreur au fur et à mesure
    };

    // ── Gestion de la photo de profil ───────────────────────────
    const handlePhoto = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Vérifier le type (image uniquement)
        if (!file.type.startsWith('image/')) {
            setError('Veuillez sélectionner une image.');
            return;
        }

        // Vérifier la taille (max 5 Mo)
        if (file.size > 5 * 1024 * 1024) {
            setError('La photo ne doit pas dépasser 5 Mo.');
            return;
        }

        setPhoto(file);
        // Créer une URL temporaire pour la prévisualisation
        setPhotoPreview(URL.createObjectURL(file));

        // TODO: Upload vers Cloudinary ou AWS S3 lors de la soumission
        // Voir backend/controllers/authController.js → route register
    };

    // ── Validation côté client ───────────────────────────────────
    const valider = () => {
        if (!form.first_name.trim() || !form.last_name.trim()) {
            setError('Le prénom et le nom sont obligatoires.');
            return false;
        }
        if (!form.email.trim()) {
            setError(t('errorRequired'));
            return false;
        }
        // Regex email simple
        if (!/^\S+@\S+\.\S+$/.test(form.email)) {
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

    // ── Soumission du formulaire ─────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!valider()) return;

        setLoading(true);
        try {
            // ── Appel API vers le backend Express ──
            // Le champ 'role' est TOUJOURS 'user' côté backend (sécurité)
            // Ne jamais envoyer roleAffiche au backend
            const response = await axios.post('/api/auth/register', {
                first_name: form.first_name.trim(),
                last_name: form.last_name.trim(),
                email: form.email.toLowerCase().trim(),
                password: form.password,
                telephone: form.telephone.trim() || undefined,
                sexe: form.sexe || undefined,
                // TODO: date_naissance: form.date_naissance || undefined,
                langue: localStorage.getItem('event_langue') || 'fr',
                // ⚠️ role : jamais envoyé depuis le frontend
                //    Le backend force toujours role = 'user'
            });

            if (response.data.success) {
                // Stocker le JWT et les infos utilisateur
                localStorage.setItem('event_token', response.data.token);
                localStorage.setItem('event_user', JSON.stringify(response.data.utilisateur));

                // TODO: si photo sélectionnée → uploader vers /api/medias
                // const formData = new FormData();
                // formData.append('photo', photo);
                // await axios.post('/api/medias/photo-profil', formData, {
                //   headers: {
                //     'Content-Type': 'multipart/form-data',
                //     'Authorization': `Bearer ${response.data.token}`
                //   }
                // });

                setSuccess(true);
                // Redirection vers le dashboard après 1.5 secondes
                setTimeout(() => navigate('/dashboard'), 1500);
            }

        } catch (err) {
            // Afficher le message d'erreur retourné par le backend
            setError(err.response?.data?.message || t('error'));
        } finally {
            setLoading(false);
        }
    };

    // ── Affichage du message de succès ───────────────────────────
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

            {/* Sélecteur de langue */}
            <div className="lang-switcher-top">
                <LanguageSwitcher />
            </div>

            <div className="login-container" style={{ maxWidth: '480px' }}>

                {/* Logo */}
                <div className="login-logo">
                    <Logo size={60} color="#00d4ff" />
                </div>

                <h2 style={{
                    textAlign: 'center',
                    fontSize: '20px',
                    fontWeight: 700,
                    marginBottom: '1.5rem',
                    color: '#e8e8f0'
                }}>
                    {t('createAccount')}
                </h2>

                <form className="login-form" onSubmit={handleSubmit} noValidate>

                    {/* ── PHOTO DE PROFIL ── */}
                    <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                        <label htmlFor="photo-input" style={{ cursor: 'pointer' }}>
                            <div style={{
                                width: '80px', height: '80px', borderRadius: '50%',
                                border: '2px dashed #2a2a4a', margin: '0 auto 8px',
                                overflow: 'hidden', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', background: '#12122a',
                                transition: 'border-color .2s',
                            }}>
                                {photoPreview ? (
                                    <img src={photoPreview} alt="preview"
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <span style={{ fontSize: '28px' }}>📷</span>
                                )}
                            </div>
                            <span style={{ fontSize: '12px', color: '#8888aa' }}>
                                {t('profilePhoto')}
                                {/* TODO: Connecter à Cloudinary ou AWS S3 pour stockage réel */}
                            </span>
                        </label>
                        <input
                            id="photo-input"
                            type="file"
                            accept="image/*"
                            onChange={handlePhoto}
                            style={{ display: 'none' }}
                        />
                    </div>

                    {/* ── NOM ET PRÉNOM (côte à côte) ── */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div className="form-group">
                            <label className="form-label">{t('firstName')} *</label>
                            <input
                                className="form-input"
                                type="text"
                                name="first_name"
                                value={form.first_name}
                                onChange={handleChange}
                                placeholder={t('firstName')}
                                autoComplete="given-name"
                                dir={isRTL ? 'rtl' : 'ltr'}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">{t('lastName')} *</label>
                            <input
                                className="form-input"
                                type="text"
                                name="last_name"
                                value={form.last_name}
                                onChange={handleChange}
                                placeholder={t('lastName')}
                                autoComplete="family-name"
                                dir={isRTL ? 'rtl' : 'ltr'}
                            />
                        </div>
                    </div>

                    {/* ── EMAIL ── */}
                    <div className="form-group">
                        <label className="form-label">{t('email')} *</label>
                        <input
                            className="form-input"
                            type="email"
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            placeholder="exemple@email.com"
                            autoComplete="email"
                            dir="ltr" // email toujours LTR
                        />
                    </div>

                    {/* ── MOT DE PASSE ── */}
                    <div className="form-group">
                        <label className="form-label">{t('password')} *</label>
                        <div className="password-wrapper">
                            <input
                                className="form-input"
                                type={showPw ? 'text' : 'password'}
                                name="password"
                                value={form.password}
                                onChange={handleChange}
                                placeholder="6 caractères minimum"
                                autoComplete="new-password"
                                dir="ltr"
                            />
                            <button type="button" className="toggle-password"
                                onClick={() => setShowPw(!showPw)}>
                                {showPw ? '🙈' : '👁️'}
                            </button>
                        </div>
                    </div>

                    {/* ── CONFIRMATION MOT DE PASSE ── */}
                    <div className="form-group">
                        <label className="form-label">{t('confirmPassword')} *</label>
                        <div className="password-wrapper">
                            <input
                                className="form-input"
                                type={showPw2 ? 'text' : 'password'}
                                name="confirmPassword"
                                value={form.confirmPassword}
                                onChange={handleChange}
                                placeholder={t('confirmPassword')}
                                autoComplete="new-password"
                                dir="ltr"
                            />
                            <button type="button" className="toggle-password"
                                onClick={() => setShowPw2(!showPw2)}>
                                {showPw2 ? '🙈' : '👁️'}
                            </button>
                        </div>
                    </div>

                    {/* ── TÉLÉPHONE ── */}
                    <div className="form-group">
                        <label className="form-label">
                            {t('phone')}
                            <span style={{ color: '#8888aa', marginLeft: '4px', fontSize: '11px' }}>(optionnel)</span>
                        </label>
                        <input
                            className="form-input"
                            type="tel"
                            name="telephone"
                            value={form.telephone}
                            onChange={handleChange}
                            placeholder="+216 XX XXX XXX"
                            autoComplete="tel"
                            dir="ltr"
                        />
                    </div>

                    {/* ── SEXE ── */}
                    <div className="form-group">
                        <label className="form-label">
                            Sexe
                            <span style={{ color: '#8888aa', marginLeft: '4px', fontSize: '11px' }}>(optionnel)</span>
                        </label>
                        <select
                            className="form-input"
                            name="sexe"
                            value={form.sexe}
                            onChange={handleChange}
                            style={{ background: '#1a1a35', color: '#e8e8f0', cursor: 'pointer' }}
                        >
                            <option value="">— Sélectionner —</option>
                            <option value="homme">Homme</option>
                            <option value="femme">Femme</option>

                        </select>
                    </div>

                    {/* ── RÔLE (visuel uniquement — backend force 'user') ── */}
                    <div className="form-group">
                        <label className="form-label">
                            {t('role')}
                            {/* ⚠️ Ce champ est uniquement pour l'UX.
                  Le backend attribue TOUJOURS le rôle 'user'.
                  L'admin peut modifier le rôle depuis DashboardAdmin.
              */}
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                            {[
                                { value: 'sportif', label: t('roleSportif'), icon: '🏃' },
                                { value: 'organisateur', label: t('roleOrganisateur'), icon: '🏟' },
                                { value: 'spectateur', label: t('roleSpectateur'), icon: '👁' },
                            ].map(option => (
                                <label
                                    key={option.value}
                                    style={{
                                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                                        gap: '4px', padding: '10px 8px',
                                        background: form.roleAffiche === option.value ? 'rgba(0,212,255,0.1)' : '#1a1a35',
                                        border: `1px solid ${form.roleAffiche === option.value ? '#00d4ff' : '#2a2a4a'}`,
                                        borderRadius: '8px', cursor: 'pointer', fontSize: '12px',
                                        color: form.roleAffiche === option.value ? '#00d4ff' : '#8888aa',
                                        transition: 'all .2s',
                                    }}
                                >
                                    <input
                                        type="radio"
                                        name="roleAffiche"
                                        value={option.value}
                                        checked={form.roleAffiche === option.value}
                                        onChange={handleChange}
                                        style={{ display: 'none' }}
                                    />
                                    <span style={{ fontSize: '20px' }}>{option.icon}</span>
                                    <span>{option.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* ── DATE DE NAISSANCE ── */}
                    {/* TODO: Activer quand le champ est ajouté au modèle Utilisateur.js
          <div className="form-group">
            <label className="form-label">{t('birthDate')}</label>
            <input
              className="form-input"
              type="date"
              name="date_naissance"
              value={form.date_naissance}
              onChange={handleChange}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>
          */}

                    {/* ── CENTRES D'INTÉRÊT ── */}
                    {/* TODO: Ajouter après création des catégories en base
          <div className="form-group">
            <label className="form-label">Centres d'intérêt</label>
            // Charger GET /api/categories et afficher des checkboxes
            // Sauvegarder dans POST /api/interests après inscription
          </div>
          */}

                    {/* ── MESSAGE D'ERREUR ── */}
                    {error && (
                        <div className="error-message" role="alert">⚠ {error}</div>
                    )}

                    {/* ── BOUTON INSCRIPTION ── */}
                    <button type="submit" className="btn-login" disabled={loading}>
                        {loading ? t('loading') : t('createAccount')}
                    </button>

                    {/* ── LIEN RETOUR LOGIN ── */}
                    <div className="login-links" style={{ justifyContent: 'center' }}>
                        <span style={{ color: '#8888aa', fontSize: '13px' }}>{t('alreadyAccount')}</span>
                        <Link to="/login" className="link-primary">{t('login')}</Link>
                    </div>

                </form>
            </div>
        </div>
    );
};

export default Register;