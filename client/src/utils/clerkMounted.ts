import { createContext } from 'react';

/**
 * True below ClerkShell, the only place Clerk's hooks work. Clerk wraps just
 * the app shell, but SiteHeader also renders on the landing page, outside it:
 * a Clerk hook there throws, and the error boundary replaces the whole page.
 */
export const ClerkMountedContext = createContext(false);
