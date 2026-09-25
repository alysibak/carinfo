import {
  estimateAnnualEnergyCost,
  type EnergyCostBasis,
  type EnergyPriceInputs,
} from '@carinfo/shared/energy-cost';
import { getRegionalAssumptions, type RegionId } from '@carinfo/config/regional-assumptions';
import type { CarSpecs, OwnershipEconomics } from '../types/car.types';

/**
 * Total-cost-of-ownership what-if model behind the "Custom TCO calculator".
 *
 * At its default inputs this reproduces the dossier's own 5-year estimate to
 * the dollar, because it starts from the same numbers the server computed
 * (market value, projected resale, annual running costs) and prices energy with
 * the same shared engine. The user then moves individual assumptions from
 * there. It used to be a separate implementation with its own depreciation rule
 * and a cost function that priced hydrogen as gasoline, so the modal and the
 * page it opened from showed different totals for the same car.
 */

/** Used only when the dossier did not load: ~15%/yr compounding value loss. */
const GENERIC_ANNUAL_RETENTION = 0.85;

export interface TcoInputs extends EnergyPriceInputs {
  /**
   * The dossier is priced for the visitor's selected region; the calculator
   * must start from the same one. It used to always use Ontario, so a B.C.
   * visitor saw B.C. figures on the page and Ontario ones in the modal.
   */
  region: RegionId;
  yearsOwned: number;
  purchasePrice: number;
  insurancePerYear: number;
  maintenancePerYear: number;
  tiresPerYear: number;
  registrationPerYear: number;
  financed: boolean;
  downPayment: number;
  /** Annual percentage rate as a fraction (0.05 = 5%). */
  loanRate: number;
}

export interface TcoResult {
  total: number;
  monthly: number;
  depreciation: number;
  resaleValue: number;
  interest: number;
  monthlyLoanPayment: number;
  /** Null when the record lacks what an energy estimate needs. */
  energy: { annual: number; total: number; basis: EnergyCostBasis } | null;
  insurance: number;
  maintenance: number;
  tires: number;
  registration: number;
  /** True when the depreciation curve came from the dossier, not the fallback. */
  depreciationFromDossier: boolean;
}

/**
 * Fraction of value kept per year, derived from the dossier's own 5-year
 * projection so a custom horizon stays on this car's depreciation curve.
 */
export function annualRetention(ownership?: OwnershipEconomics | null): {
  rate: number;
  fromDossier: boolean;
} {
  const now = ownership?.resaleImpact?.currentValue?.mid;
  const in5 = ownership?.resaleImpact?.projectedResale5Year?.mid;
  if (now != null && now > 0 && in5 != null && in5 >= 0) {
    return { rate: Math.pow(in5 / now, 1 / 5), fromDossier: true };
  }
  return { rate: GENERIC_ANNUAL_RETENTION, fromDossier: false };
}

/** Starting inputs that reproduce the dossier's estimate. */
export function defaultTcoInputs(
  car: CarSpecs,
  ownership: OwnershipEconomics | null | undefined,
  region: RegionId,
): TcoInputs {
  const annual = ownership?.annualCost;
  const assumptions = getRegionalAssumptions(region);
  return {
    region,
    annualKm: assumptions.annualKm,
    gasPriceCadPerL: assumptions.gasPriceCadPerL,
    dieselPriceCadPerL: assumptions.dieselPriceCadPerL,
    electricityRateCadPerKwh: assumptions.electricityRateCadPerKwh,
    yearsOwned: 5,
    purchasePrice: Math.round(ownership?.marketValue?.mid ?? car.price?.msrp ?? 0),
    insurancePerYear: annual?.insurance ?? 0,
    maintenancePerYear: annual?.maintenance ?? 0,
    tiresPerYear: annual?.tires ?? 0,
    registrationPerYear: annual?.registration ?? 0,
    // The dossier's figure excludes financing, so the calculator starts as cash.
    financed: false,
    downPayment: 0,
    loanRate: 0.0599,
  };
}

/**
 * Standard amortized payment. A 0% rate is a real offer (manufacturer
 * financing) and must not divide by zero — the previous implementation
 * returned NaN there, and NaN propagated into the displayed total.
 */
export function monthlyPayment(principal: number, annualRate: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  if (annualRate <= 0) return principal / months;
  const r = annualRate / 12;
  return (principal * r) / (1 - Math.pow(1 + r, -months));
}

export function computeTco(
  car: CarSpecs,
  inputs: TcoInputs,
  ownership?: OwnershipEconomics | null,
): TcoResult {
  const years = Math.max(1, Math.round(inputs.yearsOwned));
  const price = Math.max(0, inputs.purchasePrice);

  const { rate, fromDossier } = annualRetention(ownership);
  const resaleValue = Math.round(price * Math.pow(rate, years));
  const depreciation = price - resaleValue;

  let interest = 0;
  let payment = 0;
  if (inputs.financed) {
    const principal = Math.max(0, price - Math.max(0, inputs.downPayment));
    const months = years * 12;
    payment = monthlyPayment(principal, inputs.loanRate, months);
    interest = Math.max(0, payment * months - principal);
  }

  const energyEstimate = estimateAnnualEnergyCost(
    car,
    {
      annualKm: inputs.annualKm,
      gasPriceCadPerL: inputs.gasPriceCadPerL,
      dieselPriceCadPerL: inputs.dieselPriceCadPerL,
      electricityRateCadPerKwh: inputs.electricityRateCadPerKwh,
    },
    getRegionalAssumptions(inputs.region),
  );
  const energy = energyEstimate
    ? {
        annual: energyEstimate.annualCad,
        total: energyEstimate.annualCad * years,
        basis: energyEstimate.basis,
      }
    : null;

  const insurance = inputs.insurancePerYear * years;
  const maintenance = inputs.maintenancePerYear * years;
  const tires = inputs.tiresPerYear * years;
  const registration = inputs.registrationPerYear * years;

  const total =
    depreciation + interest + (energy?.total ?? 0) + insurance + maintenance + tires + registration;

  return {
    total: Math.round(total),
    monthly: Math.round(total / (years * 12)),
    depreciation: Math.round(depreciation),
    resaleValue,
    interest: Math.round(interest),
    monthlyLoanPayment: Math.round(payment),
    energy,
    insurance,
    maintenance,
    tires,
    registration,
    depreciationFromDossier: fromDossier,
  };
}
