// ============================================================
// AboutOrg.jsx
// Chemin : frontend/src/pages/AboutOrg.jsx
// Route  : /about-org
//
// Page de présentation de l'organisme sportif.
// Accessible sans connexion, depuis le bas de la page Login.
//
// COMMENT REMPLIR CETTE PAGE :
//   Cherchez tous les commentaires "TODO: REMPLACER" ci-dessous
//   et remplacez les valeurs fictives par les vraies informations
//   de votre organisme.
// ============================================================

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import Logo from '../components/Logo';

const AboutOrg = () => {
    const { t, isRTL } = useLanguage();
    const [activeSection, setActiveSection] = useState('presentation');

    // ══════════════════════════════════════════════════════════════
    // TODO: REMPLACER — Informations de l'organisme
    // Ces données peuvent aussi venir d'une API :
    //   GET /api/organisation  (à créer dans le backend)
    // ══════════════════════════════════════════════════════════════
    const ORGANISME = {
        nom: 'TODO: Nom de votre organisme',
        sousNom: 'TODO: Sous-titre ou slogan',
        anneeCreation: 'TODO: Année de création (ex: 2018)',
        description: "TODO: Décrivez votre organisme en 2-3 phrases. Qui êtes-vous ? Que faites-vous ?",
        mission: "TODO: Décrivez votre mission. Ex: Promouvoir la pratique sportive pour tous les citoyens.",
        vision: "TODO: Décrivez votre vision à long terme.",

        // TODO: Remplacer par les vraies statistiques
        stats: [
            { valeur: 'TODO', label: 'Membres actifs' },
            { valeur: 'TODO', label: 'Événements/an' },
            { valeur: 'TODO', label: 'Années d\'expérience' },
            { valeur: 'TODO', label: 'Villes couvertes' },
        ],

        // TODO: Ajouter les vrais membres de l'équipe
        // Pour chaque membre : photo (URL), nom, poste, description
        equipe: [
            {
                id: 1,
                nom: 'TODO: Nom Prénom',
                poste: 'TODO: Président / Directeur',
                initiales: 'TP',
                couleur: '#00d4ff',
                // TODO: photo: 'https://votre-cdn.com/photo-membre-1.jpg',
                description: 'TODO: Courte biographie du membre.',
            },
            {
                id: 2,
                nom: 'TODO: Nom Prénom',
                poste: 'TODO: Responsable technique',
                initiales: 'TP',
                couleur: '#ff6b00',
                description: 'TODO: Courte biographie du membre.',
            },
            {
                id: 3,
                nom: 'TODO: Nom Prénom',
                poste: 'TODO: Coordinateur événements',
                initiales: 'TP',
                couleur: '#00e676',
                description: 'TODO: Courte biographie du membre.',
            },
            // TODO: Ajouter d'autres membres si nécessaire
        ],

        // TODO: Remplacer par les vrais partenaires
        partenaires: [
            { id: 1, nom: 'TODO: Partenaire 1', type: 'Sponsor principal' },
            { id: 2, nom: 'TODO: Partenaire 2', type: 'Partenaire institutionnel' },
            { id: 3, nom: 'TODO: Partenaire 3', type: 'Sponsor' },
            // TODO: Ajouter les logos : logo: 'https://...'
        ],

        // TODO: Remplir l'historique de l'organisme
        historique: [
            {
                annee: 'TODO: Année',
                titre: 'TODO: Titre de l\'événement marquant',
                description: 'TODO: Description de cet événement fondateur.',
            },
            {
                annee: 'TODO: Année',
                titre: 'TODO: Étape importante',
                description: 'TODO: Description de cette étape.',
            },
            // TODO: Ajouter d'autres jalons
        ],
    };
    // ══════════════════════════════════════════════════════════════

    const sections = [
        { key: 'presentation', label: 'Présentation' },
        { key: 'equipe', label: t('team') },
        { key: 'partenaires', label: t('partners') },
        { key: 'historique', label: t('history') },
    ];

    return (
        <div className={`login-page ${isRTL ? 'rtl' : ''}`} style={{
            minHeight: '100vh', background: '#0a0a1a',
            display: 'block', padding: 0,
        }}>

            <div className="lang-switcher-top"><LanguageSwitcher /></div>

            {/* ── HERO ── */}
            <div style={{
                background: 'linear-gradient(135deg, #12122a 0%, #1a1a3e 100%)',
                borderBottom: '1px solid #2a2a4a',
                padding: '3rem 1.5rem 2rem',
                textAlign: 'center',
            }}>
                {/* TODO: Remplacer le Logo par le logo officiel de l'organisme
            <img src="/logo-organisme.png" alt="Logo" style={{ height: '80px' }} />
        */}
                <Logo size={70} color="#00d4ff" />

                <h1 style={{
                    fontSize: 'clamp(22px,5vw,36px)', fontWeight: 900,
                    color: '#e8e8f0', marginTop: '1rem', marginBottom: '8px'
                }}>
                    {ORGANISME.nom}
                </h1>
                <p style={{ color: '#8888aa', fontSize: '15px', marginBottom: '1.5rem' }}>
                    {ORGANISME.sousNom}
                </p>

                {/* Stats rapides */}
                <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
                    {ORGANISME.stats.map((stat, i) => (
                        <div key={i} style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '24px', fontWeight: 800, color: '#00d4ff' }}>{stat.valeur}</div>
                            <div style={{ fontSize: '11px', color: '#8888aa' }}>{stat.label}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── NAVIGATION SECTIONS ── */}
            <div style={{
                display: 'flex', gap: '4px', padding: '0 1.5rem',
                borderBottom: '1px solid #2a2a4a', overflowX: 'auto',
                background: 'rgba(18,18,42,0.8)',
            }}>
                {sections.map(s => (
                    <button key={s.key}
                        onClick={() => setActiveSection(s.key)}
                        style={{
                            padding: '14px 20px', background: 'none', border: 'none',
                            borderBottom: `2px solid ${activeSection === s.key ? '#00d4ff' : 'transparent'}`,
                            color: activeSection === s.key ? '#00d4ff' : '#8888aa',
                            fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                            whiteSpace: 'nowrap', transition: 'color .2s',
                            fontFamily: 'Poppins, sans-serif',
                        }}>
                        {s.label}
                    </button>
                ))}
            </div>

            {/* ── CONTENU ── */}
            <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1.5rem' }}>

                {/* ── PRÉSENTATION ── */}
                {activeSection === 'presentation' && (
                    <div>
                        <p style={{
                            color: '#e8e8f0', fontSize: '15px', lineHeight: 1.8,
                            marginBottom: '2rem'
                        }}>
                            {ORGANISME.description}
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            {/* Mission */}
                            <div style={{
                                background: '#12122a', border: '1px solid #2a2a4a',
                                borderLeft: '3px solid #00d4ff', borderRadius: '0 12px 12px 0',
                                padding: '1.25rem'
                            }}>
                                <h3 style={{
                                    color: '#00d4ff', fontSize: '14px', fontWeight: 600,
                                    marginBottom: '8px'
                                }}>{t('mission')}</h3>
                                <p style={{ color: '#8888aa', fontSize: '13px', lineHeight: 1.7 }}>
                                    {ORGANISME.mission}
                                </p>
                            </div>

                            {/* Vision */}
                            <div style={{
                                background: '#12122a', border: '1px solid #2a2a4a',
                                borderLeft: '3px solid #ff6b00', borderRadius: '0 12px 12px 0',
                                padding: '1.25rem'
                            }}>
                                <h3 style={{
                                    color: '#ff6b00', fontSize: '14px', fontWeight: 600,
                                    marginBottom: '8px'
                                }}>{t('vision')}</h3>
                                <p style={{ color: '#8888aa', fontSize: '13px', lineHeight: 1.7 }}>
                                    {ORGANISME.vision}
                                </p>
                            </div>
                        </div>

                        {/* TODO: Ajouter une galerie photos de l'organisme */}
                        {/* TODO: Ajouter les réseaux sociaux (Facebook, Instagram, Twitter) */}
                    </div>
                )}

                {/* ── ÉQUIPE ── */}
                {activeSection === 'equipe' && (
                    <div>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px'
                        }}>
                            {ORGANISME.equipe.map(membre => (
                                <div key={membre.id} style={{
                                    background: '#12122a',
                                    border: '1px solid #2a2a4a', borderRadius: '14px',
                                    padding: '1.5rem', textAlign: 'center'
                                }}>

                                    {/* Avatar ou photo */}
                                    {/* TODO: Quand les photos sont disponibles, remplacer l'avatar par :
                      <img src={membre.photo} alt={membre.nom}
                        style={{ width:'80px', height:'80px', borderRadius:'50%', objectFit:'cover' }} />
                  */}
                                    <div style={{
                                        width: '70px', height: '70px', borderRadius: '50%',
                                        background: `${membre.couleur}22`,
                                        border: `2px solid ${membre.couleur}44`,
                                        margin: '0 auto 12px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '20px', fontWeight: 700, color: membre.couleur,
                                    }}>
                                        {membre.initiales}
                                    </div>

                                    <h3 style={{
                                        fontSize: '15px', fontWeight: 600,
                                        color: '#e8e8f0', marginBottom: '4px'
                                    }}>{membre.nom}</h3>
                                    <p style={{
                                        fontSize: '12px', color: membre.couleur,
                                        fontWeight: 500, marginBottom: '8px'
                                    }}>{membre.poste}</p>
                                    <p style={{ fontSize: '12px', color: '#8888aa', lineHeight: 1.6 }}>
                                        {membre.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                        {/* TODO: Ajouter pagination si beaucoup de membres */}
                    </div>
                )}

                {/* ── PARTENAIRES ── */}
                {activeSection === 'partenaires' && (
                    <div>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px'
                        }}>
                            {ORGANISME.partenaires.map(p => (
                                <div key={p.id} style={{
                                    background: '#12122a',
                                    border: '1px solid #2a2a4a', borderRadius: '12px',
                                    padding: '1.5rem', textAlign: 'center',
                                    display: 'flex', flexDirection: 'column',
                                    alignItems: 'center', gap: '8px'
                                }}>

                                    {/* TODO: Remplacer par le vrai logo du partenaire :
                      <img src={p.logo} alt={p.nom}
                        style={{ height:'50px', objectFit:'contain' }} />
                  */}
                                    <div style={{
                                        width: '60px', height: '60px',
                                        background: '#1a1a35', borderRadius: '8px',
                                        display: 'flex', alignItems: 'center',
                                        justifyContent: 'center', fontSize: '24px'
                                    }}>
                                        🤝
                                    </div>

                                    <h4 style={{
                                        fontSize: '14px', fontWeight: 600,
                                        color: '#e8e8f0'
                                    }}>{p.nom}</h4>
                                    <span style={{
                                        fontSize: '11px', color: '#8888aa',
                                        background: '#1a1a35', padding: '3px 10px',
                                        borderRadius: '999px'
                                    }}>{p.type}</span>
                                </div>
                            ))}
                        </div>
                        {/* TODO: Ajouter un formulaire "Devenir partenaire" */}
                    </div>
                )}

                {/* ── HISTORIQUE ── */}
                {activeSection === 'historique' && (
                    <div>
                        {/* Timeline verticale */}
                        <div style={{ position: 'relative', paddingLeft: '30px' }}>
                            {/* Ligne verticale */}
                            <div style={{
                                position: 'absolute', left: '10px', top: 0, bottom: 0,
                                width: '2px', background: '#2a2a4a'
                            }} />

                            {ORGANISME.historique.map((item, i) => (
                                <div key={i} style={{ position: 'relative', marginBottom: '2rem' }}>
                                    {/* Point sur la timeline */}
                                    <div style={{
                                        position: 'absolute', left: '-24px', top: '4px',
                                        width: '12px', height: '12px', borderRadius: '50%',
                                        background: '#00d4ff', border: '2px solid #0a0a1a'
                                    }} />

                                    <div style={{
                                        background: '#12122a', border: '1px solid #2a2a4a',
                                        borderRadius: '12px', padding: '1.25rem'
                                    }}>
                                        <span style={{
                                            fontSize: '12px', color: '#00d4ff',
                                            fontWeight: 700, marginBottom: '4px', display: 'block'
                                        }}>
                                            {item.annee}
                                        </span>
                                        <h4 style={{
                                            fontSize: '14px', fontWeight: 600,
                                            color: '#e8e8f0', marginBottom: '6px'
                                        }}>{item.titre}</h4>
                                        <p style={{
                                            fontSize: '13px', color: '#8888aa',
                                            lineHeight: 1.6, margin: 0
                                        }}>{item.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

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

export default AboutOrg;