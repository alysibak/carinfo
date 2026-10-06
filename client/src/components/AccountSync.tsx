import { useEffect } from 'react';
import { useAccount } from '../hooks/useAccount';
import { useGarageStore } from '../stores/garageStore';

/** Syncs the garage with the account on sign-in; back to this device's when no one is. */
export default function AccountSync() {
  const account = useAccount();
  const settled = account.kind !== 'loading';
  const userId = account.kind === 'signed-in' ? account.session.user.id : null;

  useEffect(() => {
    if (!settled) return;
    if (userId) void useGarageStore.getState().syncFromCloud();
    else useGarageStore.getState().detachCloud();
  }, [settled, userId]);

  return null;
}
