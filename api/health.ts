import * as carService from '../server/src/services/car.service';
import { resolveDataFile } from '../server/src/utils/data-paths';

export default async function handler(_req: any, res: any) {
  try {
    const results = carService.searchCars({ limit: 1 });
    const dbPath = resolveDataFile('cars.json');
    res.status(200).json({
      status: 'ok',
      message: 'CarInfo API is running',
      carsTotal: results.total,
      dbFound: !!dbPath,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Health error:', message, error);
    res.status(500).json({
      status: 'error',
      message: 'CarInfo API failed to initialize',
      detail: message,
    });
  }
}

