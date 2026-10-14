import { StrictMode } from 'react';
import { Capacitor } from '@capacitor/core';
import { createRoot } from 'react-dom/client';
import App, { ErrorBoundary } from './App.tsx';
import './styles.css';
if (Capacitor.isNativePlatform()) {
    // Let Android keep the content clear of the status bar, navigation bar and cutouts.
    document.querySelector('meta[name="viewport"]')?.setAttribute('content', 'width=device-width, initial-scale=1.0, viewport-fit=contain');
}
createRoot(document.getElementById('root')!).render(<StrictMode>
<ErrorBoundary>
<App />
</ErrorBoundary>
</StrictMode>);
// Native builds load assets from the APK; a web cache can leave an old UI after an update.
if (import.meta.env.PROD && !Capacitor.isNativePlatform() &&
    !document.documentElement.dataset.demoPortal &&
    ['http:', 'https:'].includes(window.location.protocol) && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => { }); });
}
