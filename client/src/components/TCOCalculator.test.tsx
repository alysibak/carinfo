import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CarSpecs, OwnershipEconomics } from '../types/car.types';
import TCOCalculator from './TCOCalculator';
import { computeTco, defaultTcoInputs } from '../utils/tco';

const camry: CarSpecs = {
  id: 'camry',
  make: 'Toyota',
  model: 'Camry',
  year: 2022,
  provenance: {},
  engine: { fuelType: 'gasoline', displacement: 2.5, cylinders: 4 },
  fuelEconomy: { city: 28, highway: 39, combined: 32 },
  transmission: { type: 'automatic' },
  driveType: 'FWD',
  bodyStyle: 'sedan',
};

const ownership = {
  marketValue: { low: 26000, high: 32000, mid: 29000, confidence: 'medium', confidenceLabel: '' },
  annualCost: {
    energy: 1500,
    insurance: 2100,
    maintenance: 900,
    tires: 250,
    registration: 120,
    total: 4870,
    totalLow: 4383,
    totalHigh: 5454,
  },
  resaleImpact: {
    currentValue: { low: 26000, high: 32000, mid: 29000 },
    projectedResale5Year: { low: 15000, high: 20000, mid: 17400 },
    estimatedLoss5Year: { low: 10000, high: 13000, mid: 11600 },
    note: '',
  },
  derivedComparison: null,
  tco5Year: null,
  assumptions: {},
  warnings: [],
  practicalityNote: '',
} as unknown as OwnershipEconomics;

function renderCalc(car: CarSpecs = camry, onClose = vi.fn()) {
  render(<TCOCalculator car={car} ownership={ownership} region="ontario" onClose={onClose} />);
  return { onClose, dialog: screen.getByRole('dialog', { name: /total cost of ownership/i }) };
}

describe('TCOCalculator', () => {
  it('is an accessible modal dialog', () => {
    const { dialog } = renderCalc();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('button', { name: /close cost calculator/i })).toBeInTheDocument();
  });

  it('associates every input with its label', () => {
    renderCalc();
    // getByLabelText only succeeds when label and input are actually linked.
    for (const name of [
      /years owned/i,
      /purchase price/i,
      /distance per year/i,
      /insurance/i,
      /maintenance/i,
    ]) {
      expect(screen.getByLabelText(name)).toBeInTheDocument();
    }
  });

  it('opens on the dossier estimate', () => {
    const { dialog } = renderCalc();
    const expected = computeTco(
      camry,
      defaultTcoInputs(camry, ownership, 'ontario'),
      ownership,
    ).total;
    expect(within(dialog).getByText(`$${expected.toLocaleString()}`)).toBeInTheDocument();
    expect(screen.getByText(/matches the dossier’s estimate/i)).toBeInTheDocument();
  });

  it('recomputes when an assumption changes, and can be reset', () => {
    renderCalc();
    const years = screen.getByLabelText(/years owned/i);
    fireEvent.change(years, { target: { value: '8' } });
    expect(screen.getByText(/8-year total/i)).toBeInTheDocument();
    expect(screen.queryByText(/matches the dossier’s estimate/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /reset/i }));
    expect(screen.getByText(/5-year total/i)).toBeInTheDocument();
  });

  it('shows loan fields only when financed', () => {
    renderCalc();
    expect(screen.queryByLabelText(/interest rate/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: /financed/i }));
    expect(screen.getByLabelText(/interest rate/i)).toBeInTheDocument();
    expect(screen.getByText(/loan interest/i)).toBeInTheDocument();
  });

  it('hides price inputs for hydrogen and explains the EPA basis', () => {
    const mirai: CarSpecs = {
      ...camry,
      id: 'mirai',
      model: 'Mirai',
      engine: { fuelType: 'hydrogen' },
      fuelEconomy: { city: 76, highway: 71, combined: 74 },
      epa: { annualFuelCost: 4800 } as CarSpecs['epa'],
    };
    renderCalc(mirai);
    expect(screen.queryByLabelText(/gas price/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/electricity rate/i)).not.toBeInTheDocument();
    expect(screen.getByText(/hydrogen cost uses epa’s own annual estimate/i)).toBeInTheDocument();
  });

  it('says fuel is not on file rather than showing $0', () => {
    renderCalc({ ...camry, fuelEconomy: { city: 0, highway: 0, combined: 0 } });
    expect(screen.getByText('Not on file')).toBeInTheDocument();
    expect(screen.getByText(/left out of the total rather than guessed/i)).toBeInTheDocument();
  });

  it('closes on Escape', () => {
    const { onClose } = renderCalc();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('locks background scroll while open and restores it on close', () => {
    document.body.style.overflow = 'auto';
    const { unmount } = render(
      <TCOCalculator car={camry} ownership={ownership} region="ontario" onClose={() => {}} />,
    );
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('auto');
  });
});
