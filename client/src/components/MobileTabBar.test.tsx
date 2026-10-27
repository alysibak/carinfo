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
    renderBar('/browse');
    expect(screen.getByRole('link', { name: 'Browse' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Search' })).not.toHaveAttribute('aria-current');
  });

  it('carries the count of cars waiting in Compare', () => {
    useCarStore.setState({ comparedCars: [sampleCar, { ...sampleCar, id: 'other' }] });
    renderBar();
    expect(screen.getByRole('link', { name: 'Compare, 2' })).toHaveAttribute('href', '/compare');
  });

  it('opens and closes the site menu from More', () => {
    renderBar();
    const more = screen.getByRole('button', { name: 'More' });
    fireEvent.click(more);
    expect(useMenuStore.getState().open).toBe(true);
    expect(more).toHaveAttribute('aria-expanded', 'true');
    // A tab taken while the menu is open closes it.
    fireEvent.click(screen.getByRole('link', { name: 'Browse' }));
    expect(useMenuStore.getState().open).toBe(false);
  });
});
