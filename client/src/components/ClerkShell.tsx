import type { ReactNode } from 'react';
import { ClerkProvider } from '@clerk/clerk-react';
import { ClerkMountedContext } from '../utils/clerkMounted';
import { AccountSyncBridge } from './AccountAuth';

/**
 * Everything that pulls in @clerk/clerk-react, isolated into one module so the
 * bundler can give it its own chunk. Nothing outside the app shell imports it.
 */
export default function ClerkShell({
  publishableKey,
  children,
}: {
  publishableKey: string;
  children: ReactNode;
}) {
  return (
    <ClerkProvider publishableKey={publishableKey} afterSignOutUrl="/">
      <ClerkMountedContext.Provider value={true}>
        <AccountSyncBridge />
        {children}
      </ClerkMountedContext.Provider>
    </ClerkProvider>
  );
}
