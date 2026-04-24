// ============================================================
// Login.jsx
// Emplacement : frontend/src/pages/Login.jsx
// CORRECTION : Redirection selon le rôle après connexion
//   - role === 'admin' → /admin
//   - role === 'user'  → /dashboard
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

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError(t('errorRequired'));
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/auth/login', {
        email: email.trim().toLowerCase(),
        password: password,
      });

      if (response.data.success) {
        const token = response.data.token;
        const utilisateur = response.data.utilisateur;

        // Stocker dans localStorage
        localStorage.setItem('event_token', token);
        localStorage.setItem('event_user', JSON.stringify(utilisateur));

        // ⚠️ CORRECTION CLÉ : rediriger selon le rôle
        if (utilisateur.role === 'admin') {
          navigate('/admin');
        } else if (utilisateur.role === 'organisateur') {
          navigate('/organisateur');
        } else {
          navigate('/dashboards');
        }
      }
    } catch (err) {
      const message = err.response?.data?.message || t('errorLogin');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`login-page ${isRTL ? 'rtl' : ''}`}>

      <div className="lang-switcher-top">
        <LanguageSwitcher />
      </div>

      <div className="login-container">

        <div className="login-logo">
          <Logo size={70} color="#00d4ff" />
        </div>

        <form className="login-form" onSubmit={handleSubmit} noValidate>

          {/* Email */}
          <div className="form-group">
            <label className="form-label">{t('username')}</label>
            <input
              id="email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              autoComplete="email"
              dir="ltr"
            />
          </div>

          {/* Mot de passe */}
          <div className="form-group">
            <label className="form-label">{t('password')}</label>
            <div className="password-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                dir="ltr"
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Erreur */}
          {error && (
            <div className="error-message" role="alert">⚠ {error}</div>
          )}

          {/* Bouton */}
          <button type="submit" className="btn-login" disabled={loading}>
            {loading ? t('loading') : t('login')}
          </button>

          {/* Liens */}
          <div className="login-links">
            <span className="login-link-text">{t('noAccount')}</span>
            <Link to="/register" className="link-primary">{t('register')}</Link>
          </div>
          <div className="login-links">
            <Link to="/forgot-password" className="link-secondary">{t('forgotPassword')}</Link>
          </div>

        </form>

        {/* Navigation bas de page */}
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
