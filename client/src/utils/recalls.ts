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
 * Government part and system names in sentence case: NHTSA's "ELECTRICAL
 * SYSTEM" and Transport Canada's "Seats And Restraints" read "Electrical
 * system" and "Seats and restraints".
 */
export function complaintPart(name: string): string {
  const lower = name.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}
