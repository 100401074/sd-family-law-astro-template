/**
 * Single source of truth for firm-specific values. Edit firm.config.json (at the
 * repo root) — never hardcode firm details in components or pages. This module
 * loads the JSON at build time so Astro tree-shakes unused fields cleanly.
 */

import firmConfigJson from '../../firm.config.json';

export type FirmConfig = typeof firmConfigJson;

export const firmConfig: FirmConfig = firmConfigJson;

export const firm = firmConfig.firm;
export const attorney = firmConfig.attorney;
export const credentials = firmConfig.credentials;
export const practiceAreas = firmConfig.practiceAreas;
export const navigation = firmConfig.navigation;

/** Helper: format an areas-served list for prose ("Chula Vista, El Cajon, and Escondido"). */
export function listAreas(areas: string[] = firm.primaryAreasServed): string {
  if (areas.length === 0) return '';
  if (areas.length === 1) return areas[0]!;
  if (areas.length === 2) return `${areas[0]} and ${areas[1]}`;
  return `${areas.slice(0, -1).join(', ')}, and ${areas[areas.length - 1]}`;
}

/** Helper: build a tel: href from the phone string. */
export function telHref(phone: string = firm.phone): string {
  return `tel:+1${phone.replace(/[^0-9]/g, '')}`;
}
