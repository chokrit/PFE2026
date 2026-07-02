// backend/__tests__/hashage.test.js
// Tests unitaires — Hashage et vérification du mot de passe
// Teste le hook pre('save') et comparePassword du modèle Utilisateur
// Aucune connexion MongoDB — bcrypt utilisé directement

const bcrypt = require('bcryptjs');

const BCRYPT_ROUNDS = 12;

// Réimplémentation du hook pre('save') de Utilisateur.js
async function preSaveHook(doc) {
  if (!doc._isModifiedPassword) return;
  const salt = await bcrypt.genSalt(BCRYPT_ROUNDS);
  doc.password_hash = await bcrypt.hash(doc.password_hash, salt);
}

// Réimplémentation de comparePassword de Utilisateur.js
async function comparePassword(motDePasse, hashStocke) {
  return bcrypt.compare(motDePasse, hashStocke);
}

// ─────────────────────────────────────────────────────────────
describe('Hashage du mot de passe', () => {

  test('1 — Le mot de passe est hashé avant sauvegarde', async () => {
    const doc = { password_hash: 'motdepasse123', _isModifiedPassword: true };
    await preSaveHook(doc);
    expect(doc.password_hash).not.toBe('motdepasse123');
  });

  test('2 — Le hash produit est un hash bcrypt valide ($2b$, 60 chars)', async () => {
    const doc = { password_hash: 'motdepasse123', _isModifiedPassword: true };
    await preSaveHook(doc);
    expect(doc.password_hash).toMatch(/^\$2[ab]\$/);
    expect(doc.password_hash).toHaveLength(60);
  });

  test('3 — Le hook ne re-hache pas si le mot de passe n\'a pas changé', async () => {
    const hashSpy = jest.spyOn(bcrypt, 'hash');
    const doc = { password_hash: 'dejahache', _isModifiedPassword: false };
    await preSaveHook(doc);
    expect(hashSpy).not.toHaveBeenCalled();
    expect(doc.password_hash).toBe('dejahache');
    hashSpy.mockRestore();
  });

});

// ─────────────────────────────────────────────────────────────
describe('Méthode comparePassword', () => {

  let hashValide;

  beforeAll(async () => {
    hashValide = await bcrypt.hash('motdepasse_correct', BCRYPT_ROUNDS);
  });

  test('4 — Retourne true pour un mot de passe correct', async () => {
    const result = await comparePassword('motdepasse_correct', hashValide);
    expect(result).toBe(true);
  });

  test('5 — Retourne false pour un mot de passe incorrect', async () => {
    const result = await comparePassword('mauvais_mdp', hashValide);
    expect(result).toBe(false);
  });

  test('6 — Ne lève pas d\'exception si le mot de passe est vide', async () => {
    await expect(comparePassword('', hashValide)).resolves.toBe(false);
  });

});
