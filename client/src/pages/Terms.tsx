import { Link } from 'react-router-dom';
import LegalPage, { LegalSection } from '../components/LegalPage';
import { legalDate, legalLinkClass } from '../utils/legal';
import { CONTACT_EMAIL } from '../config/contact';
import { usePageMeta } from '../utils/pageMeta';

export default function Terms() {
  usePageMeta(
    'Terms of use',
    'The terms for using CarInfo and a CarInfo account: what the figures are, what they are not, and the rules.',
  );

  return (
    <LegalPage
      eyebrow="Using CarInfo"
      title="Terms of use"
      updatedLabel={`Last updated ${legalDate()}`}
      intro={
        <>
          CarInfo gathers public records about cars and adds estimates of its own. These terms cover
          using the site and an account.
        </>
      }
    >
      <LegalSection title="What CarInfo is">
        <p>
          A reference. CarInfo sells no cars and lists none for sale. Its facts come from EPA,
          NHTSA, Transport Canada, Statistics Canada and the other sources the{' '}
          <Link to="/methodology" className={legalLinkClass}>
            methodology
          </Link>{' '}
          names, each credited where it is shown.
        </p>
      </LegalSection>

      <LegalSection title="Estimates are estimates">
        <p>
          Values, running costs, resale and five-year costs are CarInfo&rsquo;s estimates for the
          province you pick, not quotes or offers. Insurance, prices and repairs vary with the car,
          the driver and the seller: check them with an insurer, a seller or a mechanic before you
          decide.
        </p>
      </LegalSection>

      <LegalSection title="Records can be wrong or late">
        <p>
          Public records have errors and gaps, and a recall can be issued after a page was last
          updated. Before buying, check a car&rsquo;s open recalls with its maker or{' '}
          <a
            href="https://recalls-rappels.canada.ca/en"
            target="_blank"
            rel="noopener noreferrer"
            className={legalLinkClass}
          >
            Transport Canada
          </a>{' '}
          using its VIN.
        </p>
      </LegalSection>

      <LegalSection title="Your account">
        <p>
          Keep your sign-in to yourself and your email address current: it is how you get back in.
          An account used to attack the site or to harm others may be suspended.
        </p>
      </LegalSection>

      <LegalSection title="Using the site fairly">
        <p>
          Do not overload the site with automated requests, or try to get around its security,
          sign-ins or limits. Requests beyond the rate limits are refused.
        </p>
      </LegalSection>

      <LegalSection title="CarInfo Pro">
        <p>
          Pro is a subscription billed through Stripe at the price shown when you buy it. You can
          cancel any time from the{' '}
          <Link to="/account" className={legalLinkClass}>
            Account page
          </Link>
          , through Stripe&rsquo;s billing portal, which shows when the plan ends.
        </p>
      </LegalSection>

      <LegalSection title="Data and photos">
        <p>
          Data from U.S. government sources (EPA, NHTSA) is in the public domain; Natural Resources
          Canada and Transport Canada recall data are used under the Open Government Licence –
          Canada, and pump prices under the Statistics Canada Open Licence. Photos are from
          Wikimedia Commons, each under the licence credited beside it. CarInfo&rsquo;s own text,
          estimates and design remain its own.
        </p>
      </LegalSection>

      <LegalSection title="No guarantees">
        <p>
          CarInfo is provided as it is, without a promise that it is complete, current or always
          available. To the extent the law allows, CarInfo is not responsible for decisions made
          using it. Nothing here limits the rights you have under consumer protection law, including
          Quebec&rsquo;s.
        </p>
      </LegalSection>

      <LegalSection title="Changes and contact">
        <p>
          When these terms change, the date at the top changes with them, and using the site
          afterwards means accepting the new terms. The{' '}
          <Link to="/privacy" className={legalLinkClass}>
            privacy policy
          </Link>{' '}
          says what is kept about you.
          {CONTACT_EMAIL && (
            <>
              {' '}
              Questions:{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className={legalLinkClass}>
                {CONTACT_EMAIL}
              </a>
              .
            </>
          )}
        </p>
      </LegalSection>
    </LegalPage>
  );
}
