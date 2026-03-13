export default async function handler(req: any, res: any) {
  try {
    const make = req.query?.make;
    if (!make || typeof make !== 'string') {
      return res.status(400).json({ success: false, error: 'Missing make' });
    }

    // Dynamically import the ESM car service so it works in Vercel's CJS runtime.
    const carService = await import('../../../../server/src/services/car.service');

    const models = carService.getModelsByMake(make);
    res.status(200).json({ success: true, data: models });
  } catch (error) {
    console.error('Models error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch models' });
  }
}

