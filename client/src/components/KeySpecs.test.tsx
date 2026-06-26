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
    expect(screen.queryByText('0–60 mph')).not.toBeInTheDocument();
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
});
