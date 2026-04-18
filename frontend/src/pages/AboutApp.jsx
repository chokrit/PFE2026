// ============================================================
// AboutApp.jsx
// Chemin : frontend/src/pages/AboutApp.jsx
// Route  : /about-app
//
// Page de présentation de l'application EVENT.
// Accessible sans connexion, depuis le bas de la page Login.
// ============================================================

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import Logo from '../components/Logo';

const AboutApp = () => {
    const { t, isRTL } = useLanguage();
    const [activeFeature, setActiveFeature] = useState(0);

    // ══════════════════════════════════════════════════════════════
    // TODO: REMPLACER — Contenu de la page application
    // ══════════════════════════════════════════════════════════════

    // Version actuelle de l'application
    // TODO: Mettre à jour à chaque release
    const VERSION = 'TODO: 1.0.0';
    const DATE_VERSION = 'TODO: Date de sortie';

    // Fonctionnalités principales
    const FEATURES = [
        {
            icon: '🏟',
            titre: 'Événements sportifs',
            description: 'Découvrez et inscrivez-vous aux événements sportifs organisés près de chez vous.',
            // TODO: Ajouter un screenshot de la page événements
            // screenshot: '/screenshots/events.png',
        },
        {
            icon: '📱',
            titre: 'QR Code de présence',
            description: 'Validez votre présence sur place en un scan grâce à votre QR code personnel.',
            // TODO: screenshot: '/screenshots/qrcode.png',
        },
        {
            icon: '⚡',
            titre: 'Points et récompenses',
            description: 'Accumulez des points à chaque participation et débloquez des coupons de réduction.',
            // TODO: screenshot: '/screenshots/rewards.png',
        },
        {
            icon: '🌍',
            titre: 'Multilingue',
            description: 'Application disponible en français, anglais, arabe standard et arabe tunisien.',
            // TODO: screenshot: '/screenshots/languages.png',
        },
        // TODO: Ajouter d'autres fonctionnalités selon l'avancement du projet
    ];

    // Étapes du tutoriel
    const ETAPES = [
        {
            numero: '1',
            titre: 'Créez votre compte',
            description: "Inscrivez-vous avec votre email et choisissez votre profil sportif.",
        },
        {
            numero: '2',
            titre: 'Explorez les événements',
            description: 'Parcourez les événements disponibles et inscrivez-vous en un clic.',
        },
        {
            numero: '3',
            titre: 'Participez et scannez',
            description: 'Le jour J, présentez votre QR code pour valider votre présence.',
        },
        {
            numero: '4',
            titre: 'Gagnez des récompenses',
            description: 'Cumulez des points et obtenez des coupons de réduction exclusifs.',
        },
    ];

    // Changelog
    // TODO: Mettre à jour à chaque nouvelle version
    const CHANGELOG = [
        {
            version: 'TODO: 1.0.0',
            date: 'TODO: Date',
            changes: [
                'TODO: Lancement de l\'application',
                'TODO: Inscription et connexion utilisateur',
                'TODO: Système QR code de présence',
                'TODO: Tableau de bord utilisateur',
            ],
        },
        // TODO: Ajouter les versions futures ici
        // {
        //   version: '1.1.0',
        //   date: 'TODO',
        //   changes: ['TODO: Nouvelle fonctionnalité', '...'],
        // },
    ];
    // ══════════════════════════════════════════════════════════════

    return (
        <div className={`login-page ${isRTL ? 'rtl' : ''}`} style={{
            minHeight: '100vh', background: '#0a0a1a',
            display: 'block', padding: 0,
        }}>

            <div className="lang-switcher-top"><LanguageSwitcher /></div>

            {/* ── HERO ── */}
            <div style={{
                background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a3e 50%, #0a1a2a 100%)',
                padding: '3rem 1.5rem 2.5rem', textAlign: 'center',
                borderBottom: '1px solid #2a2a4a',
            }}>
                <Logo size={80} color="#00d4ff" />

                <h1 style={{
                    fontSize: 'clamp(24px,6vw,42px)', fontWeight: 900,
                    color: '#e8e8f0', marginTop: '1rem', letterSpacing: '0.05em'
                }}>
                    {t('aboutAppTitle')}
                </h1>

                <p style={{
                    color: '#8888aa', fontSize: '15px', marginTop: '8px',
                    marginBottom: '2rem', maxWidth: '500px', margin: '8px auto 2rem',
                    lineHeight: 1.6
                }}>
                    {/* TODO: Écrire une courte description de l'application */}
                    TODO: Décrivez l'application en une ou deux phrases percutantes.
                </p>

                <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.3)',
                    borderRadius: '999px', padding: '6px 16px'
                }}>
                    <span style={{ color: '#00d4ff', fontSize: '12px', fontWeight: 600 }}>
                        {t('version')} {VERSION}
                    </span>
                    <span style={{ color: '#8888aa', fontSize: '11px' }}>• {DATE_VERSION}</span>
                </div>
            </div>

            <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1.5rem' }}>

                {/* ── FONCTIONNALITÉS ── */}
                <section style={{ marginBottom: '3rem' }}>
                    <h2 style={{
                        fontSize: '20px', fontWeight: 700, color: '#e8e8f0',
                        marginBottom: '1.5rem'
                    }}>{t('features')}</h2>

                    {/* Sélecteur de feature */}
                    <div style={{
                        display: 'flex', gap: '8px', flexWrap: 'wrap',
                        marginBottom: '1.5rem'
                    }}>
                        {FEATURES.map((f, i) => (
                            <button key={i}
                                onClick={() => setActiveFeature(i)}
                                style={{
                                    padding: '8px 16px', border: '1px solid',
                                    borderColor: activeFeature === i ? '#00d4ff' : '#2a2a4a',
                                    borderRadius: '8px', cursor: 'pointer',
                                    background: activeFeature === i ? 'rgba(0,212,255,0.1)' : '#12122a',
                                    color: activeFeature === i ? '#00d4ff' : '#8888aa',
                                    fontSize: '13px', fontWeight: 500, transition: 'all .2s',
                                    fontFamily: 'Poppins, sans-serif',
                                }}>
                                {f.icon} {f.titre}
                            </button>
                        ))}
                    </div>

                    {/* Détail de la feature sélectionnée */}
                    <div style={{
                        background: '#12122a', border: '1px solid #2a2a4a',
                        borderRadius: '16px', padding: '2rem', minHeight: '200px',
                        display: 'flex', flexDirection: 'column', gap: '1rem'
                    }}>
                        <div style={{ fontSize: '48px' }}>{FEATURES[activeFeature].icon}</div>
                        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#00d4ff' }}>
                            {FEATURES[activeFeature].titre}
                        </h3>
                        <p style={{ color: '#8888aa', fontSize: '14px', lineHeight: 1.7 }}>
                            {FEATURES[activeFeature].description}
                        </p>
                        {/* TODO: Afficher le screenshot ici quand disponible
            {FEATURES[activeFeature].screenshot && (
              <img src={FEATURES[activeFeature].screenshot}
                alt={FEATURES[activeFeature].titre}
                style={{ borderRadius: '8px', maxWidth: '100%', border: '1px solid #2a2a4a' }}
              />
            )}
            */}
                        <div style={{
                            background: '#1a1a35', borderRadius: '8px',
                            padding: '1rem', border: '1px dashed #2a2a4a',
                            color: '#8888aa', fontSize: '12px', textAlign: 'center'
                        }}>
                            📸 TODO: Ajouter un screenshot de cette fonctionnalité
                        </div>
                    </div>
                </section>

                {/* ── COMMENT ÇA MARCHE ── */}
                <section style={{ marginBottom: '3rem' }}>
                    <h2 style={{
                        fontSize: '20px', fontWeight: 700, color: '#e8e8f0',
                        marginBottom: '1.5rem'
                    }}>{t('howItWorks')}</h2>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px'
                    }}>
                        {ETAPES.map((etape, i) => (
                            <div key={i} style={{
                                background: '#12122a',
                                border: '1px solid #2a2a4a', borderRadius: '14px',
                                padding: '1.5rem', textAlign: 'center', position: 'relative'
                            }}>
                                <div style={{
                                    width: '40px', height: '40px', borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #00d4ff, #0088cc)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    margin: '0 auto 12px', fontSize: '18px', fontWeight: 900,
                                    color: '#0a0a1a',
                                }}>
                                    {etape.numero}
                                </div>
                                <h4 style={{
                                    fontSize: '14px', fontWeight: 600,
                                    color: '#e8e8f0', marginBottom: '8px'
                                }}>{etape.titre}</h4>
                                <p style={{ fontSize: '12px', color: '#8888aa', lineHeight: 1.6 }}>
                                    {etape.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── TÉLÉCHARGEMENT MOBILE ── */}
                {/* TODO: Activer quand l'app mobile sera disponible */}
                <section style={{ marginBottom: '3rem' }}>
                    <div style={{
                        background: '#12122a', border: '1px solid #2a2a4a',
                        borderRadius: '16px', padding: '2rem', textAlign: 'center'
                    }}>
                        <h2 style={{
                            fontSize: '18px', fontWeight: 700,
                            color: '#e8e8f0', marginBottom: '8px'
                        }}>{t('downloadApp')}</h2>
                        <p style={{ color: '#8888aa', fontSize: '13px', marginBottom: '1.5rem' }}>
                            {t('comingSoon')} — Application mobile en cours de développement.
                        </p>
                        {/* TODO: Quand l'app mobile sera prête, remplacer par :
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <a href="TODO: Lien App Store" target="_blank" rel="noopener noreferrer">
                <img src="/badges/app-store.png" alt="App Store" height="44" />
              </a>
              <a href="TODO: Lien Google Play" target="_blank" rel="noopener noreferrer">
                <img src="/badges/google-play.png" alt="Google Play" height="44" />
              </a>
            </div>
            */}
                        <div style={{
                            display: 'inline-block', background: '#1a1a35',
                            border: '1px dashed #2a2a4a', borderRadius: '8px',
                            padding: '10px 20px', color: '#8888aa', fontSize: '13px'
                        }}>
                            📱 TODO: Liens App Store et Google Play
                        </div>
                    </div>
                </section>

                {/* ── CHANGELOG ── */}
                <section style={{ marginBottom: '2rem' }}>
                    <h2 style={{
                        fontSize: '20px', fontWeight: 700,
                        color: '#e8e8f0', marginBottom: '1.5rem'
                    }}>
                        Historique des versions
                    </h2>
                    {CHANGELOG.map((v, i) => (
                        <div key={i} style={{
                            background: '#12122a',
                            border: '1px solid #2a2a4a', borderRadius: '12px',
                            padding: '1.25rem', marginBottom: '12px'
                        }}>
                            <div style={{
                                display: 'flex', justifyContent: 'space-between',
                                alignItems: 'center', marginBottom: '10px'
                            }}>
                                <span style={{
                                    background: 'rgba(0,212,255,0.15)',
                                    color: '#00d4ff', fontWeight: 700, fontSize: '13px',
                                    padding: '3px 10px', borderRadius: '6px'
                                }}>
                                    v{v.version}
                                </span>
                                <span style={{ color: '#8888aa', fontSize: '12px' }}>{v.date}</span>
                            </div>
                            <ul style={{
                                margin: 0, paddingLeft: isRTL ? 0 : '16px',
                                paddingRight: isRTL ? '16px' : 0
                            }}>
                                {v.changes.map((c, j) => (
                                    <li key={j} style={{
                                        color: '#8888aa', fontSize: '13px',
                                        lineHeight: 2
                                    }}>{c}</li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </section>

            </div>

            {/* ── PIED DE PAGE ── */}
            <div style={{
                textAlign: 'center', padding: '1.5rem',
                borderTop: '1px solid #2a2a4a'
            }}>
                <Link to="/login" style={{
                    color: '#8888aa', fontSize: '13px',
                    textDecoration: 'none'
                }}>
                    ← {t('backToLogin')}
                </Link>
            </div>
        </div>
    );
};

export default AboutApp;