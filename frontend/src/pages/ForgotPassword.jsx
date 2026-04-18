// ============================================================
// ForgotPassword.jsx
// Chemin : frontend/src/pages/ForgotPassword.jsx
// Route  : /forgot-password
//
// Page de réinitialisation du mot de passe.
// Deux états : formulaire email → écran confirmation envoi.
//
// Backend requis (à implémenter dans authController.js) :
//   POST /api/auth/forgot-password
//   → Génère un token, l'enregistre en base, envoie un email
//   Package : npm install nodemailer (backend)
// ============================================================

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';
import Logo from '../components/Logo';
import LanguageSwitcher from '../components/LanguageSwitcher';

const ForgotPassword = () => {
    const { t, isRTL } = useLanguage();

    // ── États ───────────────────────────────────────────────────
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [emailEnvoye, setEmailEnvoye] = useState(false); // bascule vers écran confirmation

    // ── Soumission ───────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!email.trim()) {
            setError(t('errorRequired'));
            return;
        }
        if (!/^\S+@\S+\.\S+$/.test(email)) {
            setError(t('errorEmail'));
            return;
        }

        setLoading(true);
        try {
            // ── Appel API ──
            // TODO: Le backend doit :
            //   1. Vérifier que l'email existe dans la base
            //   2. Générer un token : crypto.randomBytes(32).toString('hex')
            //   3. Hasher le token et le stocker dans l'utilisateur
            //      avec une date d'expiration (1 heure)
            //   4. Envoyer un email avec nodemailer contenant le lien :
            //      http://localhost:5173/reset-password/:token
            //   5. Créer la route POST /api/auth/reset-password/:token
            //      qui vérifie le token et met à jour le mot de passe
            //
            // Packages backend nécessaires :
            //   npm install nodemailer
            //   Configuration SMTP dans .env :
            //     SMTP_HOST=smtp.gmail.com
            //     SMTP_PORT=587
            //     SMTP_USER=votre@gmail.com
            //     SMTP_PASS=mot_de_passe_application
            //     FRONTEND_URL=http://localhost:5173

            await axios.post('/api/auth/forgot-password', {
                email: email.toLowerCase().trim()
            });

            // Afficher l'écran de confirmation (peu importe si l'email existe ou non)
            // C'est une bonne pratique de sécurité : ne pas révéler si l'email existe
            setEmailEnvoye(true);

        } catch (err) {
            // Le backend peut retourner une erreur générique
            // Ne pas révéler si l'email existe ou non en base
            setError(err.response?.data?.message || t('error'));
        } finally {
            setLoading(false);
        }
    };

    // ── Écran confirmation envoi ─────────────────────────────────
    if (emailEnvoye) {
        return (
            <div className={`login-page ${isRTL ? 'rtl' : ''}`}>
                <div className="lang-switcher-top"><LanguageSwitcher /></div>
                <div className="login-container" style={{ textAlign: 'center' }}>

                    <Logo size={60} color="#00d4ff" />

                    <div style={{ marginTop: '2rem' }}>
                        {/* Icône email */}
                        <div style={{
                            width: '70px', height: '70px', borderRadius: '50%',
                            background: 'rgba(0,212,255,0.1)', border: '2px solid rgba(0,212,255,0.3)',
                            margin: '0 auto 1.5rem', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', fontSize: '30px'
                        }}>
                            📧
                        </div>

                        <h2 style={{ color: '#00d4ff', marginBottom: '12px', fontSize: '20px' }}>
                            {t('emailSent')}
                        </h2>

                        <p style={{ color: '#8888aa', fontSize: '14px', lineHeight: 1.6, marginBottom: '8px' }}>
                            {t('emailSentDetail')}
                        </p>

                        <p style={{ color: '#8888aa', fontSize: '13px', marginBottom: '2rem' }}>
                            Email envoyé à : <strong style={{ color: '#00d4ff' }}>{email}</strong>
                        </p>

                        {/* Conseils */}
                        <div style={{
                            background: '#12122a', border: '1px solid #2a2a4a',
                            borderRadius: '10px', padding: '1rem', marginBottom: '1.5rem',
                            textAlign: isRTL ? 'right' : 'left'
                        }}>
                            <p style={{ color: '#8888aa', fontSize: '12px', lineHeight: 1.8 }}>
                                💡 Vérifiez votre dossier spam si vous ne recevez pas l'email.<br />
                                ⏱ Le lien expire dans <strong style={{ color: '#e8e8f0' }}>1 heure</strong>.<br />
                                {/* TODO: Ajouter un bouton "Renvoyer l'email" avec délai de 60 secondes */}
                            </p>
                        </div>

                        <Link to="/login" className="link-primary" style={{ fontSize: '14px' }}>
                            ← {t('backToLogin')}
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // ── Formulaire email ─────────────────────────────────────────
    return (
        <div className={`login-page ${isRTL ? 'rtl' : ''}`}>
            <div className="lang-switcher-top"><LanguageSwitcher /></div>

            <div className="login-container">

                <div className="login-logo">
                    <Logo size={60} color="#00d4ff" />
                </div>

                <h2 style={{
                    textAlign: 'center', fontSize: '18px', fontWeight: 700,
                    marginBottom: '8px', color: '#e8e8f0'
                }}>
                    {t('resetPassword')}
                </h2>

                <p style={{
                    textAlign: 'center', fontSize: '13px', color: '#8888aa',
                    marginBottom: '1.5rem', lineHeight: 1.5
                }}>
                    {t('resetInstruction')}
                </p>

                <form className="login-form" onSubmit={handleSubmit} noValidate>

                    <div className="form-group">
                        <label className="form-label">{t('email')} *</label>
                        <input
                            className="form-input"
                            type="email"
                            value={email}
                            onChange={e => { setEmail(e.target.value); setError(''); }}
                            placeholder="votre@email.com"
                            autoComplete="email"
                            dir="ltr"
                            autoFocus
                        />
                    </div>

                    {error && (
                        <div className="error-message" role="alert">⚠ {error}</div>
                    )}

                    <button type="submit" className="btn-login" disabled={loading}>
                        {loading ? t('sending') : t('sendResetLink')}
                    </button>

                    {/* ── LIEN RETOUR LOGIN ── */}
                    <div className="login-links" style={{ justifyContent: 'center' }}>
                        <Link to="/login" className="link-secondary">← {t('backToLogin')}</Link>
                    </div>

                    {/* ── TODO: Page ResetPassword ── */}
                    {/*
            Créer frontend/src/pages/ResetPassword.jsx
            Route : /reset-password/:token
            Champs : nouveau mot de passe + confirmation
            Appel  : POST /api/auth/reset-password/:token
            Backend authController.js → resetPassword() à implémenter :
              1. Hasher le token reçu
              2. Chercher l'utilisateur par reset_token_hash
              3. Vérifier que reset_token_expiry > Date.now()
              4. Hasher le nouveau mot de passe
              5. Supprimer reset_token_hash et reset_token_expiry
              6. Sauvegarder et retourner succès
          */}

                </form>
            </div>
        </div>
    );
};

export default ForgotPassword;