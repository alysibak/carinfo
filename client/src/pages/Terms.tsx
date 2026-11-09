import { Link } from 'react-router-dom';
import LegalPage, { LegalSection } from '../components/LegalPage';
import { legalDate, legalLinkClass } from '../utils/legal';
import { CONTACT_EMAIL } from '../config/contact';
import { usePageMeta } from '../utils/pageMeta';
import { locale, t } from '../i18n';
import { rich } from '../i18n/rich';

const RECALLS_EN = 'https://recalls-rappels.canada.ca/en' as const;
const RECALLS_FR = 'https://recalls-rappels.canada.ca/fr' as const;

export default function Terms() {
  usePageMeta(
    t('Terms of use'),
    t(
      'The terms for using CarInfo and a CarInfo account: what the figures are, what they are not, and the rules.',
    ),
  );

  return (
    <LegalPage
      eyebrow={t('Using CarInfo')}
      title={t('Terms of use')}
      updatedLabel={t('Last updated {date}', { date: legalDate() })}
      intro={t(
        'CarInfo gathers public records about cars and adds estimates of its own. These terms cover using the site and an account.',
      )}
    >
      <LegalSection title={t('What CarInfo is')}>
        <p>
          {rich(
            t(
              'A reference. CarInfo sells no cars and lists none for sale. Its facts come from EPA, NHTSA, Transport Canada, Statistics Canada and the other sources the <0>methodology</0> names, each credited where it is shown.',
            ),
            [
              (children) => (
                <Link to="/methodology" className={legalLinkClass}>
                  {children}
                </Link>
              ),
            ],
          )}
        </p>
      </LegalSection>

      <LegalSection title={t('Estimates are estimates')}>
        <p>
          {t(
            'Values, running costs, resale and five-year costs are CarInfo’s estimates for the province you pick, not quotes or offers. Insurance, prices and repairs vary with the car, the driver and the seller: check them with an insurer, a seller or a mechanic before you decide.',
          )}
        </p>
      </LegalSection>

      <LegalSection title={t('Records can be wrong or late')}>
        <p>
          {rich(
            t(
              'Public records have errors and gaps, and a recall can be issued after a page was last updated. Before buying, check a car’s open recalls with its maker or <0>Transport Canada</0> using its VIN.',
            ),
            [
              (children) => (
                <a
                  href={locale() === 'fr' ? RECALLS_FR : RECALLS_EN}
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

      <LegalSection title={t('Your account')}>
        <p>
          {t(
            'Keep your sign-in to yourself and your email address current: it is how you get back in. An account used to attack the site or to harm others may be suspended.',
          )}
        </p>
      </LegalSection>

      <LegalSection title={t('Using the site fairly')}>
        <p>
          {t(
            'Do not overload the site with automated requests, or try to get around its security, sign-ins or limits. Requests beyond the rate limits are refused.',
          )}
        </p>
      </LegalSection>

      <LegalSection title={t('CarInfo Pro')}>
        <p>
          {rich(
            t(
              'Pro is a subscription billed through Stripe at the price shown when you buy it. You can cancel any time from the <0>Account page</0>, through Stripe’s billing portal, which shows when the plan ends.',
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
      </LegalSection>

      <LegalSection title={t('Data and photos')}>
        <p>
          {t(
            'Data from U.S. government sources (EPA, NHTSA) is in the public domain; Natural Resources Canada and Transport Canada recall data are used under the Open Government Licence – Canada, and pump prices under the Statistics Canada Open Licence. Photos are from Wikimedia Commons, each under the licence credited beside it. CarInfo’s own text, estimates and design remain its own.',
          )}
        </p>
      </LegalSection>

      <LegalSection title={t('No guarantees')}>
        <p>
          {t(
            'CarInfo is provided as it is, without a promise that it is complete, current or always available. To the extent the law allows, CarInfo is not responsible for decisions made using it. Nothing here limits the rights you have under consumer protection law, including Quebec’s.',
          )}
        </p>
      </LegalSection>

      <LegalSection title={t('Changes and contact')}>
        <p>
          {CONTACT_EMAIL
            ? rich(
                t(
                  'When these terms change, the date at the top changes with them, and using the site afterwards means accepting the new terms. The <0>privacy policy</0> says what is kept about you. Questions: <1>{email}</1>.',
                  { email: CONTACT_EMAIL },
                ),
                [
                  (children) => (
                    <Link to="/privacy" className={legalLinkClass}>
                      {children}
                    </Link>
                  ),
                  (children) => (
                    <a href={`mailto:${CONTACT_EMAIL}`} className={legalLinkClass}>
                      {children}
                    </a>
                  ),
                ],
              )
            : rich(
                t(
                  'When these terms change, the date at the top changes with them, and using the site afterwards means accepting the new terms. The <0>privacy policy</0> says what is kept about you.',
                ),
                [
                  (children) => (
                    <Link to="/privacy" className={legalLinkClass}>
                      {children}
                    </Link>
                  ),
                ],
              )}
        </p>
      </LegalSection>
    </LegalPage>
  );
}
