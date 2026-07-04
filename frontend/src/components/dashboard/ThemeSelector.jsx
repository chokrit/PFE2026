import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';

const ACCENT_PREVIEW = {
  cosmos:    '#00d4ff',
  emeraude:  '#00e676',
  amethyste: '#a78bfa',
  soleil:    '#ffd700',
  braise:    '#ff8c42',
  ardoise:   '#60a5fa',
};

export default function ThemeSelector() {
  const { themeKey, setThemeKey, themes } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        title="Changer le thème"
        style={{
          background: 'transparent',
          border: '1px solid var(--dash-card-border)',
          borderRadius: '8px',
          padding: '6px 10px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          color: 'var(--color-text-muted, #8888aa)',
          fontSize: '13px',
          fontFamily: 'Poppins, sans-serif',
          transition: 'border-color .2s, color .2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--dash-accent)'; e.currentTarget.style.color = 'var(--dash-accent)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--dash-card-border)'; e.currentTarget.style.color = 'var(--color-text-muted, #8888aa)'; }}
      >
        <span
          style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: ACCENT_PREVIEW[themeKey],
            display: 'inline-block',
            flexShrink: 0,
          }}
        />
        🎨
      </button>

      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 499 }}
          />
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              right: 0,
              background: 'var(--color-bg-card)',
              border: '1px solid var(--dash-card-border)',
              borderRadius: '12px',
              padding: '12px',
              zIndex: 500,
              minWidth: '160px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '0 0 8px', fontFamily: 'Poppins,sans-serif', letterSpacing: '0.05em' }}>
              THÈME
            </p>
            {Object.entries(themes).map(([key, theme]) => (
              <button
                key={key}
                onClick={() => { setThemeKey(key); setOpen(false); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: themeKey === key ? 'rgba(255,255,255,0.06)' : 'transparent',
                  border: themeKey === key ? `1px solid ${ACCENT_PREVIEW[key]}44` : '1px solid transparent',
                  borderRadius: '8px',
                  padding: '7px 10px',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                  color: themeKey === key ? ACCENT_PREVIEW[key] : 'var(--color-text, #e8e8f0)',
                  fontSize: '13px',
                  fontFamily: 'Poppins, sans-serif',
                  transition: 'background .15s',
                }}
              >
                <span
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    background: ACCENT_PREVIEW[key],
                    flexShrink: 0,
                    boxShadow: themeKey === key ? `0 0 6px ${ACCENT_PREVIEW[key]}` : 'none',
                  }}
                />
                {theme.name}
                {themeKey === key && <span style={{ marginLeft: 'auto', fontSize: 11 }}>✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
