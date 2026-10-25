import { plainPartName } from '@carinfo/shared/part-names';

/**
 * A Transport Canada recall notice in its parts. Notices since about 2017 are
 * written "Issue: … Safety Risk: … Corrective Actions: …"; older ones are one
 * paragraph ending "Correction: …".
 */
export interface RecallNotice {
  issue: string;
  risk?: string;
  remedy?: string;
}

/** A heading opens a line, or follows a sentence: "… may corrode. Correction: …". */
const HEADING =
  /(?:^|\n|(?<=[.!?])\s+)\s*(Issue|Safety Risk|Corrective Actions?|Correction)\s*:\s*/gi;

export function recallNotice(summary: string): RecallNotice {
  const text = summary.replace(/\r/g, '').trim();
  const parts: Record<string, string> = {};
  const matches = [...text.matchAll(HEADING)];
  if (!matches.length) return { issue: tidy(text) };
  const lead = text.slice(0, matches[0].index).trim();
  matches.forEach((match, i) => {
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    const body = tidy(text.slice(match.index! + match[0].length, end));
    const name = match[1].toLowerCase();
    const key = name === 'issue' ? 'issue' : name === 'safety risk' ? 'risk' : 'remedy';
    if (body) parts[key] = parts[key] ? `${parts[key]} ${body}` : body;
  });
  return {
    issue: [lead, parts.issue].filter(Boolean).map(tidy).join(' ') || tidy(text),
    ...(parts.risk ? { risk: parts.risk } : {}),
    ...(parts.remedy ? { remedy: parts.remedy } : {}),
  };
}

/**
 * A recall in a line, from its notice's first sentence: "The high-pressure
 * fuel pump may not have been manufactured properly." Transport Canada's
 * system ("Fuel system", "Other") says where the fault is, not what it is.
 * None for a notice written in capitals, which a line of would shout.
 */
export function recallHeadline(summary: string, max = 120): string | null {
  const { issue } = recallNotice(summary);
  const letters = issue.replace(/[^A-Za-z]/g, '');
  if (!letters || letters.replace(/[^A-Z]/g, '').length > letters.length * 0.6) return null;
  const [first] = issue.split(/(?<=[.!?])\s+(?=[A-Z])/);
  // "On certain vehicles, the fuel pump could fail." Some notices have a full stop there.
  let line = first.replace(/^(?:on|in)\s+(?:certain|some)\s+(?:vehicles|models)\s*[,.]\s*/i, '');
  if (!line) return null;
  line = line[0].toUpperCase() + line.slice(1);
  if (line.length <= max) return line;
  const cut = line.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:]$/, '')}…`;
}

/** A notice's issue after its first sentence, the one recallHeadline gives in a line. */
export function recallIssueRest(issue: string): string {
  return issue
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .slice(1)
    .join(' ');
}

function tidy(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/** "Nov 17, 2021", from Transport Canada's "2021-11-17". */
export function recallDate(iso: string): string {
  const date = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * Government part and system names in plain words: NHTSA's "POWER TRAIN" and
 * Transport Canada's "Seats And Restraints" read "Transmission and
 * drivetrain" and "Seats and restraints".
 */
export const complaintPart = plainPartName;
