import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { DataProvider } from './hooks/useData';
import { ToastProvider } from './components/ui/Toast';
import { BottomNav, TopNav } from './components/Navigation';
import { AuthScreen } from './pages/AuthScreen';
import { SetupScreen } from './pages/SetupScreen';
import { Dashboard } from './pages/Dashboard';
import { DailyCheckin } from './pages/DailyCheckin';
import { Content } from './pages/Content';
import { Network } from './pages/Network';
import { Coach } from './pages/Coach';
import { isSupabaseConfigured } from './lib/supabase';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';

function AppContent() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  return (
    <DataProvider>
      <div className="flex-1 flex flex-col">
        <TopNav />
        <main className="flex-1 overflow-y-auto pb-20 sm:pb-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/daily" element={<DailyCheckin />} />
            <Route path="/content" element={<Content />} />
            <Route path="/network" element={<Network />} />
            <Route path="/coach" element={<Coach />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <BottomNav />
      </div>
    </DataProvider>
  );
}

function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-danger/20 border-b border-danger/30 py-1.5 text-center text-xs text-danger font-mono flex items-center justify-center gap-1.5">
      <WifiOff size={12} />
      Offline — changes will sync when reconnected
    </div>
  );
}

export default function App() {
  if (!isSupabaseConfigured) {
    return (
      <ToastProvider>
        <SetupScreen />
        <Analytics />
      </ToastProvider>
    );
  }

  return (
    <HashRouter>
      <AuthProvider>
        <ToastProvider>
          <OfflineIndicator />
          <AppContent />
          <Analytics />
        </ToastProvider>
      </AuthProvider>
    </HashRouter>
  );
}
