import type { Car, CarDashboard } from '../types/car.types.js';
import * as carService from './car.service.js';
import {
  getSegment,
  predictZeroToSixty,
} from '../utils/market-intelligence.js';
import {
  computeOwnershipEconomics,
  correctedKWhPer100Mi,
  estimateMarketValue,
  roundEfficiency,
} from '../utils/ownership-economics.js';
import { findSimilarCars } from '../utils/similar-vehicles.js';

export function getCarDashboard(
  id: string,
  regionId?: import('../config/regional-assumptions.js').RegionId,
): CarDashboard | null {
  const car = carService.getCarById(id);
  if (!car) return null;

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
    price: {
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

  const dashboard: CarDashboard = {
    car: displayCar,
    segmentCount: segment.length,
    ownership,
    dealRating: null,
    annualRunningCost: ownership.annualCost.total != null
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
