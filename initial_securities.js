/**
 * SAAMX 2026 — Master Global Universe Data Bridge
 * Replaces the legacy 112 list with the authoritative 2,061 global securities universe.
 */

import { ALL_SECURITIES_DATA } from './universe_data.js';
import { generateFullSecurityUniverse } from './universe_generator.js';

export const INITIAL_SECURITIES_TEMPLATES = ALL_SECURITIES_DATA;
export { ALL_SECURITIES_DATA, generateFullSecurityUniverse };
export default ALL_SECURITIES_DATA;
