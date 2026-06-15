// ============================================================
// SplashScreen.jsx — Écran de démarrage
// Durée : 2 secondes
// Animation : lettres "CHOKRI Touhami" qui se rassemblent
//             avec des mouvements sportifs (courses, sauts, rotations)
// ============================================================

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SportAnimation from '../components/SportAnimation';
import '../styles/splash.css';

// ── Définition des lettres + animation sportive par lettre ──
// Chaque lettre arrive d'une direction différente comme un
// athlète rejoignant son équipe sur le terrain.
const CHOKRI = [
  { char: 'C', anim: 'flyFromLeft',    delay: '0.05s', title: true },  // sprint depuis gauche
  { char: 'H', anim: 'flyFromTop',     delay: '0.14s', title: true },  // saut en hauteur
  { char: 'O', anim: 'spinIn',         delay: '0.22s', title: true },  // rotation disque
  { char: 'K', anim: 'flyFromBottom',  delay: '0.30s', title: true },  // saut gymnaste
  { char: 'R', anim: 'flyFromRight',   delay: '0.38s', title: true },  // sprint depuis droite
  { char: 'I', anim: 'bounceIn',       delay: '0.45s', title: true },  // rebond basket
];

const TOUHAMI = [
  { char: 'T', anim: 'flyFromTop',     delay: '0.54s', title: false }, // javelot
  { char: 'o', anim: 'spinIn',         delay: '0.61s', title: false }, // rotation ballon
  { char: 'u', anim: 'flyFromBottom',  delay: '0.68s', title: false }, // plongeon
  { char: 'h', anim: 'flyFromLeft',    delay: '0.75s', title: false }, // glissade
  { char: 'a', anim: 'flyFromRight',   delay: '0.81s', title: false }, // course
  { char: 'm', anim: 'flyFromTop',     delay: '0.87s', title: false }, // saut perche
  { char: 'i', anim: 'bounceIn',       delay: '0.93s', title: false }, // rebond
];

const SplashScreen = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('event_token');
    const user  = localStorage.getItem('event_user');

    const timer = setTimeout(() => {
      if (token && user) {
        // Déjà connecté → aller directement au tableau de bord
        try {
          const u = JSON.parse(user);
          if (u.role === 'admin')          navigate('/admin');
          else if (u.role === 'organisateur') navigate('/organisateur');
          else                             navigate('/dashboards');
        } catch {
          navigate('/select-language');
        }
      } else {
        navigate('/select-language');
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="splash-screen">
      <div className="splash-background">

        {/* ── Terrain sportif en fond ── */}
        <div className="splash-field-lines">
          <div className="field-line field-line--center" />
          <div className="field-line field-line--left" />
          <div className="field-line field-line--right" />
          <div className="field-circle" />
        </div>

        {/* ── Contenu centré ── */}
        <div className="splash-content">

          {/* Animation des silhouettes sportives orbitantes */}
          <SportAnimation />

          {/* Titre "EVENT" */}
          <h1 className="splash-title">
            <span className="title-e">E</span>
            <span className="title-v">V</span>
            <span className="title-e2">E</span>
            <span className="title-n">N</span>
            <span className="title-t">T</span>
          </h1>

          <p className="splash-tagline">Plateforme Sportive</p>

          {/* ── Nom : lettres qui se rassemblent ── */}
          <div className="splash-name-block">
            {/* Ligne CHOKRI */}
            <div className="splash-name">
              {CHOKRI.map((l, i) => (
                <span
                  key={i}
                  className="splash-name-letter splash-name-firstname"
                  style={{
                    animationName:     l.anim,
                    animationDelay:    l.delay,
                    animationDuration: '0.65s',
                    animationTimingFunction: 'cubic-bezier(0.22, 1.6, 0.36, 1)',
                    animationFillMode: 'both',
                  }}
                >
                  {l.char}
                </span>
              ))}

              {/* Espace entre prénom et nom */}
              <span className="splash-name-space" />

              {/* Ligne Touhami inline */}
              {TOUHAMI.map((l, i) => (
                <span
                  key={i}
                  className="splash-name-letter splash-name-lastname"
                  style={{
                    animationName:     l.anim,
                    animationDelay:    l.delay,
                    animationDuration: '0.65s',
                    animationTimingFunction: 'cubic-bezier(0.22, 1.6, 0.36, 1)',
                    animationFillMode: 'both',
                  }}
                >
                  {l.char}
                </span>
              ))}
            </div>

            {/* Copyright */}
            <p className="splash-copyright">
              © 2026 CHOKRI Touhami · Tous droits réservés
            </p>
          </div>

          {/* Barre de progression (2 s) */}
          <div className="splash-loader">
            <div className="loader-bar loader-bar--3s" />
          </div>

        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
