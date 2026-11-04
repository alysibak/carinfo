import { theftSentence } from '@carinfo/shared/theft';
import type { CarDashboard } from '../types/car.types';
import { efficiencyOf } from './efficiency';
import {
  investigationKind,
  investigationPart,
  investigationText,
  openFirst,
} from './investigations';
import { complaintPart, recallDate, recallNotice } from './recalls';
import { powertrainNames, splitInvestigations, splitRecalls } from '@carinfo/shared/recall-scope';
import { formatFeet, formatKg, formatMetres } from './size';
import { formatTransmissionLabel } from './trimLabel';
import { t, tp } from '../i18n';
import { fmtNumber } from '../i18n/format';

export interface ChecklistItem {
  text: string;
  detail?: string;
  tick?: boolean;
}

export interface ChecklistSection {
  id: string;
  title: string;
  intro?: string;
  items: ChecklistItem[];
  source: string;
}

const asOf = (day?: string) => (day ? t(', records as of {date}', { date: recallDate(day) }) : '');

export function checklistSections(dashboard: CarDashboard): ChecklistSection[] {
  const { car, recalls, complaints, investigations, theft, recordDates } = dashboard;
  const name = `${car.year} ${dashboard.modelPage?.label ?? `${car.make} ${car.model}`}`;
  const sections: ChecklistSection[] = [];

  sections.push({
    id: 'vin',
    title: t('The VIN'),
    items: [
      {
        text: t(
          'Find the VIN on the dashboard, read through the windshield, and on the label in the driver’s door frame. Check they match each other and the ownership papers.',
        ),
        tick: true,
      },
      {
        text: t(
          'Enter it on Transport Canada’s recall site or the maker’s: they say which recalls cover this car and whether they were done.',
        ),
        tick: true,
      },
    ],
    source: t('Transport Canada, recalls-rappels.canada.ca'),
  });

  if (recalls) {
    const { applies, other } = splitRecalls(recalls, {
      fuelType: car.engine.fuelType,
      mildHybrid: car.engine.mildHybrid,
    });
    const powertrains = [...new Set(other.map((o) => powertrainNames(o.powertrains)))].join(' or ');
    const others = other.length
      ? tp(
          other.length,
          ' {count} more is for {powertrains} alone, and left out.',
          ' {count} more are for {powertrains} alone, and left out.',
          { powertrains },
        )
      : '';
    sections.push({
      id: 'recalls',
      title: t('Recalls in Canada'),
      intro: applies.length
        ? other.length
          ? tp(
              applies.length,
              'Transport Canada lists {count} recall that can cover this version of the {name}. Ask for proof each was done; a recall can cover only some cars of a model year.{others}',
              'Transport Canada lists {count} recalls that can cover this version of the {name}. Ask for proof each was done; a recall can cover only some cars of a model year.{others}',
              { name, others },
            )
          : tp(
              applies.length,
              'Transport Canada lists {count} recall for the {name}. Ask for proof each was done; a recall can cover only some cars of a model year.{others}',
              'Transport Canada lists {count} recalls for the {name}. Ask for proof each was done; a recall can cover only some cars of a model year.{others}',
              { name, others },
            )
        : other.length
          ? t('Transport Canada lists no recalls for this version of the {name}.{others}', {
              name,
              others,
            })
          : t('Transport Canada lists no recalls for the {name}.', { name }),
      items: applies.map((recall) => ({
        text: `${complaintPart(recall.system)}: ${recallNotice(recall.summary).issue}`,
        detail: t('Recall {number} · {date}', {
          number: recall.number,
          date: recallDate(recall.date),
        }),
        tick: true,
      })),
      source: t('Transport Canada, Motor Vehicle Safety Recalls Database{asOf}', {
        asOf: asOf(recordDates?.recalls),
      }),
    });
  }

  if (complaints && complaints.complaints > 0 && complaints.parts.length) {
    const countFormatted = fmtNumber(complaints.complaints);
    sections.push({
      id: 'complaints',
      title: t('What owners complained of most'),
      intro: tp(
        complaints.complaints,
        '{count} owner complaint about the {name} to NHTSA (U.S.), by part. Check these on the test drive, and ask whether any were repaired.',
        '{count} owner complaints about the {name} to NHTSA (U.S.), by part. Check these on the test drive, and ask whether any were repaired.',
        { count: countFormatted, name },
      ),
      items: complaints.parts.map(([part, count]) => ({
        text: complaintPart(part),
        detail: tp(count, '{count} complaint', '{count} complaints', {
          count: fmtNumber(count),
        }),
        tick: true,
      })),
      source: t('NHTSA owner complaints, owners’ reports, not confirmed defects{asOf}', {
        asOf: asOf(recordDates?.complaints),
      }),
    });
  }

  const open = openFirst(
    splitInvestigations(investigations ?? [], {
      fuelType: car.engine.fuelType,
      mildHybrid: car.engine.mildHybrid,
    }).applies,
  ).filter((inv) => !inv.closed);
  if (open.length) {
    sections.push({
      id: 'investigations',
      title: t('Open NHTSA investigations'),
      intro: t(
        'NHTSA (U.S.) is still looking into these; a recall may follow. Ask the dealer or the maker whether one has.',
      ),
      items: open.map((inv) => ({
        text: `${investigationPart(inv.component)}: ${investigationText(inv.subject)}`,
        detail: t('{kind} {id} · opened {date}', {
          kind: investigationKind(inv.kind),
          id: inv.id,
          date: recallDate(inv.opened),
        }),
        tick: true,
      })),
      source: t('NHTSA Office of Defects Investigation{asOf}', {
        asOf: asOf(recordDates?.investigations),
      }),
    });
  }

  const rating = car.safetyRating;
  const tech = car.safetyTech;
  if (rating?.overall || tech?.fcw || tech?.ldw) {
    const stars = (label: string, value?: number) =>
      value ? [{ text: t('{label}: {value}/5', { label, value }) }] : [];
    sections.push({
      id: 'safety',
      title: t('Crash rating and safety technology'),
      intro:
        tech?.fcw === 'optional' ||
        tech?.fcw === 'some' ||
        tech?.ldw === 'optional' ||
        tech?.ldw === 'some'
          ? t('Some of the technology NHTSA lists was optional: check this car has it.')
          : undefined,
      items: [
        ...stars(t('Overall'), rating?.overall),
        ...stars(t('Frontal crash'), rating?.frontal),
        ...stars(t('Side crash'), rating?.side),
        ...stars(t('Rollover'), rating?.rollover),
        ...(tech?.fcw
          ? [
              {
                text: t('Forward collision warning: {availability}', {
                  availability:
                    tech.fcw === 'standard'
                      ? t('standard')
                      : tech.fcw === 'optional'
                        ? t('optional')
                        : t('standard on some versions'),
                }),
                tick: tech.fcw !== 'standard',
              },
            ]
          : []),
        ...(tech?.ldw
          ? [
              {
                text: t('Lane departure warning: {availability}', {
                  availability:
                    tech.ldw === 'standard'
                      ? t('standard')
                      : tech.ldw === 'optional'
                        ? t('optional')
                        : t('standard on some versions'),
                }),
                tick: tech.ldw !== 'standard',
              },
            ]
          : []),
      ],
      source: t('NHTSA 5-Star Safety Ratings'),
    });
  }

  if (theft) {
    sections.push({
      id: 'theft',
      title: t('Theft and insurance'),
      items: [
        { text: theftSentence(theft) },
        {
          text: t(
            'Get an insurance quote before you buy, and ask whether the insurer requires an anti-theft device.',
          ),
          tick: true,
        },
      ],
      source: t('Équité Association, Top 10 Most Stolen Vehicles in Canada'),
    });
  }

  const efficiency = efficiencyOf(car);
  const efficiencyLabel =
    efficiency?.label === 'Energy use'
      ? t('Energy use')
      : efficiency?.label === 'Hydrogen use'
        ? t('Hydrogen use')
        : efficiency?.label === 'Gas-mode fuel use'
          ? t('Gas-mode fuel use')
          : t('Fuel use');
  const facts: ChecklistItem[] = [
    ...(efficiency
      ? [
          {
            text: t('{label}: {value} combined', {
              label: efficiencyLabel,
              value: efficiency.text,
            }),
          },
        ]
      : []),
    { text: t('Drive: {drive}', { drive: car.driveType }) },
    ...(car.transmission?.type
      ? [
          {
            text: t('Gearbox: {gearbox}', {
              gearbox: formatTransmissionLabel(car.transmission),
            }),
          },
        ]
      : []),
    ...(car.engine.horsepower
      ? [{ text: t('Power: {hp} hp', { hp: car.engine.horsepower }) }]
      : []),
    ...(car.size
      ? [
          {
            text: t(
              'Size: {length} long and {width} wide without mirrors ({lengthFt} by {widthFt}); weighs {weight} empty',
              {
                length: formatMetres(car.size.lengthCm),
                width: formatMetres(car.size.widthCm),
                lengthFt: formatFeet(car.size.lengthCm),
                widthFt: formatFeet(car.size.widthCm),
                weight: formatKg(car.size.curbWeightKg),
              },
            ),
          },
        ]
      : []),
  ];
  sections.push({
    id: 'facts',
    title: t('Facts to hold the ad to'),
    intro: t('As rated and measured for this version: an ad that differs is worth a question.'),
    items: facts,
    source: car.size ? t('EPA ratings; Transport Canada measurements') : t('EPA ratings'),
  });

  return sections;
}
