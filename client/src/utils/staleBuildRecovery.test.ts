import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installStaleBuildRecovery, type RecoveryHost } from './staleBuildRecovery';

function makeHost(overrides: Partial<RecoveryHost> = {}) {
  const target = new EventTarget();
  const store = new Map<string, string>();
  const host = {
    addEventListener: target.addEventListener.bind(target),
    sessionStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    },
    location: { reload: vi.fn() },
    navigator: { onLine: true },
    ...overrides,
  };
  installStaleBuildRecovery(host as RecoveryHost);
  /** Fire the event Vite dispatches when a dynamic import fails; true if handled. */
  const chunkFails = () =>
    !target.dispatchEvent(new Event('vite:preloadError', { cancelable: true }));
  return { host, chunkFails };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-24T12:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('installStaleBuildRecovery', () => {
  it('reloads to pick up the new build instead of showing the error screen', () => {
    const { host, chunkFails } = makeHost();
    expect(chunkFails()).toBe(true);
    expect(host.location.reload).toHaveBeenCalledTimes(1);
  });

  it('does not loop: a second failure right after the reload surfaces normally', () => {
    const { host, chunkFails } = makeHost();
    chunkFails();
    vi.advanceTimersByTime(3_000);
    expect(chunkFails()).toBe(false);
    expect(host.location.reload).toHaveBeenCalledTimes(1);

    // A later deploy gets its own recovery.
    vi.advanceTimersByTime(60_000);
    expect(chunkFails()).toBe(true);
    expect(host.location.reload).toHaveBeenCalledTimes(2);
  });

  it('stays put when offline, where a reload would lose the page', () => {
    const { host, chunkFails } = makeHost({ navigator: { onLine: false } });
    expect(chunkFails()).toBe(false);
    expect(host.location.reload).not.toHaveBeenCalled();
  });

  it('does nothing when storage is blocked, since it could not guard against a loop', () => {
    const blocked = {
      getItem: () => {
        throw new DOMException('denied', 'SecurityError');
      },
      setItem: () => {},
    };
    const { host, chunkFails } = makeHost({ sessionStorage: blocked });
    expect(chunkFails()).toBe(false);
    expect(host.location.reload).not.toHaveBeenCalled();
  });
});
