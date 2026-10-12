import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CarImage from './CarImage';
import { sparseDashboard } from '../test/fixtures';

const car = sparseDashboard.car;
const photographed = {
  ...car,
  photo: { file: '13416_st0640_046.png', caption: '2020 Toyota Corolla 4 DR FWD' },
};

describe('CarImage', () => {
  it('shows NHTSA’s photo, resized, with the test car named', () => {
    render(<CarImage car={photographed} credit />);
    const img = screen.getByRole('img', { name: /2020 Toyota Corolla.*photographed by NHTSA/i });
    expect(img.getAttribute('src')).toBe(
      `/_vercel/image?url=${encodeURIComponent('https://static.nhtsa.gov/images/vehicles/13416_st0640_046.png')}&w=256&q=75`,
    );
    expect(img).toHaveAttribute('title', expect.stringContaining('2020 Toyota Corolla 4 DR FWD'));
    expect(screen.getByText('Photo: NHTSA')).toBeInTheDocument();
  });

  it('falls back to the original, then to the illustration', () => {
    render(<CarImage car={photographed} />);
    fireEvent.error(screen.getByRole('img', { name: /photographed by NHTSA/i }));
    const original = screen.getByRole('img', { name: /photographed by NHTSA/i });
    expect(original.getAttribute('src')).toBe(
      'https://static.nhtsa.gov/images/vehicles/13416_st0640_046.png',
    );
    fireEvent.error(original);
    expect(screen.queryByRole('img', { name: /photographed by NHTSA/i })).toBeNull();
    expect(screen.getByRole('img', { name: /illustration placeholder/i })).toBeInTheDocument();
  });

  it('draws the illustration for a car without a photo, or with a bad file name', () => {
    const { rerender } = render(<CarImage car={car} />);
    expect(screen.getByRole('img', { name: /illustration placeholder/i })).toBeInTheDocument();
    rerender(<CarImage car={{ ...car, photo: { file: '../x.png', caption: '' } }} />);
    expect(screen.getByRole('img', { name: /illustration placeholder/i })).toBeInTheDocument();
  });
});
