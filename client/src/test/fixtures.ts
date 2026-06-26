import type { CarDashboard, CarSpecs } from '../types/car.types';

const sparseCar: CarSpecs = {
  id: 'test-sparse-corolla',
  make: 'Toyota',
  model: 'Corolla',
  year: 2020,
  provenance: {},
  engine: {
    fuelType: 'gasoline',
    displacement: 1.8,
    cylinders: 4,
    configuration: 'I4',
  },
  fuelEconomy: { city: 30, highway: 38, combined: 33 },
  transmission: { type: 'automatic', speeds: 8 },
  driveType: 'FWD',
  bodyStyle: 'sedan',
};

const emptyOwnership = {
  marketValue: {
    low: 0,
    high: 0,
    mid: 0,
    confidence: 'low' as const,
    confidenceLabel: 'Low',
  },
  annualCost: {
    energy: null,
    insurance: 0,
    maintenance: 0,
    tires: 0,
    registration: 0,
    total: null,
    totalLow: null,
    totalHigh: null,
  },
  resaleImpact: {
    currentValue: { low: 0, high: 0, mid: 0 },
    projectedResale5Year: { low: 0, high: 0, mid: 0 },
    estimatedLoss5Year: { low: 0, high: 0, mid: 0 },
    note: '',
  },
  derivedComparison: null,
  tco5Year: null,
  assumptions: {
    annualKm: '20,000 km',
    annualMiles: 12427,
    energyPriceNote: '',
    insuranceTier: 'sedan',
    depreciationNote: '',
    regionNote: 'Ontario, CAD',
  },
  warnings: [],
  practicalityNote: '',
};

/** Dashboard with EPA + estimated provenance for trust UI tests. */
export const trustDashboard: CarDashboard = {
  car: {
    ...sparseCar,
    id: 'test-trust-camry',
    make: 'Toyota',
    model: 'Camry',
    year: 2021,
    engine: { ...sparseCar.engine, horsepower: 203 },
    provenance: { 'fuelEconomy.combined': 'epa' },
    price: { msrp: 28000, isEstimated: true, confidenceLabel: 'Medium' },
  },
  segmentCount: 120,
  ownership: {
    ...emptyOwnership,
    marketValue: {
      low: 24000,
      high: 32000,
      mid: 28000,
      confidence: 'medium',
      confidenceLabel: 'Medium',
    },
  },
  dealRating: null,
  annualRunningCost: { low: 2800, high: 3600, mid: 3200 },
  tco5Year: { low: 40000, high: 50000, mid: 45000 },
  fieldProvenance: {
    'engine.horsepower': 'estimated',
    'price.msrp': 'estimated',
    'analytics.annualCost': 'estimated',
  },
  zeroToSixty: { value: 7.5, method: 'predicted', confidence: 'Low' },
};

/** Dashboard with many optional fields absent (no NHTSA, HP, torque, 0-60, market value). */
export const sparseDashboard: CarDashboard = {
  car: sparseCar,
  segmentCount: 120,
  ownership: emptyOwnership,
  dealRating: null,
  annualRunningCost: null,
  tco5Year: null,
  fieldProvenance: {},
};
