/**
 * SAAMX News Presets (Backward-Compatible Adapter)
 * Re-exports NEWS_PRESETS generated from NEWS_PRESETS_LIBRARY while preserving
 * legacy step-based format for older consumers.
 */

import { NEWS_PRESETS_LIBRARY } from './newsPresetsLibrary.js';

export const NEWS_PRESETS = NEWS_PRESETS_LIBRARY.map((preset, index) => ({
  id: preset.id,
  step: index + 1,
  headline: preset.headline,
  title: preset.headline,
  description: preset.description,
  sentiment: preset.sentiment,
  affectedSector: (preset.affectedAssets && preset.affectedAssets.sectors && preset.affectedAssets.sectors[0]) || null,
  affectedSecurityIds: (preset.affectedAssets && preset.affectedAssets.securities) || [],
  priceAdjustmentPct: preset.impactParameters ? preset.impactParameters.priceImpactPercent : (preset.sentiment === 'Negative' ? -preset.impactMagnitude : preset.impactMagnitude),
  impactPercent: Math.abs(preset.impactParameters ? preset.impactParameters.priceImpactPercent : preset.impactMagnitude),
  category: preset.category.includes('Corporate') ? 'Corporate' : (preset.category.includes('Macro') ? 'Macro' : (preset.category.includes('Regulatory') ? 'Policy' : 'Corporate')),
  v2: preset
}));

export function getPresetById(id) {
  return NEWS_PRESETS.find(p => p.id === id || p.v2?.id === id || p.step === Number(id));
}

export function getPresetsByStep(step) {
  return NEWS_PRESETS.filter(p => p.step === Number(step));
}

export function getPresetsByCompany(companyTicker) {
  return NEWS_PRESETS.filter(p => p.affectedSecurityIds.includes(companyTicker));
}

export default NEWS_PRESETS;
