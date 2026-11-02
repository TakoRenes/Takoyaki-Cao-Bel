import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Gracefully handle known Firebase Auth popup internal assertion when user cancels or closes login popup
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event?.reason;
    const msg = String(reason?.message || reason || '');
    if (
      msg.includes('Pending promise was never set') ||
      msg.includes('auth/popup-closed-by-user') ||
      msg.includes('auth/cancelled-popup-request')
    ) {
      event.preventDefault();
      console.warn('Firebase Auth popup event handled gracefully:', msg);
    }
  });
}

createRoot(document.getElementById('root')!).render(<App />);

