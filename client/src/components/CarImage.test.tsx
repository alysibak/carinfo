import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CarImage from './CarImage';
import { sparseDashboard } from '../test/fixtures';

const car = sparseDashboard.car;
const COMMONS = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Corolla.jpg';
const photographed = {
  ...car,
  photo: {
    src: `${COMMONS}/500px-Corolla.jpg`,
    thumb: `${COMMONS}/250px-Corolla.jpg`,
    page: 'https://commons.wikimedia.org/wiki/File:Corolla.jpg',
    credit: 'Jane Doe, CC BY-SA 4.0',
    generation: 'Toyota Corolla (E210)',
    caption: '2020 Corolla SE sedan',
  },
};

describe('CarImage', () => {
  it('shows the generation’s photo, small in cards, with what it shows', () => {
    render(<CarImage car={photographed} />);
    const img = screen.getByRole('img', { name: /photo of the Toyota Corolla \(E210\)/i });
    expect(img).toHaveAttribute('src', `${COMMONS}/250px-Corolla.jpg`);
    expect(img).toHaveAttribute('title', expect.stringContaining('Jane Doe, CC BY-SA 4.0'));
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('credits the photographer on the car page, linked to the photo’s page', () => {
    render(<CarImage car={photographed} size="large" credit />);
    expect(screen.getByRole('img')).toHaveAttribute('src', `${COMMONS}/500px-Corolla.jpg`);
    expect(screen.getByRole('link', { name: 'Photo: Jane Doe, CC BY-SA 4.0' })).toHaveAttribute(
      'href',
      'https://commons.wikimedia.org/wiki/File:Corolla.jpg',
    );
  });

  it('falls back to the other copy, then to the illustration', () => {
    render(<CarImage car={photographed} />);
    fireEvent.error(screen.getByRole('img', { name: /photo of the/i }));
    const other = screen.getByRole('img', { name: /photo of the/i });
    expect(other).toHaveAttribute('src', `${COMMONS}/500px-Corolla.jpg`);
    fireEvent.error(other);
    expect(screen.queryByRole('img', { name: /photo of the/i })).toBeNull();
    expect(screen.getByRole('img', { name: /illustration placeholder/i })).toBeInTheDocument();
  });

  it('draws the illustration for a car without a photo, or with one from elsewhere', () => {
    const { rerender } = render(<CarImage car={car} />);
    expect(screen.getByRole('img', { name: /illustration placeholder/i })).toBeInTheDocument();
    const elsewhere = {
      ...photographed.photo,
      src: 'https://example.com/a.jpg',
      thumb: 'https://example.com/b.jpg',
    };
    rerender(<CarImage car={{ ...car, photo: elsewhere }} />);
    expect(screen.getByRole('img', { name: /illustration placeholder/i })).toBeInTheDocument();
  });
});
