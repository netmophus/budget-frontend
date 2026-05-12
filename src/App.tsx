import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
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
    // Lot 6.7.2 — TooltipProvider racine (shadcn/ui pattern). Portée
    // maximale, applicable même sur les pages publiques (/login, etc.).
    // delayDuration=200ms : compromis ouverture rapide sans déclenchement
    // intempestif au survol passager.
    <TooltipProvider delayDuration={200}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  );
}

export default App;
