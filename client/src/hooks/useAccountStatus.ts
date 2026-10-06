import { useEffect, useState } from 'react';
import { getAccountStatus, type AccountCapabilities } from '../services/accountApi';

let request: Promise<AccountCapabilities | null> | null = null;
let answer: AccountCapabilities | null | undefined;

/**
 * What this deployment's accounts offer (Google sign-in, password reset,
 * Pro), asked once per page load. Undefined while asking; null when the
 * server could not say, which callers treat as "accounts unavailable".
 */
export function useAccountStatus(): AccountCapabilities | null | undefined {
  const [status, setStatus] = useState(answer);
  useEffect(() => {
    if (status !== undefined) return;
    let live = true;
    request ??= getAccountStatus()
      .catch(() => null)
      .then((result) => (answer = result));
    void request.then((result) => live && setStatus(result));
    return () => {
      live = false;
    };
  }, [status]);
  return status;
}

/** Test seam: forget the cached answer. */
export function __resetAccountStatusForTests(): void {
  request = null;
  answer = undefined;
}
