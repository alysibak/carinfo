import { describe, expect, it } from "vitest";
import {
  auditModelSlugVariants,
  auditSlugCollisions,
  auditSlugQuality,
  buildModelYearSlug,
  groupByModelYear,
  unmappedDrivetrains,
  type VehicleIdentity,
} from "./modelYearSlug";

const frozen: readonly VehicleIdentity[] = Object.freeze([
  { make: "GMC", model: "Sonoma 2WD", year: 2001, drivetrain: "RWD" },
  { make: "GMC", model: "Sonoma 2WD (FFV)", year: 2001, drivetrain: "RWD" },
  { make: "GMC", model: "Sonoma 4WD", year: 2001, drivetrain: "AWD" },

  { make: "Jaguar", model: "XE", year: 2018, drivetrain: "RWD" },
  { make: "Jaguar", model: "XE (296 Hp)", year: 2018, drivetrain: "RWD" },
  { make: "Jaguar", model: "XE AWD", year: 2018, drivetrain: "AWD" },
  { make: "Jaguar", model: "XE AWD (296 Hp)", year: 2018, drivetrain: "AWD" },

  { make: "Volkswagen", model: "Golf", year: 1999, drivetrain: "FWD" },
  { make: "Volkswagen", model: "GTI", year: 1999, drivetrain: "FWD" },
  { make: "Volkswagen", model: "New GTI", year: 1999, drivetrain: "FWD" },

  { make: "Acura", model: "NSX", year: 1995, drivetrain: "RWD" },

  { make: "Tesla", model: "Model S (60 kW-hr battery pack)", year: 2016, drivetrain: "RWD" },
  { make: "Tesla", model: "Model S AWD - 60D", year: 2016, drivetrain: "AWD" },
  { make: "Tesla", model: "Model S AWD - P100D", year: 2016, drivetrain: "AWD" },

  { make: "Tesla", model: "Model S Performance (19in Wheels)", year: 2019, drivetrain: "AWD" },
  { make: "Tesla", model: "Model S Performance (21in Wheels)", year: 2019, drivetrain: "AWD" },

  { make: "Mercedes-Benz", model: "G550 4x4 (Special Off-Road Model)", year: 2017, drivetrain: "4WD" },
  { make: "Mercedes-Benz", model: "G550 4x4", year: 2018, drivetrain: "4WD" },
  { make: "Mercedes-Benz", model: "AMG G 63 4x4 Squared", year: 2023, drivetrain: "4WD" },
  { make: "Mercedes-Benz", model: "AMG G63 4x4 Squared", year: 2024, drivetrain: "4WD" },

  // One vehicle spelled two ways across years — canonicalised to the
  // manufacturer's own form, which is not always the fewest-hyphen form.
  { make: "Nissan", model: "Titan 4WD PRO4X", year: 2018, drivetrain: "4WD" },
  { make: "Nissan", model: "Titan 4WD PRO-4X", year: 2021, drivetrain: "4WD" },
  { make: "BMW", model: "X5 xDrive35d", year: 2009, drivetrain: "AWD" },
  { make: "BMW", model: "X5 xDrive 35d", year: 2017, drivetrain: "AWD" },
  { make: "Suzuki", model: "Vitara 2Door 4WD", year: 1999, drivetrain: "AWD" },
  { make: "Suzuki", model: "Vitara 2 Door", year: 2003, drivetrain: "RWD" },

  // Model names that collide with spec vocabulary. Both were live regressions:
  // a tyre-brand rule ate "Continental", a charger rule ate "Charger".
  { make: "Lincoln", model: "Continental", year: 1995, drivetrain: "FWD" },
  { make: "Dodge", model: "Charger Daytona R/T AWD 245/55ZR18", year: 2025, drivetrain: "AWD" },

  // Spec tokens stated without parentheses.
  { make: "Ford", model: "F150 3.5L 2WD GVWR>7599 LBS", year: 2017, drivetrain: "RWD" },
  { make: "Lucid", model: "Air Pure AWD with 19 inch wheels", year: 2023, drivetrain: "AWD" },

  // Parenthetical dispositions: fuel system, battery capacity and trim range
  // strip; body and configuration keep.
  { make: "Chevrolet", model: "Cavalier (Bi-fuel CNG)", year: 2000, drivetrain: "FWD" },
  { make: "BMW", model: "i3 BEV (60  Amp-hour battery)", year: 2017, drivetrain: "RWD" },
  { make: "BMW", model: "i3 BEV (94 Amp-hour battery)", year: 2017, drivetrain: "RWD" },
  { make: "Hyundai", model: "Ioniq 5 AWD (Long Range)", year: 2022, drivetrain: "AWD" },
  { make: "Mercedes-Benz", model: "AMG E63 S 4matic Plus (SW)", year: 2021, drivetrain: "4WD" },
]);

function pathsFor(make: string, year: number): string[] {
  return frozen
    .filter((vehicle) => vehicle.make === make && vehicle.year === year)
    .map((vehicle) => buildModelYearSlug(vehicle, "section").path);
}

