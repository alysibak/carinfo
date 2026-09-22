/**
 * Whether Clerk is configured for this build. `import.meta.env` is frozen at
 * build time, so this is a constant — kept in its own module so the component
 * files that consult it only export components (React Fast Refresh requires
 * that to hot-swap them).
 */
export const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as
  string | undefined;

export function isAuthConfigured(): boolean {
  return Boolean(CLERK_PUBLISHABLE_KEY);
}
