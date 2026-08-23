import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App';
import { AccountSyncBridge } from './components/AccountAuth';
import './index.css';

const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

function Root() {
  if (!clerkKey) {
    return <App />;
  }

  return (
    <ClerkProvider publishableKey={clerkKey} afterSignOutUrl="/">
      <AccountSyncBridge />
      <App />
    </ClerkProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
