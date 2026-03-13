export default async function handler(_req: any, res: any) {
  res.status(200).json({ status: 'ok', message: 'CarInfo API is running' });
}

