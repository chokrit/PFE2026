// ============================================================
// main.jsx — Point d'entrée React
// Monte l'application dans le DOM
// ============================================================

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Styles globaux (reset CSS, variables, typographie)
import './styles/global.css';
import './styles/animations.css';

// Monter l'application React dans <div id="root">
ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        {/* StrictMode : détecte les problèmes potentiels en développement */}
        {/* Désactiver en production si double-render pose problème */}
        <App />
    </React.StrictMode>
);