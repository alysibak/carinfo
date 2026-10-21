import type { ComponentProps } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
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
  it('summarizes what is from records and what is estimated without dumping the field list', () => {
    renderPanel({ dashboard: trustDashboard });

    expect(screen.getByText('Where each figure comes from')).toBeInTheDocument();
    expect(screen.getByText(/from public records/i)).toBeInTheDocument();
    expect(screen.getByText(/estimated/i)).toBeInTheDocument();
    expect(screen.queryByText('Combined fuel economy')).not.toBeInTheDocument();
  });

  it('reveals field sources when expanded', () => {
    renderPanel({ dashboard: trustDashboard });

    fireEvent.click(screen.getByRole('button', { name: /where each figure comes from/i }));

    expect(screen.getByText('Combined fuel economy')).toBeInTheDocument();
    expect(screen.getByText('Horsepower')).toBeInTheDocument();
  });
});
