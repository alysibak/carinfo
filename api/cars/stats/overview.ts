import * as carService from '../../../../server/src/services/car.service';

export default async function handler(_req: any, res: any) {
  try {
    const stats = carService.getStatistics();
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch statistics' });
  }
}

