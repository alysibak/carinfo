import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useRegionStore } from '../stores/regionStore';
import { LIEN_CHECKS } from '../config/privateSale';
import PrivateSaleChecks from './PrivateSaleChecks';

describe('PrivateSaleChecks', () => {
  beforeEach(() => useRegionStore.setState({ region: 'ontario' }));

  it('starts at the visitor’s province, with its official page', () => {
    render(<PrivateSaleChecks />);
    expect(screen.getByText(/Used Vehicle Information Package/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'How, on ontario.ca' })).toHaveAttribute(
      'href',
      'https://www.ontario.ca/page/used-vehicle-information-package',
    );
  });

  it('shows another province’s lien search when picked', () => {
    render(<PrivateSaleChecks />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'quebec' } });
    expect(screen.getByText(/RDPRM/)).toBeInTheDocument();
  });

  it('has an official https page for every province', () => {
    for (const check of Object.values(LIEN_CHECKS)) expect(check.url).toMatch(/^https:\/\//);
    expect(Object.keys(LIEN_CHECKS)).toHaveLength(10);
  });
});
