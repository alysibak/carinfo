import { Suspense, lazy, useContext } from 'react';
import { isAuthConfigured } from '../utils/authConfig';
import { ClerkMountedContext } from '../utils/clerkMounted';

const SignInPromptBanner = lazy(() =>
  import('./AccountAuth').then((m) => ({ default: m.SignInPromptBanner })),
);

/** Soft sign-in CTA for garage — only when Clerk is configured and mounted. */
export default function SignInPromptSlot() {
  const clerkMounted = useContext(ClerkMountedContext);
  if (!isAuthConfigured() || !clerkMounted) return null;
  return (
    <Suspense fallback={null}>
      <SignInPromptBanner />
    </Suspense>
  );
}
