// ============================================================
// components/stats/PeriodeSelector.jsx
//
// Sélecteur de période pour les statistiques admin.
// Placé en haut du dashboard statistiques, il contrôle
// TOUTES les statistiques affichées sur la page.
//
// Props :
//   onPeriodeChange(dateDebut, dateFin, periode) → callback
//     appelé dès qu'une nouvelle période est sélectionnée
//   periodeActive : string — code de la période active (ex : '30j')
//   periodeInfo   : object — { dateDebut, dateFin, nb_jours } de l'API
//   loading       : bool   — true pendant le chargement des stats
// ============================================================

import React, { useState, useEffect } from 'react';

// Boutons de période rapide
const PERIODES_RAPIDES = [
    { code: '7j',    label: '7 jours'  },
    { code: '30j',   label: '30 jours' },
    { code: '90j',   label: '3 mois'   },
    { code: '6mois', label: '6 mois'   },
    { code: '1an',   label: '1 an'     },
];

// Formater une date ISO (YYYY-MM-DD) en format lisible fr (JJ/MM/AAAA)
const fmtDateFr = (isoStr) => {
    if (!isoStr) return '—';
    const [y, m, d] = isoStr.split('-');
    return `${d}/${m}/${y}`;
};

// Calculer les bornes en local pour l'affichage immédiat sous les boutons
const calcBornesLocales = (code) => {
    const fmt = (d) => d.toISOString().split('T')[0];
    const fin   = new Date();
    const debut = new Date();
    switch (code) {
        case '7j':    debut.setDate(debut.getDate() - 7);      break;
        case '30j':   debut.setDate(debut.getDate() - 30);     break;
        case '90j':   debut.setDate(debut.getDate() - 90);     break;
        case '6mois': debut.setMonth(debut.getMonth() - 6);    break;
        case '1an':   debut.setFullYear(debut.getFullYear()-1); break;
        default:      debut.setDate(debut.getDate() - 30);     break;
    }
    return { dateDebut: fmt(debut), dateFin: fmt(fin) };
};

