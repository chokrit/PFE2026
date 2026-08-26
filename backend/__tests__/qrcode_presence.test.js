const crypto = require('crypto');

// Simulation génération QR token
const genererQRToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

// Simulation validation du scan
const validerScan = (evenement, heureActuelle) => {
    const debut = new Date(evenement.ev_start_time);
    const fin = new Date(evenement.ev_end_time);
    const scan = new Date(heureActuelle);
    const memeJour =
        scan.toDateString() === debut.toDateString();
    return memeJour && scan >= debut && scan <= fin;
};

// Simulation confirmation de présence
const confirmerPresence = (participation) => {
    if (participation.qr_utilise) return false;
    if (!participation.qr_token) return false;
    participation.is_present = true;
    participation.qr_utilise = true;
    return true;
};

describe('QR Code et Gestion de Présence', () => {

    test('1 — QR token généré est une chaîne non vide', () => {
        const token = genererQRToken();
        expect(typeof token).toBe('string');
        expect(token.length).toBeGreaterThan(0);
    });

    test('2 — Deux tokens générés sont différents', () => {
        const t1 = genererQRToken();
        const t2 = genererQRToken();
        expect(t1).not.toBe(t2);
    });

    test('3 — QR token fait 64 caractères hexadécimaux', () => {
        const token = genererQRToken();
        expect(token).toMatch(/^[a-f0-9]{64}$/);
    });

    test('4 — Scan valide dans la plage horaire', () => {
        const ev = {
            ev_start_time: new Date(Date.now() - 30 * 60000).toISOString(),
            ev_end_time: new Date(Date.now() + 90 * 60000).toISOString(),
        };
        const maintenant = new Date().toISOString();
        expect(validerScan(ev, maintenant)).toBe(true);
    });

    test('5 — Scan refusé avant le début de l\'événement', () => {
        const ev = {
            ev_start_time: new Date(Date.now() + 2 * 3600000).toISOString(),
            ev_end_time: new Date(Date.now() + 4 * 3600000).toISOString(),
        };
        const maintenant = new Date().toISOString();
        expect(validerScan(ev, maintenant)).toBe(false);
    });

    test('6 — Scan refusé après la fin de l\'événement', () => {
        const ev = {
            ev_start_time: new Date(Date.now() - 4 * 3600000).toISOString(),
            ev_end_time: new Date(Date.now() - 1 * 3600000).toISOString(),
        };
        const maintenant = new Date().toISOString();
        expect(validerScan(ev, maintenant)).toBe(false);
    });

    test('7 — Présence confirmée au premier scan', () => {
        const participation = {
            qr_token: genererQRToken(),
            qr_utilise: false,
            is_present: false,
        };
        const result = confirmerPresence(participation);
        expect(result).toBe(true);
        expect(participation.is_present).toBe(true);
        expect(participation.qr_utilise).toBe(true);
    });

    test('8 — Deuxième scan refusé (QR déjà utilisé)', () => {
        const participation = {
            qr_token: genererQRToken(),
            qr_utilise: true,
            is_present: true,
        };
        const result = confirmerPresence(participation);
        expect(result).toBe(false);
    });

});