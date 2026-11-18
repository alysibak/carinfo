import { useState } from 'react';
import { t } from '../i18n';
import { shareLink } from '../utils/share';

/** Share a page: in words, or as an icon where room is short. */
export default function ShareButton({
  url,
  title,
  className = 'btn-secondary text-sm',
  iconOnly = false,
}: {
  url: string;
  title: string;
  className?: string;
  iconOnly?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const onShare = async () => {
    if ((await shareLink(url, title)) === 'copied') {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    }
  };
  const label = copied ? t('Link copied') : t('Share');
  return (
    <button
      type="button"
      onClick={onShare}
      className={className}
      aria-label={iconOnly ? label : undefined}
      aria-live="polite"
    >
      {iconOnly ? (
        <svg
          viewBox="0 0 24 24"
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          aria-hidden
        >
          <path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5 12v7.5h14V12" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        label
      )}
    </button>
  );
}
