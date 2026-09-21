import { Suspense, lazy } from 'react';
import { isAuthConfigured } from './AuthProvider';

const SignInPromptBanner = lazy(() =>
  import('./AccountAuth').then((m) => ({ default: m.SignInPromptBanner })),
);

/** Soft sign-in CTA for garage — only when Clerk is configured. */
export default function SignInPromptSlot() {
  if (!isAuthConfigured()) return null;
  return (
    <Suspense fallback={null}>
      <SignInPromptBanner />
    </Suspense>
  );
}
