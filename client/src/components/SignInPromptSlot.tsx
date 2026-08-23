import { SignInPromptBanner } from './AccountAuth';

/** Soft sign-in CTA for garage — only when Clerk is configured. */
export default function SignInPromptSlot() {
  if (!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY) return null;
  return <SignInPromptBanner />;
}
