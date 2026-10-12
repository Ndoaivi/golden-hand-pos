import type { CapacitorConfig } from '@capacitor/cli';

// Bundled cashier demo. No remote server, live payment SDK or production secrets.
const config: CapacitorConfig = {
    appId: 'com.goldenhand.mahjong.pos.demo',
    appName: 'Golden Hand POS Demo',
    webDir: 'apps/web/dist',
    backgroundColor: '#f6f5f1',
    android: { path: 'apps/android', backgroundColor: '#f6f5f1' },
    server: { androidScheme: 'https', appStartPath: '/pos' },
    plugins: {
        SystemBars: { insetsHandling: 'native', initialViewportFitValueHint: 'contain', style: 'DARK' },
    },
};

export default config;
