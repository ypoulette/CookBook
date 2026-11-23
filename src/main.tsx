import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

// Register PWA Service Worker for offline capabilities & installability
registerSW({
  immediate: true,
  onRegisterError(error) {
    console.warn('Service worker registration skipped or failed:', error);
  },
});

createRoot(document.getElementById('root')!).render(<App />);
