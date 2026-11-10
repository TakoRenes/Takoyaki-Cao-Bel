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

// Force-apply a crisp 64x64 PNG Takoyaki favicon at runtime so every browser & GitHub Pages tab displays it
function applyTakoyakiFavicon() {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Wooden Toothpick (top right)
    ctx.save();
    ctx.strokeStyle = '#D4A373';
    ctx.lineWidth = 5.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(55, 9);
    ctx.lineTo(35, 29);
    ctx.stroke();

    ctx.fillStyle = '#E6C28B';
    ctx.beginPath();
    ctx.moveTo(48, 5);
    ctx.lineTo(59, 16);
    ctx.lineTo(51, 22);
    ctx.lineTo(42, 13);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 2. Golden Takoyaki Ball Sphere
    const ballGrad = ctx.createRadialGradient(23, 25, 4, 30, 36, 26);
    ballGrad.addColorStop(0, '#FAD165');
    ballGrad.addColorStop(0.55, '#E57C29');
    ballGrad.addColorStop(1, '#9E4210');

    ctx.beginPath();
    ctx.arc(30, 36, 23, 0, Math.PI * 2);
    ctx.fillStyle = ballGrad;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#432314';
    ctx.stroke();

    // 3. Glossy Takoyaki Brown Sauce Top
    const sauceGrad = ctx.createLinearGradient(30, 13, 30, 38);
    sauceGrad.addColorStop(0, '#6E2E14');
    sauceGrad.addColorStop(1, '#3D1708');

    ctx.beginPath();
    ctx.arc(30, 36, 21.5, Math.PI * 1.08, Math.PI * 1.92);
    ctx.bezierCurveTo(47, 36, 42, 32, 38, 36);
    ctx.bezierCurveTo(34, 40, 30, 33, 25, 37);
    ctx.bezierCurveTo(20, 41, 15, 33, 9.5, 31);
    ctx.closePath();
    ctx.fillStyle = sauceGrad;
    ctx.fill();

    // 4. Creamy Mayo Drizzle
    ctx.beginPath();
    ctx.moveTo(15, 25);
    ctx.quadraticCurveTo(20, 20, 24, 26);
    ctx.quadraticCurveTo(28, 31, 31, 23);
    ctx.quadraticCurveTo(35, 17, 39, 26);
    ctx.quadraticCurveTo(42, 30, 46, 23);
    ctx.strokeStyle = '#FFF9EE';
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // 5. Green Aonori Seaweed Flakes
    ctx.fillStyle = '#52943D';
    const flakes = [
      [23, 19, 2],
      [31, 28, 2],
      [38, 19, 1.8],
      [19, 29, 1.7],
      [42, 28, 1.7],
    ];
    for (const [fx, fy, fr] of flakes) {
      ctx.beginPath();
      ctx.arc(fx, fy, fr, 0, Math.PI * 2);
      ctx.fill();
    }

    // 6. Warm Golden Cheek Highlight
    ctx.save();
    ctx.translate(21, 45);
    ctx.rotate((-20 * Math.PI) / 180);
    ctx.fillStyle = 'rgba(253, 228, 158, 0.6)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 5.5, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const pngDataUrl = canvas.toDataURL('image/png');
    const existingLinks = document.querySelectorAll("link[rel*='icon']");
    existingLinks.forEach((el) => el.parentNode?.removeChild(el));

    const iconLink = document.createElement('link');
    iconLink.rel = 'icon';
    iconLink.type = 'image/png';
    iconLink.href = pngDataUrl;
    document.head.appendChild(iconLink);

    const shortcutLink = document.createElement('link');
    shortcutLink.rel = 'shortcut icon';
    shortcutLink.type = 'image/png';
    shortcutLink.href = pngDataUrl;
    document.head.appendChild(shortcutLink);
  } catch {
    // Non-blocking
  }
}

if (typeof window !== 'undefined') {
  applyTakoyakiFavicon();
}

createRoot(document.getElementById('root')!).render(<App />);


