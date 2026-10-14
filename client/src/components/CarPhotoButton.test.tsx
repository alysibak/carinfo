import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CarPhotoButton from './CarPhotoButton';
import { photoYearsLabel } from '../utils/carImages';
import { sparseDashboard } from '../test/fixtures';

const car = sparseDashboard.car;
const FILE = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ab/Corolla.jpg';
const photographed = {
  ...car,
  photo: {
    src: `${FILE}/500px-Corolla.jpg`,
    page: 'https://commons.wikimedia.org/wiki/File:Corolla.jpg',
    credit: 'Jane Doe, CC BY-SA 4.0',
    generation: 'Toyota Corolla (E210)',
    years: { from: 2019, to: 2025 },
    caption: '2020 Corolla SE sedan',
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
    const img = screen.getByRole('img', { name: 'Photo of the Toyota Corolla (E210)' });
    expect(img).toHaveAttribute('src', `${FILE}/960px-Corolla.jpg`);
    expect(dialog).toHaveTextContent('2019–2025 models');
    expect(dialog).toHaveTextContent('2020 Corolla SE sedan');
    expect(dialog).toHaveTextContent('not of this exact car');
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

describe('photoYearsLabel', () => {
  it('says model years, or years built, and runs to now', () => {
    expect(photoYearsLabel({ from: 2016, to: 2021 }, 2026)).toBe('2016–2021 models');
    expect(photoYearsLabel({ from: 2014, to: 2021, built: true }, 2026)).toBe('built 2014–2021');
    expect(photoYearsLabel({ from: 2022, to: 2027 }, 2026)).toBe('2022 models on');
    expect(photoYearsLabel({ from: 2022, to: 2027, built: true }, 2026)).toBe('built since 2022');
    expect(photoYearsLabel(undefined)).toBeNull();
  });
});
