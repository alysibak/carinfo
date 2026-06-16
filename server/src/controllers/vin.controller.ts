import { Request, Response } from 'express';
import { decodeVin } from '../services/nhtsa.service.js';

// VIN charset excludes I, O, Q; allow '*' so NHTSA can decode partial VINs.
const VIN_RE = /^[A-HJ-NPR-Z0-9*]{11,17}$/;

/**
 * Decode a VIN via NHTSA's free vPIC database and return curated specs
 * (engine horsepower included when NHTSA has it).
 */
export async function decodeVinHandler(req: Request, res: Response) {
  const raw = String(req.params.vin ?? '').trim().toUpperCase();
  if (!raw) {
    return res.status(400).json({ success: false, error: 'A VIN is required.' });
  }
  if (!VIN_RE.test(raw)) {
    return res.status(400).json({
      success: false,
      error:
        'That doesn’t look like a valid VIN. A VIN is 17 characters (letters and numbers, no I, O, or Q).',
    });
  }

  const yearRaw = req.query.year != null ? Number(req.query.year) : undefined;
  const modelYear =
    yearRaw != null && Number.isFinite(yearRaw) && yearRaw >= 1981 && yearRaw <= 2030
      ? yearRaw
      : undefined;

  try {
    const result = await decodeVin(raw, modelYear);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error(`VIN decode failed for ${raw}:`, error);
    res.status(502).json({ success: false, error: 'NHTSA VIN service is unavailable right now. Please try again.' });
  }
}
