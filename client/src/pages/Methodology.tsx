import { Link } from 'react-router-dom';
import { usePageMeta } from '../utils/pageMeta';
import ProvenanceChip from '../components/ProvenanceChip';
import { FIRST_MODEL_YEAR, LATEST_MODEL_YEAR } from '@carinfo/config/model-years';

/** Where the facts come from, what each gives, and on what terms. */
const SOURCES = [
  {
    name: 'U.S. EPA, FuelEconomy.gov',
    url: 'https://www.fueleconomy.gov/feg/download.shtml',
    gives:
      'fuel use and EV range, engines and gearboxes, CO₂ and greenhouse rating, trunk and passenger space.',
    terms: 'U.S. government data, public domain.',
  },
  {
    name: 'Natural Resources Canada, Fuel Consumption Ratings',
    url: 'https://open.canada.ca/data/en/dataset/98f1a129-f628-4ce4-b24d-6f16bf24dd64',
    gives: 'the cars sold in Canada that EPA never rated.',
    terms: 'Open Government Licence – Canada.',
  },
  {
    name: 'NHTSA, 5-Star Safety Ratings',
    url: 'https://www.nhtsa.gov/ratings',
    gives:
      'crash-test stars, rollover risk and the safety technology listed, from each model year since 2011 that NHTSA tested in the car’s body and drivetrain.',
    terms: 'U.S. government data, public domain.',
  },
  {
    name: 'NHTSA, Office of Defects Investigation complaints',
    url: 'https://www.nhtsa.gov/recalls',
    gives:
      'owner complaints by model year and part: owners’ reports, not confirmed defects, not adjusted for sales.',
    terms: 'U.S. government data, public domain.',
  },
  {
    name: 'NHTSA, Office of Defects Investigation investigations',
    url: 'https://www.nhtsa.gov/recalls',
    gives:
      'the defect investigations covering each model year, with NHTSA’s number, dates and the recall each led to: an investigation is not a finding that the defect exists.',
    terms: 'U.S. government data, public domain.',
  },
  {
    name: 'Transport Canada, Canadian Vehicle Specifications (through NHTSA’s vPIC)',
    url: 'https://vpic.nhtsa.dot.gov/api/',
    gives:
      'length, width without mirrors, height, wheelbase and curb weight, as Transport Canada measured each version of a model year.',
    terms: 'Government data, published openly through vPIC.',
  },
  {
    name: 'Transport Canada, Motor Vehicle Safety Recalls Database',
    url: 'https://open.canada.ca/data/en/dataset/1ec92326-47ef-4110-b7ca-959fab03f96d',
    gives: 'recalls in Canada by model year, with Transport Canada’s recall number and its notice.',
    terms: 'Open Government Licence – Canada.',
  },
  {
    name: 'Statistics Canada, monthly average retail prices for gasoline (table 18-10-0001-01)',
    url: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1810000101',
    gives:
      'the pump prices fuel costs are figured at: the region’s city’s self-serve regular, premium and diesel, averaged over the last twelve months.',
    terms: 'Statistics Canada Open Licence.',
  },
  {
    name: 'Équité Association, Top 10 Most Stolen Vehicles in Canada',
    url: 'https://www.equiteassociation.com/top-10-most-stolen-vehicles',
    gives:
      'where a model stands among the ten stolen most in Canada in the latest year counted: a count, so models with many on the road rank higher.',
    terms: 'Published by Équité, the insurance industry’s body for fraud and crime; ranks only.',
  },
  {
    name: 'Wikimedia Commons',
    url: 'https://commons.wikimedia.org',
    gives: 'photos of a car’s own model year, on request.',
    terms: 'Each under its own free licence, credited beside it.',
  },
];

