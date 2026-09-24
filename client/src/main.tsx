import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { installStaleBuildRecovery } from './utils/staleBuildRecovery';
// Fonts are self-hosted: loading them from Google sent every visitor's IP to a
// third party and put two extra origins in front of first paint. The weights
// match what the Google Fonts URL requested, so rendering is unchanged.
import '@fontsource/archivo/400.css';
import '@fontsource/archivo/500.css';
import '@fontsource/archivo/600.css';
import '@fontsource/archivo/700.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/ibm-plex-mono/600.css';
import '@fontsource/ibm-plex-mono/700.css';
import './index.css';

installStaleBuildRecovery();

// Clerk is mounted inside App, scoped to the app-shell routes, so the entry
// chunk stays free of the auth SDK. See components/AuthProvider.tsx.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
