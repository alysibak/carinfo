import * as dashboardService from '../../../server/src/services/dashboard.service';

export default async function handler(req: any, res: any) {
  try {
    const id = req.query?.id;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ success: false, error: 'Missing id' });
    }

    const dashboard = dashboardService.getCarDashboard(id);
    if (!dashboard) {
      return res.status(404).json({ success: false, error: 'Car not found' });
    }

    res.status(200).json({ success: true, data: dashboard });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch car dashboard' });
  }
}
