// Coefficients algorithme recommandation IA
const COEFF_RECO = {
    affinite_categorie: 0.35,
    presence_sociale: 0.30,
    reputation: 0.20,
    fiabilite: 0.15,
};

// Coefficients algorithme formation d'équipes
const COEFF_EQUIPE = {
    partenariat: 0.40,
    likes: 0.20,
    note_collab: 0.25,
    niveau: 0.15,
};

// Calcul score recommandation
const calculerScoreReco = (affinite, sociale, reputation, fiabilite) => {
    return (
        affinite * COEFF_RECO.affinite_categorie +
        sociale * COEFF_RECO.presence_sociale +
        reputation * COEFF_RECO.reputation +
        fiabilite * COEFF_RECO.fiabilite
    );
};

// Calcul score affinité équipe
const calculerScoreEquipe = (partenariat, likes, note, niveau) => {
    return (
        partenariat * COEFF_EQUIPE.partenariat +
        likes * COEFF_EQUIPE.likes +
        note * COEFF_EQUIPE.note_collab +
        niveau * COEFF_EQUIPE.niveau
    );
};

// Calcul fiabilité utilisateur
const calculerFiabilite = (nbPresences, nbInscriptions) => {
    if (nbInscriptions === 0) return 100;
    return Math.round((nbPresences / nbInscriptions) * 100);
};

describe('Algorithme IA — Recommandations et Équipes', () => {

    test('1 — Somme des coefficients reco = 1.0', () => {
        const somme = Object.values(COEFF_RECO)
            .reduce((acc, v) => acc + v, 0);
        expect(somme).toBeCloseTo(1.0, 5);
    });

    test('2 — Somme des coefficients équipe = 1.0', () => {
        const somme = Object.values(COEFF_EQUIPE)
            .reduce((acc, v) => acc + v, 0);
        expect(somme).toBeCloseTo(1.0, 5);
    });

    test('3 — Score reco compris entre 0 et 1', () => {
        const score = calculerScoreReco(0.8, 0.6, 0.7, 0.9);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
    });

    test('4 — Score reco maximal si tous les paramètres = 1', () => {
        const score = calculerScoreReco(1, 1, 1, 1);
        expect(score).toBeCloseTo(1.0, 5);
    });

    test('5 — Score reco minimal si tous les paramètres = 0', () => {
        const score = calculerScoreReco(0, 0, 0, 0);
        expect(score).toBe(0);
    });

    test('6 — Score équipe compris entre 0 et 1', () => {
        const score = calculerScoreEquipe(0.9, 0.7, 0.8, 0.6);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
    });

    test('7 — Fiabilité = 100 si toujours présent', () => {
        expect(calculerFiabilite(5, 5)).toBe(100);
    });

    test('8 — Fiabilité = 50 si présent une fois sur deux', () => {
        expect(calculerFiabilite(1, 2)).toBe(50);
    });

    test('9 — Fiabilité = 0 si jamais présent', () => {
        expect(calculerFiabilite(0, 3)).toBe(0);
    });

    test('10 — Fiabilité = 100 si aucune inscription', () => {
        expect(calculerFiabilite(0, 0)).toBe(100);
    });

});