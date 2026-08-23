import { AuthHeaderControls } from './AccountAuth';

/** Renders Clerk header controls only when the publishable key is present. */
export default function AuthHeaderSlot({ onNavigate }: { onNavigate?: () => void }) {
  if (!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY) return null;
  return <AuthHeaderControls onNavigate={onNavigate} />;
}
