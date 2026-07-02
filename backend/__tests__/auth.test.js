// backend/__tests__/auth.test.js
// Tests unitaires — Génération et validation du token JWT
// Utilise utils/token.js (genererToken extraite)
// JWT_SECRET fixe pour les tests — jamais de vraie base de données

process.env.JWT_SECRET = 'secret_de_test_jest_sprint1';

const jwt = require('jsonwebtoken');
const { genererToken } = require('../utils/token');

const SECRET = process.env.JWT_SECRET;

// ─────────────────────────────────────────────────────────────
describe('genererToken', () => {

  test('1 — Génère un token non vide', () => {
    const token = genererToken('userId123');
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  test('2 — Le token contient l\'id de l\'utilisateur', () => {
    const token = genererToken('userId123');
    const decoded = jwt.verify(token, SECRET);
    expect(decoded.id).toBe('userId123');
  });

  test('3 — Le token expire dans exactement 7 jours (604800 secondes)', () => {
    const token = genererToken('userId123');
    const decoded = jwt.verify(token, SECRET);
    const duree = decoded.exp - decoded.iat;
    expect(duree).toBe(7 * 24 * 3600); // 604800
  });

  test('4 — Un token signé avec un mauvais secret est rejeté', () => {
    const tokenInvalide = jwt.sign({ id: 'userId123' }, 'mauvais_secret', { expiresIn: '7d' });
    expect(() => jwt.verify(tokenInvalide, SECRET)).toThrow();
  });

  test('5 — Deux appels successifs produisent des tokens valides avec le même id', () => {
    const token1 = genererToken('userId123');
    const token2 = genererToken('userId123');
    const d1 = jwt.decode(token1);
    const d2 = jwt.decode(token2);
    expect(d1.id).toBe('userId123');
    expect(d2.id).toBe('userId123');
    expect(typeof token1).toBe('string');
    expect(typeof token2).toBe('string');
  });

});
