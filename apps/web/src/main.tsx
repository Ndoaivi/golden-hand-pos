import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App, { ErrorBoundary } from './App.tsx';
import './styles.css';
createRoot(document.getElementById('root')!).render(<StrictMode>
<ErrorBoundary>
<App />
</ErrorBoundary>
</StrictMode>);
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => { }); });
}
