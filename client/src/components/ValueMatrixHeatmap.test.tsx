import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ValueMatrixHeatmap from './ValueMatrixHeatmap';
import type { ChartDensityCell, ChartDensityResult } from '../services/api';

const cell = (priceMin: number, yMin: number, count: number, body = 'sedan'): ChartDensityCell => ({
  priceMin,
  priceMax: priceMin + 10_000,
  yMin,
  yMax: yMin + 5,
  count,
  dominantBodyStyle: body,
});

const density: ChartDensityResult = {
  total: 1_700,
  metric: 'mpg',
  priceMin: 0,
  priceMax: 80_000,
  yMin: 10,
  yMax: 60,
  priceBins: 8,
  yBins: 10,
  cells: [
    cell(0, 20, 40),
    cell(20_000, 25, 900),
    cell(30_000, 30, 300, 'suv'),
    cell(10_000, 35, 12),
    cell(40_000, 15, 250, 'truck'),
    cell(50_000, 20, 120),
    cell(60_000, 10, 70),
    cell(70_000, 40, 8),
  ],
};

beforeEach(() => {
  // jsdom has neither; the component only needs them not to throw.
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('ValueMatrixHeatmap', () => {
  it('describes the chart for screen readers, naming the busiest area', () => {
    render(
      <ValueMatrixHeatmap
        density={density}
        height={300}
        yLabel="Combined MPG"
        onCellSelect={vi.fn()}
      />,
    );
    expect(screen.getByRole('img')).toHaveAccessibleName(
      'Heat map of 1,700 vehicles by estimated value and Combined MPG. Busiest area: $20k–$30k · 25–30 MPG, 900 vehicles.',
    );
  });

  it('offers the densest cells, busiest first, as buttons that zoom in', () => {
    const onCellSelect = vi.fn();
    render(
      <ValueMatrixHeatmap
        density={density}
        height={300}
        yLabel="Combined MPG"
        onCellSelect={onCellSelect}
      />,
    );
    const buttons = within(screen.getByRole('list')).getAllByRole('button');
    expect(buttons).toHaveLength(6);
    expect(buttons[0]).toHaveTextContent('$20k–$30k · 25–30 MPG');
    expect(buttons[0]).toHaveTextContent('900 · mostly sedan');
    expect(buttons[1]).toHaveTextContent('300 · mostly suv');

    fireEvent.click(buttons[2]);
    expect(onCellSelect).toHaveBeenCalledWith(density.cells[4]);
  });
});
