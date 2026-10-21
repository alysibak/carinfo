import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CarImage from './CarImage';
import { sparseDashboard } from '../test/fixtures';

const car = sparseDashboard.car;
const FILE = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ab/Corolla.jpg';
const photo = {
  src: `${FILE}/500px-Corolla.jpg`,
  page: 'https://commons.wikimedia.org/wiki/File:Corolla.jpg',
  credit: 'Jane Doe, CC BY-SA 4.0',
  caption: '2020 Toyota Corolla SE, front 6.27.20',
};

describe('CarImage', () => {
  it('shows the photo, lazily, with the larger copy for wide frames', () => {
    const { container } = render(<CarImage car={{ ...car, photo }} />);
    const img = container.querySelector('img:not([aria-hidden])')!;
    expect(img).toHaveAttribute('src', `${FILE}/500px-Corolla.jpg`);
    expect(img).toHaveAttribute(
      'srcset',
      `${FILE}/500px-Corolla.jpg 500w, ${FILE}/960px-Corolla.jpg 960w`,
    );
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(screen.queryByText(/photo$/)).toBeNull();
  });

  it('marks a photo of another year with it', () => {
    render(
      <CarImage
        car={{ ...car, photo: { ...photo, otherYear: { year: 2021, generation: [2019, 2025] } } }}
      />,
    );
    expect(screen.getByText('2021 photo')).toBeInTheDocument();
  });

  it('shows the illustration without a photo, or when the photo fails', () => {
    render(<CarImage car={car} />);
    expect(screen.getByRole('img', { name: /illustration placeholder/ })).toBeInTheDocument();
    const { container } = render(<CarImage car={{ ...car, photo }} />);
    fireEvent.error(container.querySelector('img')!);
    expect(container.querySelector('[role="img"]')).not.toBeNull();
  });
});
