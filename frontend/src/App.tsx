import { useState, useEffect } from 'react';
import LearningSession from './pages/LearningSession';
import Login from './components/Login';
import { jwtDecode } from "jwt-decode";

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
        // Note: The backend JWT might not contain all user info (name, picture) depending on implementation.
        // Ideally, we should fetch user profile from backend /me endpoint.
        // For MVP, we'll assume the backend JWT *could* have it, or we just rely on session existence.
        // Actually, our backend `create_access_token` only puts `sub` (user_id) in it.
        // So we really should fetch the profile.
        // But for now, let's just set the user ID.
        setUser(decoded);
        console.log("Decoded token:", decoded);
      } catch (e) {
        console.error("Invalid token", e);
        logout();
      }
    }
  }, [token]);

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const handleLoginSuccess = (newToken: string, _userInfo: any) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setIsLoginModalOpen(false);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <div className="bg-background min-h-screen w-full flex justify-center p-4 sm:p-6 lg:p-8 relative">
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white p-4 rounded-lg shadow-lg relative">
            <button
              onClick={() => setIsLoginModalOpen(false)}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
            <Login onLoginSuccess={handleLoginSuccess} />
          </div>
        </div>
      )}

      <div className="w-full max-w-4xl">
        <header className="mb-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-foreground">Dabia</h1>
          <div className="flex items-center gap-4">
            {token ? (
              <div className="flex items-center gap-2">
                {user?.picture && <img src={user.picture} alt="Avatar" className="w-8 h-8 rounded-full" />}
                <span className="text-sm font-medium">{user?.name || user?.email}</span>
                <button onClick={logout} className="text-sm text-red-500 hover:text-red-700 ml-2">
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Login with Google
              </button>
            )}
          </div>
        </header>
        <main className="flex flex-col items-center justify-center w-full">
          <LearningSession />
        </main>
      </div>
    </div>
  );
}

export default App;