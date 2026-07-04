import React, { createContext, useContext, useEffect, useState } from 'react';

const THEMES = {
  cosmos:    { name: 'Cosmos',     bg: '#0a0a1a', bgCard: '#12122a', bgInput: '#1a1a35', accent: '#00d4ff', border: '#2a2a4a', headerBg: 'rgba(18,18,42,0.95)'   },
  emeraude:  { name: 'Émeraude',  bg: '#081510', bgCard: '#0f2018', bgInput: '#152a1f', accent: '#00e676', border: '#1a3828', headerBg: 'rgba(12,28,18,0.95)'   },
  amethyste: { name: 'Améthyste', bg: '#120a1a', bgCard: '#1e1228', bgInput: '#271835', accent: '#a78bfa', border: '#33204a', headerBg: 'rgba(25,12,38,0.95)'   },
  soleil:    { name: 'Soleil',    bg: '#12100a', bgCard: '#1e1c10', bgInput: '#2a2615', accent: '#ffd700', border: '#3a3418', headerBg: 'rgba(26,22,8,0.95)'    },
  braise:    { name: 'Braise',    bg: '#140a00', bgCard: '#201208', bgInput: '#2a1808', accent: '#ff8c42', border: '#3a2010', headerBg: 'rgba(22,10,0,0.95)'    },
  ardoise:   { name: 'Ardoise',   bg: '#0a0f18', bgCard: '#101828', bgInput: '#161f34', accent: '#60a5fa', border: '#1e3050', headerBg: 'rgba(12,18,30,0.95)'   },
};

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [themeKey, setThemeKey] = useState(
    () => localStorage.getItem('event_theme') || 'cosmos'
  );

  useEffect(() => {
    const t = THEMES[themeKey] || THEMES.cosmos;
    const r = document.documentElement.style;
    r.setProperty('--color-bg',         t.bg);
    r.setProperty('--color-bg-card',    t.bgCard);
    r.setProperty('--color-bg-input',   t.bgInput);
    r.setProperty('--color-accent',     t.accent);
    r.setProperty('--color-border',     t.border);
    r.setProperty('--dash-card-bg',     t.bgCard);
    r.setProperty('--dash-card-border', t.border);
    r.setProperty('--dash-accent',      t.accent);
    r.setProperty('--dash-header-bg',   t.headerBg);
    localStorage.setItem('event_theme', themeKey);
  }, [themeKey]);

  return (
    <ThemeContext.Provider value={{ themeKey, setThemeKey, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
