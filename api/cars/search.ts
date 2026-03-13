import * as carService from '../_lib/carService';
import type { SearchQuery } from '../_lib/carService';

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

    const query = parseJsonBody(req.body) as SearchQuery;
    const results = carService.searchCars(query);
    res.status(200).json({ success: true, data: results });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ success: false, error: 'Failed to search cars' });
  }
}

