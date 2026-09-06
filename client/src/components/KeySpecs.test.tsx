import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import KeySpecs from './KeySpecs';
import { UNAVAILABLE_LABEL } from '../utils/dataValue';
import { sparseDashboard } from '../test/fixtures';

describe('KeySpecs omit-when-empty', () => {
  it('omits groups and rows for absent data on the dossier', () => {
    render(<KeySpecs dashboard={sparseDashboard} />);

    expect(screen.queryByText(UNAVAILABLE_LABEL)).not.toBeInTheDocument();
    expect(screen.queryByText('Crash safety')).not.toBeInTheDocument();
    expect(screen.queryByText('Torque')).not.toBeInTheDocument();
    expect(screen.queryByText('0-60 mph')).not.toBeInTheDocument();
    expect(screen.queryByText('Emissions score')).not.toBeInTheDocument();
    expect(screen.queryByText('Est. MSRP')).not.toBeInTheDocument();
  });

  it('renders only rows that have real values', () => {
    render(<KeySpecs dashboard={sparseDashboard} />);

    expect(screen.getByText('Specifications')).toBeInTheDocument();
    expect(screen.getByText('Powertrain')).toBeInTheDocument();
    expect(screen.getByText('1.8L I4')).toBeInTheDocument();
    expect(screen.getByText('33')).toBeInTheDocument();
  });

  it('omits rows the dossier already showed', () => {
    render(<KeySpecs dashboard={sparseDashboard} omitKeys={['engine', 'mpgCombined']} />);

    expect(screen.queryByText('1.8L I4')).not.toBeInTheDocument();
    expect(screen.queryByText('33')).not.toBeInTheDocument();
    expect(screen.getByText('Powertrain')).toBeInTheDocument();
  });
});

describe('KeySpecs long values', () => {
  // A long value used to keep its full width beside the label and punch out of
  // the card, overlapping the next column and forcing horizontal page scroll.
  const longValue = 'Standard Sport Utility Vehicle 4WD';
  const dashboard = {
    ...sparseDashboard,
    car: {
      ...sparseDashboard.car,
      epa: { ...(sparseDashboard.car.epa ?? {}), vClass: longValue },
    },
  } as typeof sparseDashboard;

  function rowFor(text: string) {
    // the row is the flex container wrapping the label and the value
    return screen.getByText(text).closest('div');
  }

  it('stacks a value too long to sit beside its label', () => {
    render(<KeySpecs dashboard={dashboard} />);
    expect(screen.getByText(longValue)).toBeInTheDocument();
    expect(rowFor(longValue)?.parentElement?.className).toContain('flex-col');
  });

  it('keeps a short value on the same line as its label', () => {
    render(<KeySpecs dashboard={dashboard} />);
    const row = rowFor('1.8L I4')?.parentElement;
    expect(row?.className).toContain('items-baseline');
    expect(row?.className).not.toContain('flex-col');
  });
});