export default function Methodology() {
  usePageMeta(
    'Methodology',
    'How CarInfo loads EPA data, corrects PHEV mislabels, enriches specs at runtime, and estimates Ontario/CAD market value with stated confidence.',
  );

  return (
    <div className="bg-black text-white">
      <div className="border-b border-zinc-900">
        <div className="page-wrap section-y max-w-3xl">
          <p className="text-xs text-zinc-400 mb-3">Where the figures come from</p>
          <h1 className="page-title mb-4">Methodology</h1>
          <p className="text-sm text-zinc-300 leading-relaxed">
            CarInfo puts public records about cars in one place: EPA’s fuel ratings, NHTSA’s crash
            tests, complaints and investigations, Transport Canada’s recalls and measurements, and
            Équité’s theft counts. Each figure says where it came from. The few we estimate, such as
            a car’s value, are marked as estimates, with how we made them.
          </p>
        </div>
      </div>

      <div className="page-wrap section-y max-w-3xl space-y-10 md:space-y-12">
        <section>
          <h2 className="block-title mb-3">Sources</h2>
          <p className="text-sm text-zinc-400 leading-relaxed mb-4">
            Each fact on the site comes from one of these, and keeps the identifier its source knows
            it by (an EPA vehicle id, a Transport Canada recall number), so it can be looked up
            there.
          </p>
          <ul className="space-y-4 text-sm text-zinc-400 leading-relaxed">
            {SOURCES.map((source) => (
              <li key={source.name}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-zinc-200 font-medium underline underline-offset-4 decoration-zinc-700 hover:decoration-zinc-400"
                >
                  {source.name}
                </a>
                : {source.gives} <span className="text-zinc-500">{source.terms}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-zinc-500 leading-relaxed mt-4">
            The government files are downloaded weekly on GitHub (the public-data job), matched to
            the site’s models and reviewed before they reach a page. A government record the site
            cannot match to one of its models, such as a heavy-duty pickup EPA does not rate, is
            left out rather than counted against a model it is not.
          </p>
        </section>

        <section>
          <h2 className="block-title mb-3">How a car’s page is put together</h2>
          <ol className="space-y-4 text-sm text-zinc-400 leading-relaxed list-decimal list-inside marker:text-zinc-400">
            <li>
              <strong className="text-zinc-200 font-medium">The cars</strong>: every version EPA has
              rated from {FIRST_MODEL_YEAR} to {LATEST_MODEL_YEAR}, about 36,000, and the cars sold
              in Canada that EPA never rated (an Acura CSX, a Chevrolet Orlando, a Kia Magentis),
              from Natural Resources Canada and marked NRCan.
            </li>
            <li>
              <strong className="text-zinc-200 font-medium">The records matched to each</strong>:
              NHTSA’s crash ratings for the same model year, body and drivetrain, Transport Canada’s
              measurements and recalls, owner complaints, defect investigations and the theft list.
              The site reads its own copies, so a page never waits on a government server.
            </li>
            <li>
              <strong className="text-zinc-200 font-medium">Names and bodies made plain</strong>:
              trims EPA leaves out of the model name (a Mustang GT is just &ldquo;Mustang&rdquo;, a
              2019 Civic Type R a &ldquo;Civic 5Dr&rdquo;) are named from the engine and gearbox,
              and marked as estimated. Body styles follow the doors, not EPA&rsquo;s size class: a
              Boxster is a convertible, a BMW Gran Coupe a sedan and a GLE Coupe an SUV. Similar
              cars come from the classes shoppers compare within, so a Camry&rsquo;s are an Accord
              and a Sonata rather than a Civic at the same price.
            </li>
            <li>
              <strong className="text-zinc-200 font-medium">Each figure keeps its source</strong>,
              which the page names beside it (see what the labels mean, below).
            </li>
          </ol>
        </section>

        <section>
          <h2 className="block-title mb-3">Plug-in hybrids filed as electric</h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            EPA&rsquo;s bulk file lists some plug-in hybrids among its electric cars. Each
            car&rsquo;s fuel type is read again from EPA&rsquo;s own fields for it when the data is
            built, and checked once more by name (Volt, Prius Prime, T8, 4xe) and by a gas engine
            with a short electric range (under 80 km), so a plug-in hybrid is not shown as electric.
            Automated tests hold both checks in place.
          </p>
        </section>

        <section>
          <h2 className="block-title mb-3">How we estimate value and running costs</h2>
          <p className="text-sm text-zinc-400 leading-relaxed mb-4">
            Value, running costs, resale and the five-year cost are{' '}
            <strong className="text-zinc-200 font-medium">always estimates</strong>, in Canadian
            dollars for the region you pick: Ontario (about 15,000 km a year) or British Columbia
            (about 14,000 km). They are not listing prices, and never shown as a maker&rsquo;s
            price.
          </p>
          <ul className="space-y-2 text-sm text-zinc-400 leading-relaxed list-disc list-inside marker:text-zinc-400">
            <li>
              Value starts from a typical current US sticker price for the vehicle&rsquo;s model,
              maker or size class, converted at the ratio of Canadian to US sticker prices (about
              1.2, not the exchange rate), then depreciated by age.
            </li>
            <li>
              Checked against average Canadian asking prices for 61 reference vehicles, from
              compacts to pickups, performance cars, supercars, plug-in hybrids and EVs; expect
              individual estimates to be within about 25%.
            </li>
            <li>
              For everyday cars, SUVs and minivans the make matters from about three years on: a
              seven-year-old Honda or Toyota keeps far more of its price than a Ford, Chevrolet or
              Nissan of the same size.
            </li>
            <li>
              Pickups depreciate on their own curve, mid-size pickups more gently than full-size,
              and models known to hold value (Tacoma, 4Runner, RAV4 Prime) more gently still.
            </li>
            <li>
              Performance versions EPA lists under the base model&rsquo;s name (a Mustang GT, a
              Camaro ZL1, a Civic Type R) are priced by their engine, and cars known to hold value
              unusually well are depreciated more gently.
            </li>
            <li>
              Flagship sedans, big luxury SUVs and Range Rovers lose value fastest: priced new like
              other luxury cars, but by eight years a Mercedes S-Class or BMW 7 Series keeps about
              60% of what a C-Class or 3 Series does. A Lexus or a new-generation Defender keeps far
              more. Canadian listings for these makes run about 1.2 times US ones, and the model is
              fitted at that ratio.
            </li>
            <li>
              Supercars (a Ferrari, a Lamborghini, an R8) keep most of their price for a decade,
              while ultra-luxury cars and Maseratis lose most of theirs: a nine-year-old Huracán
              lists near 80% of today&rsquo;s sticker, a Bentayga near 30%. Each follows its own
              curve, and values stay at medium confidence at best, since options and history move
              these prices more than age.
            </li>
            <li>
              Collector cars are not valued: a first-generation NSX, a Supra Turbo, an air-cooled
              911, a Lancer Evolution, a Viper, a limited-run hypercar or a Ferrari over twenty
              trades on auction results and condition, and is often worth more than when new.
            </li>
            <li>
              Nor are cars never sold to the public: the leased EV1 and Fit EV, the fuel-cell
              Clarity and Tucson, fleet cars such as the BYD e6 and Motional&rsquo;s robotaxi, and
              the Postal Service&rsquo;s Explorers. With no used market, a depreciation figure would
              be a price nobody can pay.
            </li>
            <li>
              Depreciation curves by segment, age and fuel type. Electric cars follow one curve
              fitted to Canadian listings (about half the sticker at five years), with a steeper
              discount for early short-range models; battery health widens the range rather than
              lowering the average, since listing prices already reflect typical wear.
            </li>
            <li>
              Insurance starts from each province&rsquo;s average premium (FSRA in Ontario, ICBC in
              B.C.), then scales with body style, luxury make, value and age: above $30,000 of value
              it rises 0.4% for each $1,000, since collision and comprehensive cover grow with the
              car&rsquo;s worth. Teslas and other premium EVs cost about a quarter more to insure
              for their repair costs. Your own quote depends on your record and postal code far more
              than on the car.
            </li>
            <li>
              Maintenance and tires follow AAA and CAA driving-cost studies, by fuel type and age;
              exotics (a Ferrari, a Rolls-Royce, a Bentley) cost about $4,000 a year to service and
              wear through performance tires. Ontario charges no plate renewal fee (since 2022);
              B.C.&rsquo;s licence fee is set by weight, about $61 a year for most cars.
            </li>
            <li>
              Energy costs from your region&rsquo;s gas, diesel and home-electricity prices (recent
              Statistics Canada averages). Hydrogen uses B.C.&rsquo;s posted pump price (about
              $16.50/kg); Ontario posts none, so a fuel-cell car&rsquo;s fuel is left out there
              rather than shown as free. Natural gas uses EPA&rsquo;s own annual fuel-cost figure,
              converted to CAD.
            </li>
            <li>
              Each estimate is a range, low to high with a middle figure, and says how confident it
              is (low, medium or high): how well the car fits the data the estimate is drawn from,
              not how close a dealer&rsquo;s quote will be.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="block-title mb-3">What the labels mean</h2>
          <p className="text-sm text-zinc-400 leading-relaxed mb-4">
            Beside each figure, where it came from:
          </p>
          <ul className="space-y-3 text-sm text-zinc-400 leading-relaxed">
            <li className="flex items-baseline gap-2">
              <ProvenanceChip source="epa" />
              <span>Measured in EPA&rsquo;s tests: fuel use, range, engine and emissions.</span>
            </li>
            <li className="flex items-baseline gap-2">
              <ProvenanceChip source="nhtsa" />
              <span>
                NHTSA&rsquo;s crash-test stars for the car&rsquo;s own model year, body and
                drivetrain (about 9,800 cars from 2011 on).
              </span>
            </li>
            <li className="flex items-baseline gap-2">
              <ProvenanceChip source="curated" />
              <span>
                Horsepower as rated: by EPA&rsquo;s test car, or by the maker where the test car had
                another engine (together about 70% of versions).
              </span>
            </li>
            <li className="flex items-baseline gap-2">
              <ProvenanceChip source="estimated" />
              <span>
                Our estimates: value, running and five-year costs, predicted 0&ndash;60 mph times,
                and horsepower taken from the same engine in the same model (about 16% of versions).
              </span>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="block-title mb-3">Photos</h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            A car&rsquo;s page and its model&rsquo;s open with a photo from Wikimedia Commons of
            that model year, make, model and body. Where Commons has none, a photo of another year
            of the same generation says which year it is; where it has neither, an outline of the
            body stands in. Each photo names its photographer and licence. Search results show the
            outline only. No dealer or press photos: this is a reference, not a classifieds site.
          </p>
        </section>

        <section>
          <h2 className="block-title mb-3">What we leave out</h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Torque, measured 0&ndash;60 times and equipment (heated seats, CarPlay) are in none of
            these sources. EPA gives interior space for cars and some SUVs, not pickups, and about
            one version in seven has no horsepower on file. A figure that is missing is left off the
            car&rsquo;s page, and dropped from Compare when no car there has it; Compare says
            &ldquo;Not on file&rdquo; only where some cars have it and others do not. We would
            rather leave a figure out than make one up.
          </p>
        </section>

        <div className="pt-6 border-t border-zinc-900">
          <Link to="/home" className="btn-primary">
            Search cars
          </Link>
        </div>
      </div>
    </div>
  );
}
