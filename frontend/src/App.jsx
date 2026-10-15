import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { AppLayout } from './components/layout/AppLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { LiveMonitoring } from './pages/LiveMonitoring';
import { FraudAlerts } from './pages/FraudAlerts';
import { OtpVerification } from './pages/OtpVerification';
import { CallVerification } from './pages/CallVerification';
import { BlockedTransactions } from './pages/BlockedTransactions';
import { AuditLogs } from './pages/AuditLogs';
import { Settings } from './pages/Settings';

function AppContent() {
  const { isAuthenticated, loading } = useAuth();
  const [currentPath, setCurrentPath] = useState(() => {
    const hash = window.location.hash.replace('#/', '');
    return hash || 'dashboard';
  });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#/', '');
      if (hash) setCurrentPath(hash);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (path) => {
    setCurrentPath(path);
    window.location.hash = `#/${path}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center text-slate-400 font-mono text-sm">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
          <span>Initializing Security Operations Center...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLoginSuccess={() => navigateTo('dashboard')} />;
  }

  const renderPage = () => {
    switch (currentPath) {
      case 'dashboard':
        return <Dashboard onNavigate={navigateTo} />;
      case 'monitoring':
        return <LiveMonitoring />;
      case 'alerts':
        return <FraudAlerts />;
      case 'otp':
        return <OtpVerification />;
      case 'call-cases':
        return <CallVerification />;
      case 'blocks':
        return <BlockedTransactions />;
      case 'audit':
        return <AuditLogs />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard onNavigate={navigateTo} />;
    }
  };

  return (
    <AppLayout currentPath={currentPath} onNavigate={navigateTo}>
      {renderPage()}
    </AppLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <AppContent />
      </NotificationProvider>
    </AuthProvider>
  );
}
