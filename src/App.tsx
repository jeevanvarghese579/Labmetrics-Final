import { useState, useEffect } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { auth } from './firebase';
import { AppProvider, useApp } from './hooks/useAppContext';
import { useTheme } from './hooks/useTheme';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import StudentList from './pages/StudentList';
import BatchPanel from './pages/BatchPanel';
import Experiments from './pages/Experiments';
import SignTracker from './pages/SignTracker';
import Settings from './pages/Settings';
import Login from './pages/Login';
import type { Page } from './lib/types';
import { Loader2 } from 'lucide-react';

function AppContent() {
  const { loading, settings, updateSettings } = useApp();
  const { dark, toggleDark } = useTheme();
  const [page, setPage] = useState<Page>('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Check Firebase auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (settings && settings.dark_mode !== dark) {
      updateSettings({ dark_mode: dark });
    }
  }, [dark]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (settings?.dark_mode !== undefined && settings.dark_mode !== dark) {
      toggleDark();
    }
  }, [settings?.dark_mode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Show loading while checking auth state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-teal-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Show login page if user is not authenticated
  if (!user) {
    return <Login />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-teal-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading LabMetrics...</p>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <Layout currentPage={page} onNavigate={setPage} dark={dark} toggleDark={toggleDark} user={user} onLogout={handleLogout}>
      {page === 'dashboard' && <Dashboard />}
      {page === 'students' && <StudentList />}
      {page === 'batches' && <BatchPanel />}
      {page === 'experiments' && <Experiments />}
      {page === 'sign-tracker' && <SignTracker />}
      {page === 'settings' && <Settings dark={dark} toggleDark={toggleDark} />}
    </Layout>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Check Firebase auth state at top level
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-teal-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <AppProvider user={user}>
      <AppContent />
    </AppProvider>
  );
}