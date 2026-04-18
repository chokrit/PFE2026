import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import ProtectedRoute from './components/ProtectedRoute';

// Pages publiques
import SplashScreen from './pages/SplashScreen';
import LanguageSelect from './pages/LanguageSelect';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import AboutOrg from './pages/AboutOrg';
import AboutApp from './pages/AboutApp';
import Location from './pages/Location';

// Dashboards
import DashboardUser from './pages/dashboard/DashboardUser';
import DashboardAdmin from './pages/dashboard/DashboardAdmin';
import DashboardOrganisateur from './pages/dashboard/DashboardOrganisateur';

function App() {
  return (
    <LanguageProvider>
      <Router>
        <Routes>
          {/* ── Routes publiques ── */}
          <Route path="/" element={<SplashScreen />} />
          <Route path="/select-language" element={<LanguageSelect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/about-org" element={<AboutOrg />} />
          <Route path="/about-app" element={<AboutApp />} />
          <Route path="/location" element={<Location />} />

          {/* ── Routes protégées ── */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardUser />
            </ProtectedRoute>
          } />

          <Route path="/admin" element={
            <ProtectedRoute requiredRole="admin">
              <DashboardAdmin />
            </ProtectedRoute>
          } />

          <Route path="/organisateur" element={
            <ProtectedRoute requiredRole="admin">
              <DashboardOrganisateur />
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </LanguageProvider>
  );
}

export default App;