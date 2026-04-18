// ============================================================
// Login.jsx — Page 3 : Connexion à l'application
// ============================================================

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';
import Logo from '../components/Logo';
import LanguageSwitcher from '../components/LanguageSwitcher';
import '../styles/login.css';

const Login = () => {
    const navigate = useNavigate();
    const { t, isRTL } = useLanguage();

    // ── États du formulaire ──
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);  // Toggle afficher/masquer
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    /**
     * Soumettre le formulaire de connexion
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validation basique côté client
        if (!email.trim() || !password.trim()) {
            setError(t('errorRequired'));
            return;
        }

        setLoading(true);

        try {
            // Appel API : POST /api/auth/login
            const response = await axios.post('/api/auth/login', {
                email: email.trim(),
                password
            });

            if (response.data.success) {
                // Stocker le JWT dans localStorage
                localStorage.setItem('event_token', response.data.token);
                // Stocker les infos utilisateur
                localStorage.setItem('event_user', JSON.stringify(response.data.utilisateur));

                // Rediriger vers le dashboard
                //navigate('/dashboard');
                // Dans la fonction handleSubmit, remplacer navigate('/dashboard') par :

                if (response.data.success) {
                    const token = response.data.token;
                    const user = response.data.utilisateur;

                    localStorage.setItem('event_token', token);
                    localStorage.setItem('event_user', JSON.stringify(user));

                    // Redirection selon le rôle
                    if (user.role === 'admin') {
                        navigate('/admin');           // ← Admin → panneau admin
                    } else {
                        navigate('/dashboard');       // ← User → espace personnel
                    }
                }
            }

        } catch (err) {
            // Afficher l'erreur retournée par le backend
            const message = err.response?.data?.message || t('errorLogin');
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`login-page ${isRTL ? 'rtl' : ''}`}>

            {/* Sélecteur de langue en haut à droite */}
            <div className="lang-switcher-top">
                <LanguageSwitcher />
            </div>

            <div className="login-container">

                {/* Logo */}
                <div className="login-logo">
                    <Logo size={70} color="#00d4ff" />
                </div>

                {/* Formulaire de connexion */}
                <form className="login-form" onSubmit={handleSubmit} noValidate>

                    {/* Champ email / nom d'utilisateur */}
                    <div className="form-group">
                        <label htmlFor="email" className="form-label">
                            {t('username')}
                        </label>
                        <input
                            id="email"
                            type="email"
                            className="form-input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder={t('username')}
                            autoComplete="email"
                            dir={isRTL ? 'rtl' : 'ltr'}
                        />
                    </div>

                    {/* Champ mot de passe avec toggle */}
                    <div className="form-group">
                        <label htmlFor="password" className="form-label">
                            {t('password')}
                        </label>
                        <div className="password-wrapper">
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                className="form-input"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder={t('password')}
                                autoComplete="current-password"
                                dir={isRTL ? 'rtl' : 'ltr'}
                            />
                            {/* Bouton afficher/masquer le mot de passe */}
                            <button
                                type="button"
                                className="toggle-password"
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                            >
                                {showPassword ? '🙈' : '👁️'}
                            </button>
                        </div>
                    </div>

                    {/* Message d'erreur */}
                    {error && (
                        <div className="error-message" role="alert">
                            ⚠️ {error}
                        </div>
                    )}

                    {/* Bouton de connexion */}
                    <button
                        type="submit"
                        className="btn-login"
                        disabled={loading}
                    >
                        {loading ? t('loading') : t('login')}
                    </button>

                    {/* Liens inscription / mot de passe oublié */}
                    <div className="login-links">
                        <span className="login-link-text">{t('noAccount')}</span>
                        <Link to="/register" className="link-primary">
                            {t('register')}
                        </Link>
                    </div>

                    <div className="login-links">
                        <Link to="/forgot-password" className="link-secondary">
                            {t('forgotPassword')}
                        </Link>
                    </div>

                </form>

                {/* ── Boutons du bas (hypertext stylisés) ── */}
                <div className="bottom-nav">

                    <Link to="/about-org" className="nav-card">
                        <span className="nav-card-icon">🏛️</span>
                        <span className="nav-card-label">{t('aboutOrg')}</span>
                    </Link>

                    <Link to="/about-app" className="nav-card">
                        <span className="nav-card-icon">📱</span>
                        <span className="nav-card-label">{t('aboutApp')}</span>
                    </Link>

                    <Link to="/location" className="nav-card">
                        <span className="nav-card-icon">📍</span>
                        <span className="nav-card-label">{t('ourLocation')}</span>
                    </Link>

                </div>

            </div>
        </div>
    );
};

export default Login;