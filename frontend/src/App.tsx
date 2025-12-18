import { useState, useEffect } from 'react';
import LearningSession from './pages/LearningSession';
import Login from './components/Login';
import { jwtDecode } from "jwt-decode";
import { Menu, Transition } from '@headlessui/react';
import { Routes, Route, Link } from 'react-router-dom';
import Profile from './pages/Profile';

interface User {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
}

function App() {
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
    }
  }, [token]);

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

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
    <div className="bg-background min-h-screen w-full flex justify-center p-4 sm:p-6 lg:p-8 relative">
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-sm p-4">
          <div className="bg-[#F7F7F5] w-full max-w-md rounded-2xl shadow-2xl relative overflow-hidden border border-stone-200">
            <button
              onClick={() => setIsLoginModalOpen(false)}
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

      <div className="w-full max-w-4xl">
        <header className="mb-24 flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold text-foreground">Dabia</Link>
          <div className="flex items-center gap-4">
            {token ? (
              <Menu as="div" className="relative inline-block text-left z-[100]">
                <Menu.Button className="flex items-center gap-2 hover:bg-secondary/50 p-1.5 rounded-lg transition-colors focus:outline-none">
                  {user?.picture ? (
                    <img src={user.picture} alt="Avatar" className="w-8 h-8 rounded-full object-cover border border-border/50" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium border border-primary/20">
                      {(user?.name || user?.email || '?')[0].toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm font-medium text-foreground hidden sm:block">{user?.name || user?.email}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><path d="m6 9 6 6 6-6" /></svg>
                </Menu.Button>
                <Transition
                  enter="transition ease-out duration-100"
                  enterFrom="transform opacity-0 scale-95"
                  enterTo="transform opacity-100 scale-100"
                  leave="transition ease-in duration-75"
                  leaveFrom="transform opacity-100 scale-100"
                  leaveTo="transform opacity-0 scale-95"
                >
                  <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right divide-y divide-border rounded-lg bg-popover shadow-lg ring-1 ring-black/5 focus:outline-none border border-border">
                    <div className="px-1 py-1">
                      <Menu.Item>
                        {({ active }) => (
                          <Link
                            to="/profile"
                            className={`${active ? 'bg-secondary text-foreground' : 'text-muted-foreground'
                              } group flex w-full items-center rounded-md px-2 py-2 text-sm transition-colors`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                            Profile
                          </Link>
                        )}
                      </Menu.Item>
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            onClick={logout}
                            className={`${active ? 'bg-secondary text-foreground' : 'text-muted-foreground'
                              } group flex w-full items-center rounded-md px-2 py-2 text-sm transition-colors`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></svg>
                            Logout
                          </button>
                        )}
                      </Menu.Item>
                    </div>
                  </Menu.Items>
                </Transition>
              </Menu>
            ) : (
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="text-sm font-medium text-[#3d3929] hover:text-[#c96442] transition-colors"
              >
                Log In
              </button>
            )}
          </div>
        </header>
        <main className="flex flex-col items-center justify-center w-full">
          <Routes>
            <Route path="/" element={<LearningSession />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;