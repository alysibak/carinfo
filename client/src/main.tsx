import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { installStaleBuildRecovery } from './utils/staleBuildRecovery';
import './index.css';

installStaleBuildRecovery();

// Clerk is mounted inside App, scoped to the app-shell routes, so the entry
// chunk stays free of the auth SDK. See components/AuthProvider.tsx.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
