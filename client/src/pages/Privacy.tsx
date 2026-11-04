import { Link } from 'react-router-dom';
import LegalPage, { LegalSection } from '../components/LegalPage';
import { legalDate, legalLinkClass } from '../utils/legal';
import { CONTACT_EMAIL } from '../config/contact';
import { usePageMeta } from '../utils/pageMeta';
import { locale, t } from '../i18n';
import { rich } from '../i18n/rich';

const OPC_REPORT = 'https://www.priv.gc.ca/en/report-a-concern/' as const;
const OPC_REPORT_FR = 'https://www.priv.gc.ca/fr/signaler-des-preoccupations/' as const;

export default function Privacy() {
  usePageMeta(
    t('Privacy policy'),
    t(
      'What CarInfo keeps about you, why, where and for how long, and how to see, download or delete it.',
    ),
  );

  return (
    <LegalPage
      eyebrow={t('How CarInfo handles your information')}
      title={t('Privacy policy')}
      updatedLabel={t('Last updated {date}', { date: legalDate() })}
      intro={t(
        'CarInfo needs little about you. Searching, comparing and decoding a VIN need no account and set no tracking cookies; an account needs an email address. This page says what is kept, why, where, for how long, and how to see, download or delete it.',
      )}
    >
      <LegalSection title={t('Without an account')}>
        <p>
          {t(
            'Your browser keeps your province, your compare list, your garage, the cars you viewed recently and whether you prefer a grid or a list, in its own storage on your device. Pages send what they need to work: your province, to cost a car for it, and the cars you compare.',
          )}
        </p>
        <p>
          {t(
            'Each browser tab adds one to an anonymous count of visits, once. Nothing about who visited is recorded with it.',
          )}
        </p>
        <p>
          {t(
            'Visits and page speed are measured with Vercel Web Analytics and Speed Insights, which set no cookies and tell visitors apart by a code that changes every day. Page addresses are sent without anything after a “?”, so search words and links from emails stay out of them.',
          )}
        </p>
        <p>
          {t(
            'When a page breaks, your browser sends CarInfo the error, the page’s address (also without anything after “?”) and the browser’s name, version and operating system, so the fault can be found. No account details go with it.',
          )}
        </p>
      </LegalSection>

      <LegalSection title={t('With an account')}>
        <ul className="list-disc list-inside space-y-2 marker:text-zinc-500">
          <li>
            {t(
              'Your email address and, if you give one, your name. Signing in with Google, Apple or Microsoft shares the name, email address and profile photo that service holds.',
            )}
          </li>
          <li>
            {t('Your password, kept only as a one-way hash that cannot be turned back into it.')}
          </li>
          <li>
            {t(
              'The cars you save to your garage, your plan (Free or Pro), whether you asked for recall alerts, and which recalls you were sent.',
            )}
          </li>
          <li>
            {t(
              'For each place you are signed in: when the session started and when it ends (at most 30 days on), its IP address and its browser. They keep you signed in and help spot someone else using your account.',
            )}
          </li>
          <li>{t('Sign-in codes and password-reset links, which expire within an hour.')}</li>
        </ul>
      </LegalSection>

      <LegalSection title={t('Email')}>
        <p>
          {t(
            'Account email (sign-in codes, password resets, confirming an address) and the recall alerts you turn on are sent through Resend. CarInfo sends no newsletters and no advertising. Every recall alert has a link that turns alerts off at once.',
          )}
        </p>
      </LegalSection>

      <LegalSection title={t('Payments')}>
        <p>
          {t(
            'CarInfo Pro is billed by Stripe. Card details go to Stripe and never reach CarInfo, which keeps only Stripe’s customer number, to know your plan.',
          )}
        </p>
      </LegalSection>

      <LegalSection title={t('VIN lookups')}>
        <p>
          {t(
            'A VIN you type or photograph is sent to NHTSA’s vPIC service (U.S. Department of Transportation) to decode it. A photo is read in your browser and never uploaded. Decoded results are cached by VIN to answer repeat lookups, with nothing about who asked.',
          )}
        </p>
      </LegalSection>

      <LegalSection title={t('Photos and fonts')}>
        <p>
          {t(
            'Car photos load from Wikimedia Commons, which receives your IP address and browser as any website would; your browser is asked not to tell it which CarInfo page you are on. Fonts are served by CarInfo itself.',
          )}
        </p>
      </LegalSection>

      <LegalSection title={t('Where it is kept, and who handles it')}>
        <p>
          {t(
            'CarInfo runs on Vercel, with accounts in a hosted Postgres database; email goes through Resend and payments through Stripe. These companies handle information on CarInfo’s behalf. Some of it is stored or processed outside Quebec and outside Canada, including in the United States, where the law there applies to it.',
          )}
        </p>
      </LegalSection>

      <LegalSection title={t('What CarInfo does not do')}>
        <p>
          {t(
            'It does not sell or rent personal information, show advertising, track you across other sites, or build a profile of you.',
          )}
        </p>
      </LegalSection>

      <LegalSection title={t('How long it is kept')}>
        <p>
          {t(
            'Account information stays until you delete the account. Deleting it removes your profile, sign-ins, garage and alert history. Stripe keeps billing records for as long as tax law requires. Error reports and logs of failed or slow requests, which hold no IP address, are kept for a few weeks at most.',
          )}
        </p>
      </LegalSection>

      <LegalSection title={t('Your choices and rights')}>
        <p>
          {rich(
            t(
              'On the <0>Account page</0> you can see your email address and garage, download what CarInfo holds about you, turn recall alerts on or off, and delete the account.',
            ),
            [
              (children) => (
                <Link to="/account" className={legalLinkClass}>
                  {children}
                </Link>
              ),
            ],
          )}
        </p>
        <p>
          {rich(
            t(
              'You can also ask what CarInfo holds about you, have it corrected, or withdraw a consent you gave. If the answer does not satisfy you, you can complain to the <0>Office of the Privacy Commissioner of Canada</0> or, in Quebec, the <1>Commission d’accès à l’information</1>.',
            ),
            [
              (children) => (
                <a
                  href={locale() === 'fr' ? OPC_REPORT_FR : OPC_REPORT}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={legalLinkClass}
                >
                  {children}
                </a>
              ),
              (children) => (
                <a
                  href="https://www.cai.gouv.qc.ca/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={legalLinkClass}
                >
                  {children}
                </a>
              ),
            ],
          )}
        </p>
      </LegalSection>

      <LegalSection title={t('Contact')}>
        <p>
          {CONTACT_EMAIL
            ? rich(
                t(
                  'The person responsible for protecting personal information at CarInfo is its owner. Write to <0>{email}</0>.',
                  { email: CONTACT_EMAIL },
                ),
                [
                  (children) => (
                    <a href={`mailto:${CONTACT_EMAIL}`} className={legalLinkClass}>
                      {children}
                    </a>
                  ),
                ],
              )
            : t(
                'The person responsible for protecting personal information at CarInfo is its owner. The tools on the Account page act at once.',
              )}
        </p>
      </LegalSection>

      <LegalSection title={t('Changes')}>
        <p>{t('When this policy changes, the date at the top changes with it.')}</p>
        <p>
          {rich(t('The <0>terms of use</0> cover using the site and an account.'), [
            (children) => (
              <Link to="/terms" className={legalLinkClass}>
                {children}
              </Link>
            ),
          ])}
        </p>
      </LegalSection>
    </LegalPage>
  );
}
