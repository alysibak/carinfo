import { useState } from 'react';
import { t } from '../i18n';

/**
 * Hands a VIN result to someone else: the phone's share sheet where there is
 * one, the link on the clipboard where there is not. The link reopens the
 * same car (the VIN page reads ?vin=).
 */
export default function ShareResult({ vin, title }: { vin: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = `${window.location.origin}/vin?vin=${encodeURIComponent(vin)}`;
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // Cancelled, or the sheet refused the link: fall back to copying.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt(t('Copy this link'), url);
    }
  };
  return (
    <button type="button" onClick={share} className="btn-secondary text-sm" aria-live="polite">
      {copied ? t('Link copied') : t('Share this result')}
    </button>
  );
}
