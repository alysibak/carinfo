/**
 * Escaping for text we splice into the HTML shell.
 *
 * Every value here originates in upstream data (EPA model names, NHTSA
 * strings) or the request URL, so none of it is trusted markup. Getting this
 * wrong is an XSS hole on every vehicle page at once.
 */

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** Escape text for an element body or a double-quoted attribute. */
export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
}

/**
 * Serialize data for a <script type="application/ld+json"> block.
 *
 * JSON.stringify alone is not safe inside a script element: a string
 * containing "</script>" would close the element early and let the rest run
 * as HTML. Escaping "<" (and the two line separators JS treats as newlines)
 * as unicode escapes keeps the JSON identical once parsed.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
