import { beforeEach, describe, expect, it, vi } from 'vitest';

const terminate = vi.fn(async () => {});
const createWorker = vi.fn();

vi.mock('tesseract.js', () => ({
  createWorker: (...args: unknown[]) => createWorker(...args),
  OEM: { LSTM_ONLY: 1 },
  PSM: { SINGLE_BLOCK: '6' },
}));

const { holdVinReader, watchVinReader } = await import('./vinReader');

/** A worker that starts at once, as the reader's would once its files are in. */
function startsFine() {
  createWorker.mockImplementation(
    async (_lang, _oem, options: { logger: (m: unknown) => void }) => {
      options.logger({ status: 'initializing api' });
      return { setParameters: vi.fn(async () => {}), terminate };
    },
  );
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('the shared reader', () => {
  beforeEach(() => {
    terminate.mockClear();
    createWorker.mockReset();
  });

  it('runs while anything holds it, and stops once nothing does', async () => {
    startsFine();
    const page = holdVinReader();
    const camera = holdVinReader();
    await settle();
    expect(createWorker).toHaveBeenCalledTimes(1);
    camera();
    await settle();
    expect(terminate).not.toHaveBeenCalled();
    page();
    await settle();
    expect(terminate).toHaveBeenCalledTimes(1);
  });

  it('lets go once however often the same holder lets go', async () => {
    startsFine();
    const page = holdVinReader();
    const camera = holdVinReader();
    camera();
    camera();
    await settle();
    expect(terminate).not.toHaveBeenCalled();
    page();
    await settle();
  });

  it('says where it is as it starts', async () => {
    startsFine();
    const stages: string[] = [];
    const stop = watchVinReader((stage) => stages.push(stage));
    const release = holdVinReader();
    await settle();
    expect(stages).toEqual(['idle', 'downloading', 'setting up', 'ready']);
    release();
    await settle();
    expect(stages.at(-1)).toBe('idle');
    stop();
  });

  it('says it failed, and tries again when next held', async () => {
    createWorker.mockRejectedValueOnce(new Error('offline'));
    const stages: string[] = [];
    const stop = watchVinReader((stage) => stages.push(stage));
    const first = holdVinReader();
    await settle();
    expect(stages.at(-1)).toBe('failed');
    first();
    await settle();
    startsFine();
    const second = holdVinReader();
    await settle();
    expect(stages.at(-1)).toBe('ready');
    second();
    await settle();
    stop();
  });
});
