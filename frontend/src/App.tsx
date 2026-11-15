import { useState, useEffect, useCallback } from 'react';
import LearningSession from './pages/LearningSession';
import Login from './components/Login';
import { jwtDecode } from "jwt-decode";
import { Routes, Route } from 'react-router-dom';
import AppHeader from './components/AppHeader';
import { useEscapeKey } from './hooks/useEscapeKey';
import Profile from './pages/Profile';
import DeckManagement from './pages/DeckManagement';
import Welcome from './pages/Welcome';
import { useI18n } from './i18n/LanguageProvider';


interface User {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
}

function App() {
  const { messages } = useI18n();
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (token) {
      try {
        const decoded = jwtDecode<User>(token);
        setUser(decoded);
      } catch (e) {
        console.error("Invalid token", e);
        logout();
      }
    } else {
      setUser(null);
    }
  }, [token]);

  // Handle cross-tab and silent token updates
  useEffect(() => {
    const handleUnauthorized = () => {
      setToken(null);
      setUser(null);
      setIsLoginModalOpen(true);
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token') {
        setToken(e.newValue);
      }
    };

    window.addEventListener('dabia:unauthorized', handleUnauthorized);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('dabia:unauthorized', handleUnauthorized);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const closeLoginModal = useCallback(() => setIsLoginModalOpen(false), []);
  useEscapeKey(isLoginModalOpen, closeLoginModal);

  // When wrapping in BrowserRouter in main.tsx, we can use hooks here if needed,
  // but we primarily need Link and Routes.
  // Note: We need to import Link and Routes etc.

  const handleLoginSuccess = (newToken: string) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setIsLoginModalOpen(false);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    // Ideally redirect to home, but for now just clear state
    window.location.href = '/';
  };

  return (
    <div className="bg-background min-h-screen w-full relative">
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-sm p-4" onClick={closeLoginModal}>
          <div role="dialog" aria-modal="true" aria-label={messages.login.dialog} onClick={(e) => e.stopPropagation()} className="bg-[#F9F9F8] w-full max-w-md rounded-2xl shadow-2xl relative overflow-hidden border border-[#E6E6E3]">
            <button
              onClick={closeLoginModal}
              aria-label={messages.common.close}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-600 transition-colors p-1 rounded-full hover:bg-stone-200/50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <div className="p-8 sm:p-10">
              <Login onLoginSuccess={handleLoginSuccess} />
            </div>
          </div>
        </div>
      )}

      <AppHeader
        user={token ? (user ?? { sub: '' }) : null}
        onLogin={() => setIsLoginModalOpen(true)}
        onLogout={logout}
      />

      <div className="w-full flex justify-center px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 pb-8">
        <main className="w-full max-w-4xl flex flex-col items-center justify-center">
          <Routes>
            <Route path="/" element={token ? <LearningSession /> : <Welcome onLoginSuccess={handleLoginSuccess} />} />
            <Route path="/decks" element={<DeckManagement />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;