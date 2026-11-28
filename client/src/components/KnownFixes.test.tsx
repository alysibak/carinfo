import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import KnownFixes from './KnownFixes';
import { sparseDashboard } from '../test/fixtures';
import type { BulletinSummary, CarDashboard } from '../types/car.types';
import { bulletinGroups, bulletinReading } from '../utils/bulletins';

const bulletins: BulletinSummary = {
  total: 41,
  parts: [
    ['POWER TRAIN', 12],
    ['ELECTRICAL SYSTEM', 9],
    ['ENGINE AND ENGINE COOLING', 6],
    ['STRUCTURE', 3],
  ],
  shown: [
    {
      id: '10190001',
      number: '19-120',
      date: '2021-06-01',
      parts: ['POWER TRAIN'],
      summary: 'WARRANTY EXTENSION: CVT JUDDER. HONDA HAS EXTENDED THE CVT WARRANTY TO 7 YEARS.',
      kind: 'warranty',
    },
    {
      id: '10180002',
      number: '18-044',
      date: '2020-03-15',
      parts: ['ELECTRICAL SYSTEM'],
      summary: 'RADIO DISPLAY GOES BLANK. UPDATE THE AUDIO UNIT SOFTWARE.',
    },
    {
      id: '10170003',
      number: '17-010',
      date: '2019-01-20',
      parts: ['POWER TRAIN', 'ELECTRICAL SYSTEM'],
      summary: 'SHUDDER AT LOW SPEED ON THE CIVIC. REPROGRAM THE PCM.',
    },
  ],
};

const dashboard = (year: number, extra: Partial<CarDashboard> = {}): CarDashboard => ({
  ...sparseDashboard,
  car: { ...sparseDashboard.car, make: 'Honda', model: 'Civic 4Dr', year },
  modelPage: { label: 'Honda Civic', path: '/models/honda/civic' },
  bulletins,
  recordDates: { bulletins: '2026-11-24' },
  ...extra,
});

describe('KnownFixes', () => {
  it('counts the bulletins and leads with the warranty extension, said to be a U.S. program', () => {
    render(<KnownFixes dashboard={dashboard(2019)} />);
    const heading = screen.getByRole('heading', { name: 'Known fixes' });
    expect(heading.parentElement).toHaveTextContent('41');
    expect(screen.getByText(/A bulletin is not a recall/)).toBeVisible();
    const programs = screen.getByRole('heading', {
      name: 'Warranty extensions and free repairs',
    }).parentElement!;
    const row = within(programs).getAllByRole('listitem')[0];
    expect(row).toHaveTextContent('Warranty extension: CVT judder.');
    // The headline says it already: no flag repeats it.
    expect(row).not.toHaveTextContent('· warranty extended');
    expect(row).toHaveTextContent('Jun 1, 2021 · bulletin 19-120');
    expect(within(programs).getByText(/the maker’s U.S. programs/)).toBeVisible();
  });

  it('flags a free repair whose first line does not say so', () => {
    render(
      <KnownFixes
        dashboard={dashboard(2019, {
          bulletins: {
            ...bulletins,
            shown: [
              {
                id: '10200009',
                number: '19N02',
                date: '2020-09-01',
                parts: ['SEATS'],
                summary:
                  'REAR SEAT LATCH MAY NOT LOCK. DEALERS WILL REPLACE IT UNDER CUSTOMER SATISFACTION PROGRAM 19N02.',
                kind: 'program',
              },
            ],
          },
        })}
      />,
    );
    expect(screen.getByText('Rear seat latch may not lock.').parentElement).toHaveTextContent(
      'Rear seat latch may not lock. · free repair',
    );
  });

  it('lists the rest under the parts owners complain about most, each bulletin once', () => {
    render(
      <KnownFixes
        dashboard={dashboard(2019, {
          complaints: {
            complaints: 80,
            crashes: 0,
            fires: 0,
            injuries: 0,
            deaths: 0,
            parts: [
              ['POWER TRAIN', 40],
              ['ELECTRICAL SYSTEM', 20],
            ],
          },
        })}
      />,
    );
    expect(
      screen.getByRole('heading', { name: 'On the parts owners complain about most' }),
    ).toBeVisible();
    // The shudder bulletin is filed under both: it is listed under the first.
    expect(screen.getAllByText(/Shudder at low speed on the Civic\./)).toHaveLength(1);
    expect(screen.getByText('Transmission and drivetrain').parentElement).toHaveTextContent(
      '12 bulletins',
    );
    expect(
      screen.getByText(/Also on file: engine and cooling \(6\), body and frame \(3\)\./),
    ).toBeVisible();
  });

  it('names CAMVAP for a recent car only', () => {
    const thisYear = new Date().getFullYear();
    const { unmount } = render(<KnownFixes dashboard={dashboard(thisYear - 1)} />);
    expect(screen.getByRole('link', { name: 'Check if it qualifies' })).toHaveAttribute(
      'href',
      'https://www.camvap.ca/',
    );
    unmount();
    render(<KnownFixes dashboard={dashboard(thisYear - 8)} />);
    expect(screen.queryByRole('link', { name: 'Check if it qualifies' })).toBeNull();
  });

  it('shows nothing where no bulletin is on file', () => {
    const { container } = render(<KnownFixes dashboard={sparseDashboard} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('bulletin helpers', () => {
  it('reads the first sentence as the line to scan', () => {
    expect(bulletinReading({ summary: 'RADIO DISPLAY GOES BLANK. UPDATE THE SOFTWARE.' })).toEqual({
      headline: 'Radio display goes blank.',
      rest: 'Update the software.',
    });
  });

  it('falls back to the parts with most bulletins when complaints name none of them', () => {
    const groups = bulletinGroups(bulletins, ['SEATS']);
    expect(groups.fromComplaints).toBe(false);
    expect(groups.programs.map((b) => b.id)).toEqual(['10190001']);
    expect(groups.byPart.map((g) => g.part)).toEqual(['POWER TRAIN', 'ELECTRICAL SYSTEM']);
  });
});
