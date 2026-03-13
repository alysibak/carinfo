import * as carService from '../../server/src/services/car.service';

function parseJsonBody(body: any): any {
  if (body == null) return {};
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }
  return body;
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const body = parseJsonBody(req.body);
    const ids = body?.ids;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid car IDs' });
    }
    if (ids.length > 5) {
      return res.status(400).json({ success: false, error: 'Maximum 5 cars can be compared' });
    }

    const cars = carService.getCarsByIds(ids);
    res.status(200).json({ success: true, data: cars });
  } catch (error) {
    console.error('Compare error:', error);
    res.status(500).json({ success: false, error: 'Failed to compare cars' });
  }
}

