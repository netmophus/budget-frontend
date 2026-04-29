import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './routes/AppRoutes';
import { useAuthStore } from './lib/auth/auth-store';

function App() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const loadCurrentUser = useAuthStore((s) => s.loadCurrentUser);
  const clearSession = useAuthStore((s) => s.clearSession);

  // Au démarrage : si on a un token persisté, recharger user + permissions.
  useEffect(() => {
    if (accessToken) {
      loadCurrentUser().catch(() => clearSession());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
