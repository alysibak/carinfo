import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import ValuationLinks from './ValuationLinks';
import { useRegionStore } from '../stores/regionStore';

describe('ValuationLinks', () => {
  afterEach(() => useRegionStore.setState({ region: 'ontario' }));

  it('names the region the reader picked, not always Ontario', () => {
    useRegionStore.setState({ region: 'british-columbia' });
    render(<ValuationLinks compact />);
    fireEvent.click(screen.getByRole('button', { name: /how these estimates work/i }));
    expect(screen.getByRole('dialog')).toHaveTextContent('built for British Columbia drivers');
    expect(document.body).not.toHaveTextContent(/Ontario/);
  });
});
