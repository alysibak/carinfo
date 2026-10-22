import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import RecentlyViewed from './RecentlyViewed';
import { MAX_RECENT, useRecentStore, type RecentCar } from '../stores/recentStore';

const car = (n: number): RecentCar => ({
  id: `car-${n}`,
  title: `202${n} Honda Civic`,
  detail: 'Sedan · CVT · FWD',
});

describe('RecentlyViewed', () => {
  beforeEach(() => useRecentStore.getState().clear());

  it('shows nothing until a car page has been opened', () => {
    const { container } = render(<RecentlyViewed />, { wrapper: MemoryRouter });
    expect(container).toBeEmptyDOMElement();
  });

  it('keeps each car once, newest first, and only the last few', () => {
    const { record } = useRecentStore.getState();
    for (let n = 0; n < MAX_RECENT + 2; n++) record(car(n));
    record(car(3));
    const ids = useRecentStore.getState().cars.map((c) => c.id);
    expect(ids).toHaveLength(MAX_RECENT);
    expect(ids[0]).toBe('car-3');
    expect(ids.filter((id) => id === 'car-3')).toHaveLength(1);
    expect(ids).not.toContain('car-0');
  });

  it('links a row of them, leaving out the car on screen, and clears on request', () => {
    const { record } = useRecentStore.getState();
    [1, 2, 3].forEach((n) => record(car(n)));
    render(<RecentlyViewed exclude="car-3" />, { wrapper: MemoryRouter });
    const links = screen.getAllByRole('link');
    expect(links.map((l) => l.getAttribute('href'))).toEqual(['/car/car-2', '/car/car-1']);
    expect(links[0]).toHaveTextContent('2022 Honda CivicSedan · CVT · FWD');
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.queryByRole('heading', { name: 'Recently viewed' })).toBeNull();
  });
});