const PeriodeSelector = ({ onPeriodeChange, periodeActive = '30j', periodeInfo, loading }) => {
    // Mode personnalisé — affiche les deux inputs date
    const [modePerso, setModePerso] = useState(periodeActive === 'personnalisee');

    // Valeurs locales des inputs date (mode personnalisé)
    const [dateDebutInput, setDateDebutInput] = useState('');
    const [dateFinInput, setDateFinInput]     = useState('');

    // Erreur de validation (dateDebut > dateFin)
    const [erreur, setErreur] = useState('');

    // Horodatage de la dernière mise à jour (pour afficher "il y a X min")
    const [derniereMaj, setDerniereMaj] = useState(Date.now());

    // Mettre à jour l'horodatage quand periodeInfo change (= nouvelles données chargées)
    useEffect(() => {
        if (periodeInfo) setDerniereMaj(Date.now());
    }, [periodeInfo]);

    // Calculer "il y a X minutes" en temps réel
    const [ageMaj, setAgeMaj] = useState(0);
    useEffect(() => {
        const id = setInterval(() => {
            setAgeMaj(Math.floor((Date.now() - derniereMaj) / 60000));
        }, 30000); // recalcule toutes les 30 secondes
        return () => clearInterval(id);
    }, [derniereMaj]);

    // Clic sur un bouton de période rapide
    const selectionnerPeriode = (code) => {
        setModePerso(false);
        setErreur('');
        const { dateDebut, dateFin } = calcBornesLocales(code);
        onPeriodeChange(dateDebut, dateFin, code);
    };

    // Activer le mode personnalisé
    const activerModePerso = () => {
        setModePerso(true);
        // Pré-remplir avec les bornes actuelles si disponibles
        if (periodeInfo) {
            setDateDebutInput(periodeInfo.dateDebut || '');
            setDateFinInput(periodeInfo.dateFin   || '');
        }
    };

    // Valider et appliquer la période personnalisée
    const appliquerPerso = () => {
        setErreur('');
        if (!dateDebutInput || !dateFinInput) {
            setErreur('Les deux dates sont obligatoires.');
            return;
        }
        if (dateDebutInput > dateFinInput) {
            setErreur('La date de début doit être antérieure à la date de fin.');
            return;
        }
        onPeriodeChange(dateDebutInput, dateFinInput, 'personnalisee');
    };

    // Forcer un rechargement sans cache (param force=1 ajouté côté parent)
    const actualiser = () => {
        if (loading) return;
        if (modePerso && dateDebutInput && dateFinInput) {
            onPeriodeChange(dateDebutInput, dateFinInput, 'personnalisee', true);
        } else {
            const { dateDebut, dateFin } = calcBornesLocales(periodeActive);
            onPeriodeChange(dateDebut, dateFin, periodeActive, true);
        }
    };

    // Infos de la période affichée sous le sélecteur
    const dateDebutAff = periodeInfo?.dateDebut || (periodeActive !== 'personnalisee' ? calcBornesLocales(periodeActive).dateDebut : dateDebutInput);
    const dateFinAff   = periodeInfo?.dateFin   || (periodeActive !== 'personnalisee' ? calcBornesLocales(periodeActive).dateFin   : dateFinInput);
    const nbJours      = periodeInfo?.nb_jours  || '—';

    return (
        <div style={{
            background: '#12122a',
            border: '1px solid #2a2a4a',
            borderRadius: 14,
            padding: '16px 20px',
            marginBottom: 24,
        }}>
            {/* Titre */}
            <div style={{ fontSize: 13, fontWeight: 700, color: '#8888aa', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Période d'analyse
            </div>

            {/* Boutons de période rapide */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: modePerso ? 14 : 0 }}>
                {PERIODES_RAPIDES.map(({ code, label }) => {
                    const actif = !modePerso && periodeActive === code;
                    return (
                        <button
                            key={code}
                            onClick={() => selectionnerPeriode(code)}
                            disabled={loading}
                            style={{
                                padding: '6px 16px',
                                borderRadius: 999,
                                fontSize: 13,
                                fontWeight: actif ? 700 : 400,
                                cursor: loading ? 'not-allowed' : 'pointer',
                                fontFamily: 'Poppins, sans-serif',
                                border: '1px solid',
                                borderColor:  actif ? '#00d4ff' : '#2a2a4a',
                                background:   actif ? 'rgba(0,212,255,.15)' : 'transparent',
                                color:        actif ? '#00d4ff' : '#8888aa',
                                transition: 'all .15s',
                            }}
                        >
                            {label}
                        </button>
                    );
                })}

                {/* Bouton Personnalisée */}
                <button
                    onClick={activerModePerso}
                    disabled={loading}
                    style={{
                        padding: '6px 16px',
                        borderRadius: 999,
                        fontSize: 13,
                        fontWeight: modePerso ? 700 : 400,
                        cursor: loading ? 'not-allowed' : 'pointer',
                        fontFamily: 'Poppins, sans-serif',
                        border: '1px solid',
                        borderColor:  modePerso ? '#a78bfa' : '#2a2a4a',
                        background:   modePerso ? 'rgba(167,139,250,.15)' : 'transparent',
                        color:        modePerso ? '#a78bfa' : '#8888aa',
                        transition: 'all .15s',
                    }}
                >
                    Personnalisée
                </button>
            </div>

            {/* Inputs date (mode personnalisé seulement) */}
            {modePerso && (
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginTop: 10, marginBottom: 4 }}>
                    <div>
                        <label style={{ fontSize: 11, color: '#8888aa', display: 'block', marginBottom: 4 }}>Du</label>
                        <input
                            type="date"
                            value={dateDebutInput}
                            onChange={e => { setDateDebutInput(e.target.value); setErreur(''); }}
                            style={{
                                background: '#0a0a1a', color: '#e8e8f0',
                                border: '1px solid #2a2a4a', borderRadius: 8,
                                padding: '7px 12px', fontFamily: 'Poppins, sans-serif', fontSize: 13,
                            }}
                        />
                    </div>
                    <div>
                        <label style={{ fontSize: 11, color: '#8888aa', display: 'block', marginBottom: 4 }}>Au</label>
                        <input
                            type="date"
                            value={dateFinInput}
                            onChange={e => { setDateFinInput(e.target.value); setErreur(''); }}
                            style={{
                                background: '#0a0a1a', color: '#e8e8f0',
                                border: '1px solid #2a2a4a', borderRadius: 8,
                                padding: '7px 12px', fontFamily: 'Poppins, sans-serif', fontSize: 13,
                            }}
                        />
                    </div>
                    <button
                        onClick={appliquerPerso}
                        disabled={loading || !dateDebutInput || !dateFinInput}
                        style={{
                            padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                            cursor: (loading || !dateDebutInput || !dateFinInput) ? 'not-allowed' : 'pointer',
                            background: 'rgba(167,139,250,.2)', color: '#a78bfa',
                            border: '1px solid rgba(167,139,250,.4)',
                            fontFamily: 'Poppins, sans-serif', opacity: loading ? 0.5 : 1,
                        }}
                    >
                        Appliquer
                    </button>
                    {erreur && (
                        <span style={{ fontSize: 12, color: '#ff4d6d', alignSelf: 'center' }}>
                            ⚠ {erreur}
                        </span>
                    )}
                </div>
            )}

            {/* Bandeau de résumé : période active + fraîcheur du cache */}
            <div style={{
                marginTop: 14,
                padding: '8px 12px',
                background: '#0a0a1a',
                borderRadius: 8,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 8,
            }}>
                <span style={{ fontSize: 12, color: '#8888aa' }}>
                    Données du{' '}
                    <span style={{ color: '#e8e8f0', fontWeight: 600 }}>{fmtDateFr(dateDebutAff)}</span>
                    {' '}au{' '}
                    <span style={{ color: '#e8e8f0', fontWeight: 600 }}>{fmtDateFr(dateFinAff)}</span>
                    {nbJours !== '—' && (
                        <span style={{ color: '#8888aa' }}>{' '}({nbJours} jours)</span>
                    )}
                </span>

                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: '#555577' }}>
                        {loading ? 'Chargement…' : ageMaj === 0 ? 'À l\'instant' : `Mis à jour il y a ${ageMaj} min`}
                    </span>
                    <button
                        onClick={actualiser}
                        disabled={loading}
                        title="Forcer le rechargement (invalide le cache)"
                        style={{
                            background: 'transparent', border: '1px solid #2a2a4a',
                            borderRadius: 6, padding: '4px 10px', cursor: loading ? 'not-allowed' : 'pointer',
                            color: '#8888aa', fontSize: 12, fontFamily: 'Poppins, sans-serif',
                            opacity: loading ? 0.4 : 1,
                        }}
                    >
                        {loading ? '…' : '🔄 Actualiser'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PeriodeSelector;
