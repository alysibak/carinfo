import * as carService from '../../server/src/services/car.service';

export default async function handler(_req: any, res: any) {
  try {
    const makes = carService.getAllMakes();
    res.status(200).json({ success: true, data: makes });
  } catch (error) {
    console.error('Makes error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch makes' });
  }
}

