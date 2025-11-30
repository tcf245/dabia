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
  // const [user, setUser] = useState<User | null>(null); // TODO: Use user info for profile display

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
        // setUser(decoded);
        console.log("Decoded token:", decoded);
      } catch (e) {
        console.error("Invalid token", e);
        logout();
      }
    }
  }, [token]);

  const handleLoginSuccess = (newToken: string, _userInfo: any) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    // setUser(null);
  };

  if (!token) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="bg-background min-h-screen w-full flex justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl">
        <header className="mb-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-foreground">Dabia</h1>
          <div className="flex items-center gap-4">
            {/* Placeholder for user info if we had it */}
            <button onClick={logout} className="text-sm text-red-500 hover:text-red-700">
              Logout
            </button>
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