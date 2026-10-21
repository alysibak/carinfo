import { theftSentence } from '@carinfo/shared/theft';
import type { CarDashboard } from '../types/car.types';
import { efficiencyOf } from './efficiency';
import { investigationKind, investigationText, openFirst } from './investigations';
import { complaintPart, recallDate, recallNotice } from './recalls';
import { availabilityLabel } from './safetyTech';
import { formatKg, formatMetres } from './size';
import { formatTransmissionLabel } from './trimLabel';

export interface ChecklistItem {
  text: string;
  /** A second line: a recall's number and date, a part's count. */
  detail?: string;
  /** A box to tick at the car. */
  tick?: boolean;
}

export interface ChecklistSection {
  id: string;
  title: string;
  intro?: string;
  items: ChecklistItem[];
  /** Where it comes from, and as of when. */
  source: string;
}

const asOf = (day?: string) => (day ? `, records as of ${recallDate(day)}` : '');

/**
 * What to check when seeing the car, from the records on its page: the VIN,
 * the model year's recalls, what owners complained of, open investigations,
 * the crash rating and its safety technology, theft, and the facts to hold
 * the ad to. Only what is on file is said; a section with nothing is left out.
 */
export function checklistSections(dashboard: CarDashboard): ChecklistSection[] {
  const { car, recalls, complaints, investigations, theft, recordDates } = dashboard;
  const name = `${car.year} ${dashboard.modelPage?.label ?? `${car.make} ${car.model}`}`;
  const sections: ChecklistSection[] = [];

  sections.push({
    id: 'vin',
    title: 'The VIN',
    items: [
      {
        text: 'Find the VIN on the dashboard, read through the windshield, and on the label in the driver’s door frame. Check they match each other and the ownership papers.',
        tick: true,
      },
      {
        text: 'Enter it on Transport Canada’s recall site or the maker’s: they say which recalls cover this car and whether they were done.',
        tick: true,
      },
    ],
    source: 'Transport Canada, recalls-rappels.canada.ca',
  });

  if (recalls) {
    sections.push({
      id: 'recalls',
      title: 'Recalls in Canada',
      intro: recalls.length
        ? `Transport Canada lists ${recalls.length} ${recalls.length === 1 ? 'recall' : 'recalls'} for the ${name}. Ask for proof each was done; a recall can cover only some cars of a model year.`
        : `Transport Canada lists no recalls for the ${name}.`,
      items: recalls.map((recall) => ({
        text: `${complaintPart(recall.system)}: ${recallNotice(recall.summary).issue}`,
        detail: `Recall ${recall.number} · ${recallDate(recall.date)}`,
        tick: true,
      })),
      source: `Transport Canada, Motor Vehicle Safety Recalls Database${asOf(recordDates?.recalls)}`,
    });
  }

  if (complaints && complaints.complaints > 0 && complaints.parts.length) {
    sections.push({
      id: 'complaints',
      title: 'What owners complained of most',
      intro: `${complaints.complaints.toLocaleString('en-CA')} owner ${complaints.complaints === 1 ? 'complaint' : 'complaints'} about the ${name} to NHTSA (U.S.), by part. Check these on the test drive, and ask whether any were repaired.`,
      items: complaints.parts.map(([part, count]) => ({
        text: complaintPart(part),
        detail: `${count.toLocaleString('en-CA')} ${count === 1 ? 'complaint' : 'complaints'}`,
        tick: true,
      })),
      source: `NHTSA owner complaints, owners’ reports, not confirmed defects${asOf(recordDates?.complaints)}`,
    });
  }

  const open = openFirst(investigations ?? []).filter((inv) => !inv.closed);
  if (open.length) {
    sections.push({
      id: 'investigations',
      title: 'Open NHTSA investigations',
      intro:
        'NHTSA (U.S.) is still looking into these; a recall may follow. Ask the dealer or the maker whether one has.',
      items: open.map((inv) => ({
        text: `${complaintPart(inv.component)}: ${investigationText(inv.subject)}`,
        detail: `${investigationKind(inv.kind)} ${inv.id} · opened ${recallDate(inv.opened)}`,
        tick: true,
      })),
      source: `NHTSA Office of Defects Investigation${asOf(recordDates?.investigations)}`,
    });
  }

  const rating = car.safetyRating;
  const tech = car.safetyTech;
  if (rating?.overall || tech?.fcw || tech?.ldw) {
    const stars = (label: string, value?: number) =>
      value ? [{ text: `${label}: ${value}/5` }] : [];
    sections.push({
      id: 'safety',
      title: 'Crash rating and safety technology',
      intro:
        tech?.fcw === 'optional' ||
        tech?.fcw === 'some' ||
        tech?.ldw === 'optional' ||
        tech?.ldw === 'some'
          ? 'Some of the technology NHTSA lists was optional: check this car has it.'
          : undefined,
      items: [
        ...stars('Overall', rating?.overall),
        ...stars('Frontal crash', rating?.frontal),
        ...stars('Side crash', rating?.side),
        ...stars('Rollover', rating?.rollover),
        ...(tech?.fcw
          ? [
              {
                text: `Forward collision warning: ${availabilityLabel(tech.fcw).toLowerCase()}`,
                tick: tech.fcw !== 'standard',
              },
            ]
          : []),
        ...(tech?.ldw
          ? [
              {
                text: `Lane departure warning: ${availabilityLabel(tech.ldw).toLowerCase()}`,
                tick: tech.ldw !== 'standard',
              },
            ]
          : []),
      ],
      source: 'NHTSA 5-Star Safety Ratings',
    });
  }

  if (theft) {
    sections.push({
      id: 'theft',
      title: 'Theft and insurance',
      items: [
        { text: theftSentence(theft) },
        {
          text: 'Get an insurance quote before you buy, and ask whether the insurer requires an anti-theft device.',
          tick: true,
        },
      ],
      source: 'Équité Association, Top 10 Most Stolen Vehicles in Canada',
    });
  }

  const efficiency = efficiencyOf(car);
  const facts: ChecklistItem[] = [
    ...(efficiency ? [{ text: `${efficiency.label}: ${efficiency.text} combined` }] : []),
    { text: `Drive: ${car.driveType}` },
    ...(car.transmission?.type
      ? [{ text: `Gearbox: ${formatTransmissionLabel(car.transmission)}` }]
      : []),
    ...(car.engine.horsepower ? [{ text: `Power: ${car.engine.horsepower} hp` }] : []),
    ...(car.size
      ? [
          {
            text: `Length ${formatMetres(car.size.lengthCm)}, width ${formatMetres(car.size.widthCm)}, curb weight ${formatKg(car.size.curbWeightKg)}`,
          },
        ]
      : []),
  ];
  sections.push({
    id: 'facts',
    title: 'Facts to hold the ad to',
    intro: 'As rated and measured for this version: an ad that differs is worth a question.',
    items: facts,
    source: car.size ? 'EPA ratings; Transport Canada measurements' : 'EPA ratings',
  });

  return sections;
}
