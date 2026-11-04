import { Link } from 'react-router-dom';
import LegalPage, { LegalSection } from '../components/LegalPage';
import { legalDate, legalLinkClass } from '../utils/legal';
import { CONTACT_EMAIL } from '../config/contact';
import { usePageMeta } from '../utils/pageMeta';

export default function Privacy() {
  usePageMeta(
    'Privacy policy',
    'What CarInfo keeps about you, why, where and for how long, and how to see, download or delete it.',
  );

  return (
    <LegalPage
      eyebrow="How CarInfo handles your information"
      title="Privacy policy"
      updatedLabel={`Last updated ${legalDate()}`}
      intro={
        <>
          CarInfo needs little about you. Searching, comparing and decoding a VIN need no account
          and set no tracking cookies; an account needs an email address. This page says what is
          kept, why, where, for how long, and how to see, download or delete it.
        </>
      }
    >
      <LegalSection title="Without an account">
        <p>
          Your browser keeps your province, your compare list, your garage, the cars you viewed
          recently and whether you prefer a grid or a list, in its own storage on your device. Pages
          send what they need to work: your province, to cost a car for it, and the cars you
          compare.
        </p>
        <p>
          Each browser tab adds one to an anonymous count of visits, once. Nothing about who visited
          is recorded with it.
        </p>
        <p>
          Visits and page speed are measured with Vercel Web Analytics and Speed Insights, which set
          no cookies and tell visitors apart by a code that changes every day. Page addresses are
          sent without anything after a &ldquo;?&rdquo;, so search words and links from emails stay
          out of them.
        </p>
        <p>
          When a page breaks, your browser sends CarInfo the error, the page&rsquo;s address (also
          without anything after &ldquo;?&rdquo;) and the browser&rsquo;s name, version and
          operating system, so the fault can be found. No account details go with it.
        </p>
      </LegalSection>

      <LegalSection title="With an account">
        <ul className="list-disc list-inside space-y-2 marker:text-zinc-500">
          <li>
            Your email address and, if you give one, your name. Signing in with Google, Apple or
            Microsoft shares the name, email address and profile photo that service holds.
          </li>
          <li>Your password, kept only as a one-way hash that cannot be turned back into it.</li>
          <li>
            The cars you save to your garage, your plan (Free or Pro), whether you asked for recall
            alerts, and which recalls you were sent.
          </li>
          <li>
            For each place you are signed in: when the session started and when it ends (at most 30
            days on), its IP address and its browser. They keep you signed in and help spot someone
            else using your account.
          </li>
          <li>Sign-in codes and password-reset links, which expire within an hour.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Email">
        <p>
          Account email (sign-in codes, password resets, confirming an address) and the recall
          alerts you turn on are sent through Resend. CarInfo sends no newsletters and no
          advertising. Every recall alert has a link that turns alerts off at once.
        </p>
      </LegalSection>

      <LegalSection title="Payments">
        <p>
          CarInfo Pro is billed by Stripe. Card details go to Stripe and never reach CarInfo, which
          keeps only Stripe&rsquo;s customer number, to know your plan.
        </p>
      </LegalSection>

      <LegalSection title="VIN lookups">
        <p>
          A VIN you type or photograph is sent to NHTSA&rsquo;s vPIC service (U.S. Department of
          Transportation) to decode it. A photo is read in your browser and never uploaded. Decoded
          results are cached by VIN to answer repeat lookups, with nothing about who asked.
        </p>
      </LegalSection>

      <LegalSection title="Photos and fonts">
        <p>
          Car photos load from Wikimedia Commons, which receives your IP address and browser as any
          website would; your browser is asked not to tell it which CarInfo page you are on. Fonts
          are served by CarInfo itself.
        </p>
      </LegalSection>

      <LegalSection title="Where it is kept, and who handles it">
        <p>
          CarInfo runs on Vercel, with accounts in a hosted Postgres database; email goes through
          Resend and payments through Stripe. These companies handle information on CarInfo&rsquo;s
          behalf. Some of it is stored or processed outside Quebec and outside Canada, including in
          the United States, where the law there applies to it.
        </p>
      </LegalSection>

      <LegalSection title="What CarInfo does not do">
        <p>
          It does not sell or rent personal information, show advertising, track you across other
          sites, or build a profile of you.
        </p>
      </LegalSection>

      <LegalSection title="How long it is kept">
        <p>
          Account information stays until you delete the account. Deleting it removes your profile,
          sign-ins, garage and alert history. Stripe keeps billing records for as long as tax law
          requires. Error reports and logs of failed or slow requests, which hold no IP address, are
          kept for a few weeks at most.
        </p>
      </LegalSection>

      <LegalSection title="Your choices and rights">
        <p>
          On the{' '}
          <Link to="/account" className={legalLinkClass}>
            Account page
          </Link>{' '}
          you can see your email address and garage, download what CarInfo holds about you, turn
          recall alerts on or off, and delete the account.
        </p>
        <p>
          You can also ask what CarInfo holds about you, have it corrected, or withdraw a consent
          you gave. If the answer does not satisfy you, you can complain to the{' '}
          <a
            href="https://www.priv.gc.ca/en/report-a-concern/"
            target="_blank"
            rel="noopener noreferrer"
            className={legalLinkClass}
          >
            Office of the Privacy Commissioner of Canada
          </a>{' '}
          or, in Quebec, the{' '}
          <a
            href="https://www.cai.gouv.qc.ca/"
            target="_blank"
            rel="noopener noreferrer"
            className={legalLinkClass}
          >
            Commission d&rsquo;accès à l&rsquo;information
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          The person responsible for protecting personal information at CarInfo is its owner.{' '}
          {CONTACT_EMAIL ? (
            <>
              Write to{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className={legalLinkClass}>
                {CONTACT_EMAIL}
              </a>
              .
            </>
          ) : (
            <>The tools on the Account page act at once.</>
          )}
        </p>
      </LegalSection>

      <LegalSection title="Changes">
        <p>When this policy changes, the date at the top changes with it.</p>
        <p>
          The{' '}
          <Link to="/terms" className={legalLinkClass}>
            terms of use
          </Link>{' '}
          cover using the site and an account.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
