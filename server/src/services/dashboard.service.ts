import type { Car, CarDashboard, CarRecordsSummary } from '../types/car.types.js';
import type { RegionId } from '../config/regional-assumptions.js';
import * as carService from './car.service.js';
import { getSegment, predictZeroToSixty } from '../utils/market-intelligence.js';
import {
  computeOwnershipEconomics,
  correctedKWhPer100Mi,
  estimateMarketValue,
  roundEfficiency,
} from '../utils/ownership-economics.js';
import { findSimilarCars } from '../utils/similar-vehicles.js';
import { saferAlternatives } from '../utils/safer-alternatives.js';
import { competitiveClassLabel } from '../utils/competitive-sets.js';
import { enginePosition } from '../utils/engine-position.js';
import { generationOf } from '../utils/generations.js';
import { compareWithClass } from '../utils/class-comparison.js';
import {
  canadianRecallsFor,
  complaintRankFor,
  complaintsFor,
  investigationsFor,
  recordDates,
} from './safety-records.service.js';
import { nhtsaRatingsDate, nhtsaTestsFor } from '../utils/nhtsa-ratings.js';
import { theftRankOf } from '../config/most-stolen.js';

export function getCarDashboard(id: string, regionId?: RegionId): CarDashboard | null {
  const car = carService.getCarById(id);
  if (!car) return null;

  // Peers are ranked on their stored prices, which use the default region, so
  // this car's price for ranking does too, whatever region the reader chose.
  const market = estimateMarketValue(car);
  const carForSegment = {
    ...car,
    price: {
      msrp: market.mid,
      min: market.low,
      max: market.high,
      isEstimated: true,
    },
  };
  // Prefer body-style index over full fleet scan for segment peers.
  const pool = carService.getCarsByBodyStyle(car.bodyStyle);
  const segmentPool = pool.length > 0 ? pool : carService.getAllCars();
  const segment = getSegment(carForSegment, segmentPool);
  const ownership = computeOwnershipEconomics(car, segment, regionId);
  const zeroToSixty = predictZeroToSixty(car);

  const displayCar = {
    ...car,
    fuelEconomy: {
      city: roundEfficiency(car.fuelEconomy.city),
      highway: roundEfficiency(car.fuelEconomy.highway),
      combined: roundEfficiency(car.fuelEconomy.combined),
    },
    // A car the site does not value has no price to show (see utils/unvalued.ts).
    price: ownership.unvalued
      ? undefined
      : {
          msrp: ownership.marketValue.mid,
          min: ownership.marketValue.low,
          max: ownership.marketValue.high,
          isEstimated: true,
          confidence: ownership.marketValue.confidence,
          confidenceLabel: ownership.marketValue.confidenceLabel,
        },
    ...(car.epa
      ? {
          epa: {
            ...car.epa,
            kWhPer100Mi: correctedKWhPer100Mi(car) ?? car.epa.kWhPer100Mi,
          },
        }
      : {}),
  };

  const competitiveClass = competitiveClassLabel(car);
  const generation = generationOf(car);
  const modelPage = carService.modelPageOf(car);
  const line = carService.modelLineKey(car);
  const recalls = canadianRecallsFor(line, car.year);
  const complaints = complaintsFor(line, car.year);
  const complaintRank = complaints
    ? complaintRankFor(line, car.year, carService.lineYearsOf(car))
    : undefined;
  const investigations = investigationsFor(line, car.year);
  const nhtsaTests = nhtsaTestsFor(car);
  const theft = theftRankOf(line);
  // Only worth the search where a rival could do better: below five stars,
  // or five without collision warning standard.
  const safer =
    car.safetyRating?.overall &&
    (car.safetyRating.overall < 5 || car.safetyTech?.fcw !== 'standard')
      ? saferAlternatives(car, getSimilarCars(car.id, 24), (c) => {
          const page = carService.modelPageOf(c);
          return `${c.year} ${page?.label ?? `${c.make} ${c.model}`}`;
        })
      : [];
  const position = enginePosition(car);
  const classComparison = compareWithClass(car, carService.getAllCars(), carService.modelLineKey);
  const dashboard: CarDashboard = {
    car: displayCar,
    ...(competitiveClass ? { competitiveClass } : {}),
    ...(classComparison ? { classComparison } : {}),
    ...(generation ? { generation } : {}),
    ...(modelPage ? { modelPage } : {}),
    ...(recalls ? { recalls } : {}),
    ...(complaints ? { complaints } : {}),
    ...(complaintRank ? { complaintRank } : {}),
    ...(investigations.length ? { investigations } : {}),
    ...(nhtsaTests.length ? { nhtsaTests } : {}),
    ...(safer.length ? { saferAlternatives: safer } : {}),
    ...(theft ? { theft } : {}),
    ...(recalls || complaints || investigations.length || nhtsaTests.length
      ? {
          recordDates: {
            ...recordDates(),
            ...(nhtsaTests.length ? { ratings: nhtsaRatingsDate() } : {}),
          },
        }
      : {}),
    // Front is the rule; only the exceptions are worth a row.
    ...(position === 'mid' || position === 'rear' ? { enginePosition: position } : {}),
    segmentCount: segment.length,
    ownership,
    dealRating: null,
    annualRunningCost:
      ownership.annualCost.total != null
        ? {
            low: ownership.annualCost.totalLow ?? ownership.annualCost.total,
            high: ownership.annualCost.totalHigh ?? ownership.annualCost.total,
            mid: ownership.annualCost.total,
          }
        : null,
    tco5Year: ownership.tco5Year
      ? {
          low: ownership.tco5Year.low,
          high: ownership.tco5Year.high,
          mid: Math.round((ownership.tco5Year.low + ownership.tco5Year.high) / 2),
        }
      : null,
    fieldProvenance: {
      ...(car.provenance || {}),
      'analytics.annualCost': 'estimated',
      'analytics.tco5Year': 'estimated',
      'price.msrp': 'estimated',
    },
    zeroToSixty: zeroToSixty
      ? {
          value: zeroToSixty.predicted,
          method: zeroToSixty.method,
          confidence: zeroToSixty.confidence,
        }
      : undefined,
  };

  const kWh = correctedKWhPer100Mi(car);
  const epa = car.epa;
  const ft = car.engine.fuelType;
  if (
    epa &&
    (ft === 'electric' || ft === 'hydrogen') &&
    (epa.charge120Hours || epa.charge240Hours || kWh || epa.rangeMiles)
  ) {
    dashboard.evCharge = {
      charge120Hours: epa.charge120Hours,
      charge240Hours: epa.charge240Hours,
      kWhPer100Mi: kWh,
      rangeMiles: epa.rangeMiles,
    };
  }

  return dashboard;
}

export function getSimilarCars(id: string, limit = 6): Car[] {
  const anchor = carService.getCarById(id);
  if (!anchor) return [];
  // Cross-shop within body style first; widen only if the pool is tiny.
  const bodyPool = carService.getCarsByBodyStyle(anchor.bodyStyle);
  const pool = bodyPool.length >= 40 ? bodyPool : carService.getAllCars();
  return findSimilarCars(anchor, pool, limit);
}

export function getSiblingConfigs(id: string, limit = 24): Car[] {
  return carService.getSiblingConfigs(id, limit);
}

/**
 * A car's model-year records in brief, for a list of saved cars: its recalls
 * in Canada and owner complaints to NHTSA, null where the model's records
 * are not matched (which is not "none").
 */
export function getCarRecords(id: string): CarRecordsSummary | null {
  const car = carService.getCarById(id);
  if (!car) return null;
  const line = carService.modelLineKey(car);
  const recalls = canadianRecallsFor(line, car.year);
  const complaints = complaintsFor(line, car.year);
  return {
    recalls: recalls ? recalls.length : null,
    complaints: complaints ? complaints.complaints : null,
    complaintPart: complaints?.parts[0]?.[0] ?? null,
    theft: theftRankOf(line) ?? null,
  };
}
