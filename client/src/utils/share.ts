import { t } from '../i18n';

/** The phone's share sheet where there is one; the link copied where there is not. */
export async function shareLink(
  url: string,
  title: string,
): Promise<'shared' | 'copied' | 'shown'> {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, url });
      return 'shared';
    } catch {
      // Cancelled, or the sheet refused the link: copy it instead.
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    window.prompt(t('Copy this link'), url);
    return 'shown';
  }
}
