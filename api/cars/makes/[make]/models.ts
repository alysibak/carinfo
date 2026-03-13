import * as carService from '../../../_lib/carService';

export default async function handler(req: any, res: any) {
  try {
    const make = req.query?.make;
    if (!make || typeof make !== 'string') {
      return res.status(400).json({ success: false, error: 'Missing make' });
    }

    const models = carService.getModelsByMake(make);
    res.status(200).json({ success: true, data: models });
  } catch (error) {
    console.error('Models error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch models' });
  }
}

