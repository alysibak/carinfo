import * as carService from '../../../server/src/services/car.service';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const priceMin = req.query.priceMin != null ? Number(req.query.priceMin) : undefined;
    const priceMax = req.query.priceMax != null ? Number(req.query.priceMax) : undefined;
    const bodyStyles = typeof req.query.bodyStyles === 'string' && req.query.bodyStyles
      ? req.query.bodyStyles.split(',').map((s: string) => s.trim()).filter(Boolean)
      : undefined;
    const yearMin = req.query.yearMin != null ? Number(req.query.yearMin) : undefined;
    const yearMax = req.query.yearMax != null ? Number(req.query.yearMax) : undefined;
    const limit = req.query.limit != null ? Number(req.query.limit) : undefined;

    const points = carService.getChartPoints({
      priceMin: Number.isFinite(priceMin) ? priceMin : undefined,
      priceMax: Number.isFinite(priceMax) ? priceMax : undefined,
      bodyStyles,
      yearMin: Number.isFinite(yearMin) ? yearMin : undefined,
      yearMax: Number.isFinite(yearMax) ? yearMax : undefined,
      limit: Number.isFinite(limit) ? limit : undefined,
    });

    res.status(200).json({ success: true, data: { points, total: points.length } });
  } catch (error) {
    console.error('Chart points error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch chart points' });
  }
}
