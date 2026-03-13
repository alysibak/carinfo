export default async function handler(_req: any, res: any) {
  try {
    // Dynamically import the ESM car service so it works in Vercel's CJS runtime.
    const carService = await import('../server/src/services/car.service');

    // Minimal query to force DB init and report whether cars exist.
    const results = carService.searchCars({ limit: 1 });
    res.status(200).json({
      status: 'ok',
      message: 'CarInfo API is running',
      carsTotal: results.total,
    });
  } catch (error) {
    console.error('Health error:', error);
    res.status(500).json({
      status: 'error',
      message: 'CarInfo API failed to initialize',
    });
  }
}

