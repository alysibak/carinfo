import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { useGarageStore } from '../stores/garageStore';
import { fakeAuth } from '../test/fakeAuthClient';
import type { CarSpecs } from '../types/car.types';
import RequireAccount from './RequireAccount';

function renderTool(path = '/compare', tool = 'Compare') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <RequireAccount tool={tool}>
        <p>The tool</p>
      </RequireAccount>
    </MemoryRouter>,
  );
}

describe('RequireAccount', () => {
  afterEach(() => useGarageStore.setState({ cars: [] }));

  it('asks a visitor to sign in, and brings them back after', () => {
    fakeAuth.signedOut();
    renderTool('/compare?ids=a,b');
    expect(screen.getByRole('heading', { name: 'Sign in to use Compare' })).toBeInTheDocument();
    expect(screen.queryByText('The tool')).toBeNull();
    const next = encodeURIComponent('/compare?ids=a,b');
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      `/sign-in?next=${next}`,
    );
    expect(screen.getByRole('link', { name: 'Create free account' })).toHaveAttribute(
      'href',
      `/sign-up?next=${next}`,
    );
  });

  it('opens the tool to a member', () => {
    fakeAuth.signedIn();
    renderTool();
    expect(screen.getByText('The tool')).toBeInTheDocument();
  });

  it('leaves the tool open where accounts are not set up', () => {
    fakeAuth.unavailable();
    renderTool();
    expect(screen.getByText('The tool')).toBeInTheDocument();
  });

  it('waits for the session rather than flashing the sign-in screen', () => {
    fakeAuth.loading();
    renderTool();
    expect(screen.getByRole('status')).toHaveTextContent('Checking your sign-in');
    expect(screen.queryByRole('heading')).toBeNull();
  });

  it("tells a visitor their device's garage comes with them", () => {
    fakeAuth.signedOut();
    useGarageStore.setState({ cars: [{ id: 'a' }, { id: 'b' }] as CarSpecs[] });
    renderTool('/garage', 'Dream Garage');
    expect(screen.getByText(/2 cars saved on this device/)).toBeInTheDocument();
  });
});
