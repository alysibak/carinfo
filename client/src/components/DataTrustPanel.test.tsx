import type { ComponentProps } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import DataTrustPanel from './DataTrustPanel';
import { trustDashboard } from '../test/fixtures';

function renderPanel(props: ComponentProps<typeof DataTrustPanel>) {
  return render(
    <MemoryRouter>
      <DataTrustPanel {...props} />
    </MemoryRouter>,
  );
}

describe('DataTrustPanel', () => {
  it('lists provenance entries with source chips', () => {
    renderPanel({ dashboard: trustDashboard, filter: 'all', onFilterChange: vi.fn() });

    expect(screen.getByText('Data sources')).toBeInTheDocument();
    expect(screen.getByText('Fuel economy')).toBeInTheDocument();
    expect(screen.getByText('Horsepower')).toBeInTheDocument();
    expect(screen.getAllByText('EPA').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Est.').length).toBeGreaterThan(0);
  });

  it('filters to verified-only entries', () => {
    const onFilterChange = vi.fn();
    renderPanel({ dashboard: trustDashboard, filter: 'all', onFilterChange });

    fireEvent.click(screen.getByRole('button', { name: 'Verified' }));
    expect(onFilterChange).toHaveBeenCalledWith('verified');
  });

  it('hides estimated chips when filter is verified', () => {
    renderPanel({ dashboard: trustDashboard, filter: 'verified', onFilterChange: vi.fn() });

    const verifiedOnly = screen.queryAllByText('Est.');
    expect(verifiedOnly.length).toBe(0);
  });
});
