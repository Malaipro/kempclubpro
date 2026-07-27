import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { AuthProvider } from '@/hooks/useAuth'
import App from './App.tsx'
import './index.css'
import { captureUtmFromUrl } from '@/lib/utmCapture'
import { captureRefFromUrl } from '@/lib/refCapture'

captureRefFromUrl();
captureUtmFromUrl();

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <AuthProvider>
      <App />
    </AuthProvider>
  </HelmetProvider>
);
