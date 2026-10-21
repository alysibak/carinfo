import { fireEvent, render, screen } from '@testing-library/react';
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
  it('lists Transport Canada’s recalls with their numbers, a few at first', () => {
    render(
      <SafetyRecords
        dashboard={{ ...sparseDashboard, recalls: [1, 2, 3, 4, 5].map(recall) }}
        name="2018 Toyota Camry"
      />,
    );
    expect(
      screen.getByText(/Transport Canada lists 5 recalls for the 2018 Toyota Camry/),
    ).toBeVisible();
    expect(
      screen.getByText(/Transport Canada recall 202101 · 7,302 vehicles in Canada/),
    ).toBeVisible();
    expect(screen.getAllByText(/^The pump \d may fail\.$/)).toHaveLength(4);
    fireEvent.click(screen.getByRole('button', { name: 'Show all 5 recalls' }));
    expect(screen.getAllByText(/^The pump \d may fail\.$/)).toHaveLength(5);
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
    expect(
      screen.getByText(/Transport Canada lists no recalls for the 2018 Toyota Camry/),
    ).toBeVisible();
    expect(
      screen.getByText(/776 owner complaints about the 2018 Toyota Camry to NHTSA/),
    ).toBeVisible();
    expect(screen.getByText('Power train')).toBeVisible();
    expect(screen.getByText('12 reporting a crash · 3 injuries')).toBeVisible();
  });

  it('lists NHTSA’s investigations, the open ones first, with their numbers', () => {
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
    expect(
      screen.getByText(
        /has investigated 2 possible defects in the 2017 Honda CR-V, one still open/,
      ),
    ).toBeVisible();
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Engine and engine cooling · open');
    expect(items[0]).toHaveTextContent('Preliminary evaluation PE19003 · opened Mar 11, 2019');
    expect(items[1]).toHaveTextContent(
      'Recall query RQ21004 · opened Jun 1, 2021 · closed Feb 1, 2022 · led to recall 22V045000',
    );
    expect(items[1]).toHaveTextContent('Brake booster failure');
  });

  it('lists another powertrain’s recalls apart, under their own heading', () => {
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
    expect(
      screen.getByText(
        /Transport Canada lists 2 recalls for the 2021 Toyota RAV4: 1 can cover this version, and 1 is for the plug-in hybrid alone\./,
      ),
    ).toBeVisible();
    expect(screen.getByText('1 recall for other versions')).toBeVisible();
    expect(screen.getByText(/for the plug-in hybrid/, { selector: 'span' })).toBeInTheDocument();
  });
});
