import * as carService from '../../../server/src/services/car.service';

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const q = typeof req.query.q === 'string' ? req.query.q : '';
    const limitRaw = req.query.limit != null ? Number(req.query.limit) : 8;
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 20) : 8;
    const suggestions = carService.getSearchSuggestions(q, limit);
    res.status(200).json({ success: true, data: suggestions });
  } catch (error) {
    console.error('Suggestions error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch suggestions' });
  }
}
