import * as carService from '../../server/src/services/car.service';
import { normalizeSearchQuery } from '../../server/src/utils/search-validation';

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

    const query = normalizeSearchQuery(parseJsonBody(req.body));
    const results = carService.searchCars(query);
    res.status(200).json({ success: true, data: results });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Search error:', message, error);
    res.status(500).json({ success: false, error: 'Failed to search cars', detail: message });
  }
}

