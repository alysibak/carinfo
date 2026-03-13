export default async function handler(_req: any, res: any) {
  try {
    // Dynamically import the ESM car service so it works in Vercel's CJS runtime.
    const carService = await import('../../server/src/services/car.service');

    const makes = carService.getAllMakes();
    res.status(200).json({ success: true, data: makes });
  } catch (error) {
    console.error('Makes error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch makes' });
  }
}

