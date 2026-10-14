import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CarPhotoButton from './CarPhotoButton';
import { sparseDashboard } from '../test/fixtures';

const car = sparseDashboard.car;
const FILE = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ab/Corolla.jpg';
const photographed = {
  ...car,
  photo: {
    src: `${FILE}/500px-Corolla.jpg`,
    page: 'https://commons.wikimedia.org/wiki/File:Corolla.jpg',
    credit: 'Jane Doe, CC BY-SA 4.0',
    caption: '2020 Toyota Corolla SE, front 6.27.20',
    generation: 'Toyota Corolla (E210)',
  },
};

describe('CarPhotoButton', () => {
  it('is not there for a car without a photo, or with one from elsewhere', () => {
    const { container, rerender } = render(<CarPhotoButton car={car} />);
    expect(container).toBeEmptyDOMElement();
    rerender(
      <CarPhotoButton
        car={{
          ...photographed,
          photo: { ...photographed.photo, src: 'https://example.com/a.jpg' },
        }}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('loads nothing until opened, then shows the photo large, with what it is and whose', () => {
    render(<CarPhotoButton car={photographed} />);
    expect(screen.queryByRole('img')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'See photo' }));

    const dialog = screen.getByRole('dialog', { name: /2020 Toyota Corolla/ });
    const img = screen.getByRole('img', { name: 'Photo: 2020 Toyota Corolla SE, front 6.27.20' });
    expect(img).toHaveAttribute('src', `${FILE}/960px-Corolla.jpg`);
    expect(dialog).toHaveTextContent('Toyota Corolla (E210)');
    expect(dialog).toHaveTextContent('A photo of this model year');
    expect(screen.getByRole('link', { name: 'Jane Doe, CC BY-SA 4.0' })).toHaveAttribute(
      'href',
      'https://commons.wikimedia.org/wiki/File:Corolla.jpg',
    );
  });

  it('falls back to the smaller copy, then says where to see it', () => {
    render(<CarPhotoButton car={photographed} />);
    fireEvent.click(screen.getByRole('button', { name: 'See photo' }));
    fireEvent.error(screen.getByRole('img'));
    const smaller = screen.getByRole('img');
    expect(smaller).toHaveAttribute('src', `${FILE}/500px-Corolla.jpg`);
    fireEvent.error(smaller);
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByRole('link', { name: 'See it on Wikimedia Commons' })).toBeInTheDocument();
  });

  it('closes on Escape', () => {
    render(<CarPhotoButton car={photographed} label="Photo" />);
    fireEvent.click(screen.getByRole('button', { name: 'Photo' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
