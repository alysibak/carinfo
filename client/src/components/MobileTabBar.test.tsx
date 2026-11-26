import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import MobileTabBar from './MobileTabBar';
import { useCarStore } from '../stores/carStore';
import { useMenuStore } from '../stores/menuStore';
import { trustDashboard } from '../test/fixtures';

const sampleCar = trustDashboard.car;

function renderBar(path = '/home') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <MobileTabBar />
    </MemoryRouter>,
  );
}

describe('MobileTabBar', () => {
  beforeEach(() => {
    useMenuStore.setState({ open: false });
    useCarStore.setState({ comparedCars: [] });
  });

  it('marks the page you are on', () => {
    renderBar('/vin');
    expect(screen.getByRole('link', { name: 'Scan' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Search' })).not.toHaveAttribute('aria-current');
  });

  it('carries the count of cars waiting in Compare', () => {
    useCarStore.setState({ comparedCars: [sampleCar, { ...sampleCar, id: 'other' }] });
    renderBar();
    expect(screen.getByRole('link', { name: 'Compare, 2' })).toHaveAttribute('href', '/compare');
  });

  it('leads with Home, lit on the home page alone', () => {
    renderBar('/');
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Search' })).not.toHaveAttribute('aria-current');
    // Every path starts with "/": Home must not light on the others.
    renderBar('/garage');
    expect(screen.getAllByRole('link', { name: 'Home' })[1]).not.toHaveAttribute('aria-current');
    expect(screen.queryByRole('button', { name: 'More' })).toBeNull();
  });

  it('closes the header’s menu, left open sideways, when a tab is taken', () => {
    useMenuStore.setState({ open: true });
    renderBar();
    fireEvent.click(screen.getByRole('link', { name: 'Scan' }));
    expect(useMenuStore.getState().open).toBe(false);
  });
});
