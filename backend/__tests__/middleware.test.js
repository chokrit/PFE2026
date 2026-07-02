// backend/__tests__/middleware.test.js
// Tests unitaires — Sécurité des accès
// verifyToken, isAdmin, isOrganisateur — tout est mocké, zéro MongoDB

jest.mock('jsonwebtoken');
jest.mock('../models/Utilisateur');

const jwt = require('jsonwebtoken');
const Utilisateur = require('../models/Utilisateur');
const { verifyToken, isAdmin, isOrganisateur } = require('../middleware/auth');

// Fabrique de mocks req/res/next réutilisable
const mockReqResNext = (overrides = {}) => {
  const req = { headers: {}, ...overrides };
  const res = {
    status: jest.fn().mockReturnThis(),
    json:   jest.fn().mockReturnThis(),
  };
  const next = jest.fn();
  return { req, res, next };
};

// ─────────────────────────────────────────────────────────────
describe('verifyToken', () => {

  beforeEach(() => jest.clearAllMocks());

  test('1 — Retourne 401 si aucun header Authorization', async () => {
    const { req, res, next } = mockReqResNext({ headers: {} });
    await verifyToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('2 — Retourne 401 si header Authorization sans "Bearer "', async () => {
    const { req, res, next } = mockReqResNext({
      headers: { authorization: 'montoken_sans_bearer' },
    });
    await verifyToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('3 — Retourne 401 si le token est invalide ou expiré', async () => {
    const { req, res, next } = mockReqResNext({
      headers: { authorization: 'Bearer tokeninvalide' },
    });
    const err = new Error('invalid token');
    err.name = 'JsonWebTokenError';
    jwt.verify.mockImplementation(() => { throw err; });

    await verifyToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('4 — Retourne 401 si l\'utilisateur n\'existe plus en base', async () => {
    const { req, res, next } = mockReqResNext({
      headers: { authorization: 'Bearer tokenvalide' },
    });
    jwt.verify.mockReturnValue({ id: 'userId123' });
    Utilisateur.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });

    await verifyToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('5 — Appelle next() et injecte req.utilisateur si token valide', async () => {
    const fakeUser = { _id: 'userId123', role: 'user', first_name: 'Test' };
    const { req, res, next } = mockReqResNext({
      headers: { authorization: 'Bearer tokenvalide' },
    });
    jwt.verify.mockReturnValue({ id: 'userId123' });
    Utilisateur.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(fakeUser) });

    await verifyToken(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.utilisateur).toEqual(fakeUser);
  });

});

// ─────────────────────────────────────────────────────────────
describe('isAdmin', () => {

  beforeEach(() => jest.clearAllMocks());

  test('6 — Retourne 401 si req.utilisateur est absent', () => {
    const { req, res, next } = mockReqResNext();
    isAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('7 — Retourne 403 si le rôle n\'est pas admin', () => {
    const { req, res, next } = mockReqResNext();
    req.utilisateur = { role: 'user' };
    isAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('8 — Appelle next() si le rôle est admin', () => {
    const { req, res, next } = mockReqResNext();
    req.utilisateur = { role: 'admin' };
    isAdmin(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

});

// ─────────────────────────────────────────────────────────────
describe('isOrganisateur', () => {

  beforeEach(() => jest.clearAllMocks());

  test('9 — Retourne 403 si le rôle est user', () => {
    const { req, res, next } = mockReqResNext();
    req.utilisateur = { role: 'user' };
    isOrganisateur(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('10 — Appelle next() si le rôle est organisateur', () => {
    const { req, res, next } = mockReqResNext();
    req.utilisateur = { role: 'organisateur' };
    isOrganisateur(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('11 — Appelle next() si le rôle est admin (les deux rôles autorisés)', () => {
    const { req, res, next } = mockReqResNext();
    req.utilisateur = { role: 'admin' };
    isOrganisateur(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

});
