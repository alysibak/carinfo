/**
 * Where privacy requests and questions go, set at build time with
 * VITE_CONTACT_EMAIL. Quebec's Law 25 asks a site to publish how to reach the
 * person responsible for personal information; without an address the pages
 * point to the Account page's own tools instead.
 */
export const CONTACT_EMAIL: string | null = import.meta.env.VITE_CONTACT_EMAIL?.trim() || null;

/** The date the privacy policy and terms last changed, as their pages state it. */
export const LEGAL_UPDATED = '2026-11-04';
