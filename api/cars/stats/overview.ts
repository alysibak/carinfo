export default async function handler(_req: any, res: any) {
  try {
    // Dynamically import the ESM car service so it works in Vercel's CJS runtime.
    const carService = await import('../../../../server/src/services/car.service');

    const stats = carService.getStatistics();
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch statistics' });
  }
}

