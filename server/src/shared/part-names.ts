/**
 * NHTSA's and Transport Canada's names for the parts of a car, as a shopper
 * would say them. Each maps a whole category, so nothing is narrowed: NHTSA's
 * POWER TRAIN takes in the transmission, driveline and axles; its VEHICLE
 * SPEED CONTROL, the accelerator and cruise control; its STRUCTURE, the body,
 * frame, hood and doors.
 */
const PLAIN: Record<string, string> = {
  'POWER TRAIN': 'Transmission and drivetrain',
  POWERTRAIN: 'Transmission and drivetrain',
  'ENGINE AND ENGINE COOLING': 'Engine and cooling',
  STRUCTURE: 'Body and frame',
  'VEHICLE SPEED CONTROL': 'Accelerator and cruise control',
  'FUEL/PROPULSION SYSTEM': 'Fuel and propulsion system',
  'SERVICE BRAKES': 'Brakes',
  'SERVICE BRAKES, HYDRAULIC': 'Hydraulic brakes',
  'SERVICE BRAKES, ELECTRIC': 'Electric brakes',
  'SERVICE BRAKES, AIR': 'Air brakes',
  'AIR BAGS': 'Airbags',
  AIRBAG: 'Airbags',
  'VISIBILITY/WIPER': 'Visibility and wipers',
  'VISUAL SYSTEM': 'Visibility',
  'BACK OVER PREVENTION': 'Backup camera and sensors',
  'ELECTRONIC STABILITY CONTROL (ESC)': 'Stability control',
  'ELECTRONIC STABILITY CONTROL': 'Stability control',
  'LATCHES/LOCKS/LINKAGES': 'Latches, locks and linkages',
  'EQUIPMENT ADAPTIVE/MOBILITY': 'Mobility equipment',
  'TRAILER HITCHES': 'Trailer hitch',
  'HIGH VOLTAGE': 'High-voltage system',
  LABEL: 'Labels',
  'OTHER/I AM NOT SURE': 'Other',
  'UNKNOWN OR OTHER': 'Other',
  // Child seats' own parts, from NHTSA's car-seat complaints.
  'CHEST CLIP, BUCKLE, HARNESS': 'Child seat harness',
  'CARRY HANDLE, SHELL, BASE': 'Child seat shell',
  'TETHER, LOWER ANCHOR (ON CAR SEAT OR VEHICLE)': 'Child seat tether and anchors',
};

/**
 * A government part or system name in plain words and sentence case:
 * "POWER TRAIN" reads "Transmission and drivetrain", Transport Canada's
 * "Seats And Restraints" reads "Seats and restraints".
 */
export function plainPartName(name: string): string {
  const key = name.trim().toUpperCase();
  if (PLAIN[key]) return PLAIN[key];
  // NHTSA's "FUEL SYSTEM, DIESEL" reads "Diesel fuel system".
  const kind = /^([^,]+),\s*([^,]+)$/.exec(name.trim());
  const lower = (kind ? `${kind[2]} ${kind[1]}` : name.trim()).toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}
