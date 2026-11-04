import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import * as accountApi from '../services/accountApi';
import { isHttpError } from '../services/http';
import { useNoIndex, usePageMeta } from '../utils/pageMeta';

/**
 * A recall alert's "turn off" link. It asks before acting: mail scanners
 * follow links in emails, and must not turn anyone's alerts off by doing so.
 */
export default function Unsubscribe() {
  usePageMeta('Recall alerts', 'Turn off CarInfo recall alerts.');
  useNoIndex();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  const stop = async () => {
    setState('busy');
    setError(null);
    try {
      await accountApi.unsubscribeRecallAlerts(token);
      setState('done');
    } catch (err) {
      setState('idle');
      setError(
        isHttpError(err) && err.status === 400
          ? 'This link is not valid. Turn alerts off from your account instead.'
          : 'Could not turn alerts off. Try again.',
      );
    }
  };

  return (
    <div className="page-wrap py-16 max-w-md">
      <h1 className="page-title mb-4">Recall alerts</h1>
      {state === 'done' ? (
        <div className="space-y-3 text-sm text-zinc-300">
          <p>Recall alerts are off. No more will be sent.</p>
          <p>
            You can turn them back on from your{' '}
            <Link to="/account" className="text-white underline underline-offset-4">
              account
            </Link>
            .
          </p>
        </div>
      ) : !token ? (
        <p className="text-sm text-zinc-300">
          This link is missing its code. Use the link in the email, or turn alerts off from your{' '}
          <Link to="/account" className="text-white underline underline-offset-4">
            account
          </Link>
          .
        </p>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-zinc-300">
            Stop the emails about new recalls for the cars in your garage?
          </p>
          <button
            type="button"
            className="btn-primary"
            disabled={state === 'busy'}
            onClick={() => void stop()}
          >
            {state === 'busy' ? 'Turning off…' : 'Turn recall alerts off'}
          </button>
          {error && <p className="text-sm text-red-300">{error}</p>}
        </div>
      )}
    </div>
  );
}
