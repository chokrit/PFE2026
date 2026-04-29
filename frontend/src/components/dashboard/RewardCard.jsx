// ============================================================
// RewardCard.jsx — Carte coupon + QRModal exportés ensemble
// ============================================================

import React from 'react';

export const RewardCard = ({ recompense, onUtiliser }) => {
  const estExpire = recompense.datefin_coupon && new Date(recompense.datefin_coupon) < new Date();

  return (
    <div className={`reward-card ${recompense.is_redeemed ? 'reward-card--used' : ''} ${estExpire ? 'reward-card--expired' : ''}`}>
      <div className="reward-card__pct">-{recompense.remise_pourcentage}%</div>
      <div className="reward-card__code">{recompense.coupon_code}</div>
      <div className="reward-card__titre">{recompense.titre_recompense}</div>
      {recompense.datefin_coupon && (
        <div className={`reward-card__expiry ${estExpire ? 'expired' : ''}`}>
          {estExpire ? 'Expiré le ' : 'Expire le '}
          {new Date(recompense.datefin_coupon).toLocaleDateString('fr-FR')}
        </div>
      )}
      <div className="reward-card__footer">
        {recompense.is_redeemed ? (
          <span className="badge badge-gray">Utilisé</span>
        ) : estExpire ? (
          <span className="badge badge-danger">Expiré</span>
        ) : (
          <button className="dash-btn-primary reward-card__btn" onClick={onUtiliser}>
            Utiliser ce coupon
          </button>
        )}
      </div>
    </div>
  );
};

export const QRModal = ({ token, titre, qr_utilise, onClose }) => {
  return (
    <div className="dash-overlay" onClick={onClose}>
      <div className="dash-modal qr-modal" onClick={e => e.stopPropagation()}>
        <div className="dash-modal__header">
          <h3>Mon QR code</h3>
          <button className="dash-modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="qr-modal__body">
          <p className="qr-modal__event-name">{titre}</p>
          {qr_utilise && (
            <div style={{ background: 'rgba(16,185,129,.15)', border: '1px solid #10b981', borderRadius: 8, padding: '8px 14px', marginBottom: 12, textAlign: 'center', color: '#10b981', fontSize: 13, fontWeight: 600 }}>
              ✅ Présence validée — ce QR a déjà été scanné
            </div>
          )}
          {!token && (
            <div style={{ color: '#888', textAlign: 'center', padding: 16, fontSize: 13 }}>
              Token non disponible pour cette inscription
            </div>
          )}
          <div className="qr-modal__qr-zone" style={{ opacity: qr_utilise ? 0.4 : 1 }}>
            {/*
              TODO: Remplacer par le vrai QR code :
              import { QRCodeSVG } from 'qrcode.react';
              <QRCodeSVG value={token} size={200} bgColor="#0a0a1a" fgColor="#00d4ff" level="H" />
              npm install qrcode.react
            */}
            <svg viewBox="0 0 200 200" width="180" height="180">
              <rect x="0" y="0" width="200" height="200" fill="#0a0a1a" rx="8" />
              <rect x="15" y="15" width="50" height="50" fill="none" stroke="#00d4ff" strokeWidth="4" rx="4" />
              <rect x="24" y="24" width="32" height="32" fill="#00d4ff" rx="2" />
              <rect x="135" y="15" width="50" height="50" fill="none" stroke="#00d4ff" strokeWidth="4" rx="4" />
              <rect x="144" y="24" width="32" height="32" fill="#00d4ff" rx="2" />
              <rect x="15" y="135" width="50" height="50" fill="none" stroke="#00d4ff" strokeWidth="4" rx="4" />
              <rect x="24" y="144" width="32" height="32" fill="#00d4ff" rx="2" />
              <text x="100" y="158" textAnchor="middle" fill="#888" fontSize="8" fontFamily="monospace">
                {token?.slice(0, 16)}...
              </text>
            </svg>
          </div>
          <p className="qr-modal__instructions">
            Présentez ce QR code à l'organisateur le jour de l'événement.
          </p>
          <div className="qr-modal__token">
            <span className="qr-modal__token-label">Token :</span>
            <code className="qr-modal__token-value">{token}</code>
          </div>
        </div>
        <div className="dash-modal__footer">
          <button className="dash-btn-ghost" onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  );
};

export default RewardCard;
