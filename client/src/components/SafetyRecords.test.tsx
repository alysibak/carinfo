import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SafetyRecords from './SafetyRecords';
import { sparseDashboard } from '../test/fixtures';
import type { CanadianRecall } from '../types/car.types';

const recall = (n: number): CanadianRecall => ({
  number: `20210${n}`,
  date: `2021-0${n}-01`,
  system: 'Brakes',
  kind: 'safety',
  units: 7302,
  summary: `Issue: \nThe pump ${n} may fail. \n\nSafety Risk: \nLonger stops. \n\nCorrective Actions: \nDealers will replace it.`,
});

describe('SafetyRecords', () => {
  it('counts the recalls, a line each, the details a tap away, a few at first', () => {
    render(
      <SafetyRecords
        dashboard={{ ...sparseDashboard, recalls: [1, 2, 3, 4, 5].map(recall) }}
        name="2018 Toyota Camry"
      />,
    );
    const heading = screen.getByRole('heading', { name: 'Recalls in Canada' });
    expect(heading.parentElement).toHaveTextContent('5');
    expect(screen.getByText(/Check the VIN with the maker/)).toBeVisible();
    // A line each: the part, the date, how many in Canada.
    const rows = screen.getAllByRole('listitem');
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent('Brakes');
    expect(rows[0]).toHaveTextContent('Jan 1, 2021 · 7,302 in Canada');
    // The notice opens on a tap, with its number, risk and remedy.
    const details = rows[0].querySelector('details')!;
    expect(details.open).toBe(false);
    fireEvent.click(within(rows[0]).getByText('Brakes'));
    expect(details.open).toBe(true);
    expect(within(rows[0]).getByText('The pump 1 may fail.')).toBeVisible();
    expect(within(rows[0]).getByText('Transport Canada recall 202101')).toBeVisible();
    expect(within(rows[0]).getByText('Longer stops.')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Show all 5' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
    expect(screen.getByText(/Open Government Licence – Canada/)).toBeVisible();
  });

  it('says none are listed only where the records are matched, and counts complaints by part', () => {
    const { container, rerender } = render(
      <SafetyRecords dashboard={sparseDashboard} name="2018 Toyota Camry" />,
    );
    expect(container).toBeEmptyDOMElement();
    rerender(
      <SafetyRecords
        dashboard={{
          ...sparseDashboard,
          recalls: [],
          complaints: {
            complaints: 776,
            crashes: 12,
            fires: 0,
            injuries: 3,
            deaths: 0,
            parts: [
              ['POWER TRAIN', 201],
              ['SERVICE BRAKES', 141],
            ],
          },
        }}
        name="2018 Toyota Camry"
      />,
    );
    expect(screen.getByText(/None listed for this version of the 2018 Toyota Camry/)).toBeVisible();
    const complaints = screen.getByRole('heading', { name: 'Owner complaints' });
    expect(complaints.parentElement).toHaveTextContent('776');
    expect(screen.getByText('Transmission and drivetrain')).toBeVisible();
    expect(screen.getByText('12 reporting a crash · 3 injuries')).toBeVisible();
    expect(screen.getByText(/not confirmed defects/)).toBeVisible();
  });

  it('folds NHTSA’s investigations to a line, the open ones first inside', () => {
    render(
      <SafetyRecords
        dashboard={{
          ...sparseDashboard,
          investigations: [
            {
              id: 'RQ21004',
              kind: 'RQ',
              opened: '2021-06-01',
              closed: '2022-02-01',
              component: 'SERVICE BRAKES',
              subject: 'BRAKE BOOSTER FAILURE',
              recall: '22V045000',
            },
            {
              id: 'PE19003',
              kind: 'PE',
              opened: '2019-03-11',
              component: 'ENGINE AND ENGINE COOLING',
              subject: 'Oil dilution',
              summary: 'The agency received reports of oil levels rising.',
            },
          ],
        }}
        name="2017 Honda CR-V"
      />,
    );
    expect(screen.getByText('2 possible defects looked into, 1 still open')).toBeVisible();
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Engine and cooling · open');
    expect(items[0]).toHaveTextContent('Mar 11, 2019');
    expect(items[0]).toHaveTextContent('Preliminary evaluation PE19003');
    expect(items[1]).toHaveTextContent('Jun 1, 2021 to Feb 1, 2022 · led to recall 22V045000');
    expect(items[1]).toHaveTextContent('Brake booster failure');
  });

  it('lists another powertrain’s recalls apart, folded', () => {
    render(
      <SafetyRecords
        dashboard={{
          ...sparseDashboard,
          recalls: [
            { ...recall(1), summary: 'Issue: On certain RAV4 Prime models, the caps were loose.' },
            recall(2),
          ],
        }}
        name="2021 Toyota RAV4"
      />,
    );
    const heading = screen.getByRole('heading', { name: 'Recalls in Canada' });
    expect(heading.parentElement).toHaveTextContent('1');
    expect(screen.getByText('1 more for the plug-in hybrid only')).toBeVisible();
  });
});
