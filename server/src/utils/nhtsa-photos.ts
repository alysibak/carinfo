/**
 * Photos of the cars, from NHTSA: when it crash-tests a model it photographs
 * the car it bought first, and publishes the photo with the ratings. A work
 * of the US government, so free to use. scripts/build-nhtsa-photos.ts lists
 * them in data/nhtsa-photos.json.
 */

/** A file on NHTSA's image host, e.g. "13416_st0640_046.png". */
export const NHTSA_PHOTO_FILE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,80}\.(?:png|jpe?g)$/i;

export interface NhtsaPhotoVehicle {
  /** NHTSA's VehicleId. */
  id: number;
  year: number;
  /** As NHTSA spells them: "MERCEDES-BENZ", "F-150". */
  make: string;
  model: string;
  /** NHTSA's name for the variant tested: "2020 Ford F-150 SuperCrew PU/CC 4WD". */
  description: string;
  /** File name on NHTSA's image host (see NHTSA_PHOTO_FILE). */
  picture: string;
}

export interface NhtsaPhotoFile {
  source: string;
  /** Model years listed completely, with the date they were. */
  years: Record<string, string>;
  vehicles: NhtsaPhotoVehicle[];
}