describe("section policy collapses attributes", () => {
  it("collapses drivetrain and FFV into one Sonoma path", () => {
    expect(new Set(pathsFor("GMC", 2001))).toEqual(new Set(["/gmc/sonoma/2001"]));
  });

  it("collapses power parentheticals and drivetrain into one XE path", () => {
    expect(new Set(pathsFor("Jaguar", 2018))).toEqual(new Set(["/jaguar/xe/2018"]));
  });

  it("collapses wheel diameter into one Model S Performance path", () => {
    expect(new Set(pathsFor("Tesla", 2019))).toEqual(
      new Set(["/tesla/model-s-performance/2019"])
    );
  });

  it("folds a drivetrain trim suffix into the base model", () => {
    expect(new Set(pathsFor("Tesla", 2016))).toEqual(new Set(["/tesla/model-s/2016"]));
  });
});

describe("identity is never inferred", () => {
  it("keeps Golf, GTI, and New GTI distinct", () => {
    expect(pathsFor("Volkswagen", 1999)).toEqual([
      "/volkswagen/golf/1999",
      "/volkswagen/gti/1999",
      "/volkswagen/new-gti/1999",
    ]);
  });

  it("preserves drivetrain tokens that are part of a model name", () => {
    // Scoped to the 4x4 names this test is about, so unrelated Mercedes rows
    // added to the corpus later do not make it fail.
    const mercedes = frozen
      .filter((vehicle) => vehicle.model.includes("4x4"))
      .map((vehicle) => buildModelYearSlug(vehicle, "section").path);
    expect(mercedes).toEqual([
      "/mercedes-benz/g550-4x4/2017",
      "/mercedes-benz/g550-4x4/2018",
      "/mercedes-benz/amg-g63-4x4-squared/2023",
      "/mercedes-benz/amg-g63-4x4-squared/2024",
    ]);
  });
});

describe("grouping stays lossless", () => {
  it("keeps every raw row under the collapsed key", () => {
    const sonoma = groupByModelYear(frozen, "section").get("/gmc/sonoma/2001");
    expect(sonoma?.rows).toHaveLength(3);
    expect([...(sonoma?.rowsByDrivetrain.keys() ?? [])].sort()).toEqual(["awd", "rwd"]);
  });

  it("preserves the dropped trim for section rendering", () => {
    const modelS = groupByModelYear(frozen, "section").get("/tesla/model-s/2016");
    expect(modelS?.rows).toHaveLength(3);
  });

  it("loses no rows overall", () => {
    const groups = groupByModelYear(frozen, "section");
    const total = [...groups.values()].reduce((sum, group) => sum + group.rows.length, 0);
    expect(total).toBe(frozen.length);
  });
});

describe("one vehicle, one slug, across inconsistent source spellings", () => {
  it("canonicalises to the manufacturer's form, not the shortest", () => {
    expect(pathsFor("Nissan", 2018)).toEqual(["/nissan/titan-pro-4x/2018"]);
    expect(pathsFor("Nissan", 2021)).toEqual(["/nissan/titan-pro-4x/2021"]);
    expect(pathsFor("BMW", 2009)).toEqual(["/bmw/x5-xdrive35d/2009"]);
    expect(pathsFor("Suzuki", 1999)).toEqual(["/suzuki/vitara-2-door/1999"]);
    expect(pathsFor("Suzuki", 2003)).toEqual(["/suzuki/vitara-2-door/2003"]);
  });
});

describe("model names are never mistaken for spec vocabulary", () => {
  it("keeps Continental, which a tyre-brand rule once stripped to nothing", () => {
    expect(pathsFor("Lincoln", 1995)).toEqual(["/lincoln/continental/1995"]);
  });

  it("keeps Charger, which a charging-rate rule once stripped", () => {
    expect(pathsFor("Dodge", 2025)).toEqual(["/dodge/charger-daytona-r-t/2025"]);
  });
});

describe("spec tokens stated without parentheses", () => {
  it("drops a weight rating without taking the displacement with it", () => {
    expect(pathsFor("Ford", 2017)).toEqual(["/ford/f150-3-5l/2017"]);
  });

  it("consumes the preposition along with the wheel measurement", () => {
    expect(pathsFor("Lucid", 2023)).toEqual(["/lucid/air-pure/2023"]);
  });
});

describe("parenthetical dispositions", () => {
  it("strips fuel system, so a bi-fuel variant is a section not a page", () => {
    expect(pathsFor("Chevrolet", 2000)).toEqual(["/chevrolet/cavalier/2000"]);
  });

  it("strips battery capacity however it is phrased", () => {
    expect(new Set(pathsFor("BMW", 2017))).toEqual(
      new Set(["/bmw/i3-bev/2017", "/bmw/x5-xdrive35d/2017"])
    );
  });

  it("strips a trim-level range, because trims are sections", () => {
    expect(pathsFor("Hyundai", 2022)).toEqual(["/hyundai/ioniq-5/2022"]);
  });

  it("keeps body configuration, which changes what the vehicle is", () => {
    expect(pathsFor("Mercedes-Benz", 2021)).toEqual([
      "/mercedes-benz/amg-e63-s-4matic-plus-sw/2021",
    ]);
  });
});

describe("audits", () => {
  it("reports no unexplained collisions", () => {
    const unexplained = auditSlugCollisions(frozen, "section").filter(
      (collision) => collision.cause === "unexplained"
    );
    expect(unexplained).toEqual([]);
  });

  it("reports no quality warnings once overrides and rules are in place", () => {
    expect(auditSlugQuality(frozen, "section")).toEqual([]);
  });

  it("reports no model slug variants within a make", () => {
    expect(auditModelSlugVariants(frozen, "section")).toEqual([]);
  });

  it("maps every drivetrain in the corpus", () => {
    expect(unmappedDrivetrains(frozen)).toEqual([]);
  });
});
