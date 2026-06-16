import * as carService from '../../server/dist/services/car.service.js';

export default async function handler(req: any, res: any) {
  try {
    const id = req.query?.id;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ success: false, error: 'Missing id' });
    }

    const car = carService.getCarById(id);
    if (!car) {
      return res.status(404).json({ success: false, error: 'Car not found' });
    }

    res.status(200).json({ success: true, data: car });
  } catch (error) {
    console.error('Get car error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch car' });
  }
}

