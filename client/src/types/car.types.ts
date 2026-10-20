/**
 * API contract types.
 *
 * The single source of truth is server/src/types/car.types.ts — this module
 * only re-exports it. It used to be a hand-maintained copy that had drifted
 * (18 lines of diff), and nothing checked the two agreed, so a server field
 * rename compiled cleanly on both sides and failed at runtime.
 */
import type { Car } from '@carinfo/types/car.types';

export type {
  AnnualCostBreakdown,
  AnnualCostRange,
  BatteryHealthEstimate,
  BodyStyle,
  CanadianRecall,
  CarDashboard,
  CarRecordsSummary,
  CarFilter,
  ClassComparison,
  ComplaintSummary,
  ConditionValueBand,
  DerivedComparisonMetric,
  DriveType,
  FuelType,
  MarketValueEstimate,
  ModelOverview,
  ModelYearSummary,
  NhtsaRating,
  OwnershipAssumptions,
  OwnershipEconomics,
  OwnershipProfile,
  Provenance,
  ProvenanceSource,
  ResaleImpact,
  SafetyAvailability,
  SaferAlternative,
  SearchInterpretation,
  SearchQuery,
  SearchResults,
  ShoppingSegment,
  TcoEstimate,
  TcoRange,
  VehicleCategory,
  VehicleSize,
} from '@carinfo/types/car.types';

/**
 * A vehicle record as served by the API. On the server that shape is `Car`
 * (`CarSpecs` there is the id-less payload); client code has always called it
 * CarSpecs. Same type, historical name.
 */
export type CarSpecs = Car;
