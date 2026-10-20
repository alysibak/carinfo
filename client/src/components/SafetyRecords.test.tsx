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
});
