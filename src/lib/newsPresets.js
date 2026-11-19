/**
 * SAAMX News Presets (Backward-Compatible Adapter)
 * Re-exports NEWS_PRESETS generated from NEWS_PRESETS_LIBRARY while preserving
 * legacy step-based format and modern 500 structured presets attributes.
 */

import { NEWS_PRESETS_LIBRARY } from './newsPresetsLibrary.js';

export const NEWS_PRESETS = NEWS_PRESETS_LIBRARY.map((preset, index) => ({
  id: preset.id,
  presetId: preset.presetId || preset.id,
  sequence: preset.sequence || index + 1,
  step: preset.sequence || index + 1,
  headline: preset.headline,
  shortHeadline: preset.shortHeadline || preset.headline,
  title: preset.headline,
  description: preset.description,
  sentiment: preset.sentiment,
  scope: preset.scope,
  country: preset.country,
  region: preset.region,
  primaryDirection: preset.primaryDirection,
  secondaryDirection: preset.secondaryDirection,
  affectedSector: (preset.affectedAssets && preset.affectedAssets.sectors && preset.affectedAssets.sectors[0]) || null,
  affectedSectors: preset.affectedSectors || (preset.affectedAssets && preset.affectedAssets.sectors) || [],
  affectedSecurityIds: preset.affectedSecurityIds || (preset.affectedAssets && preset.affectedAssets.securities) || [],
  affectedTickers: preset.affectedTickers || preset.affectedSecurityIds || [],
  affectedCurrencies: preset.affectedCurrencies || (preset.affectedAssets && preset.affectedAssets.currencies) || [],
  priceAdjustmentPct: preset.impactParameters ? preset.impactParameters.priceImpactPercent : (preset.sentiment === 'Negative' ? -preset.impactMagnitude : preset.impactMagnitude),
  impactPercent: Math.abs(preset.impactParameters ? preset.impactParameters.priceImpactPercent : preset.impactMagnitude),
  impactMagnitude: preset.impactMagnitude,
  category: preset.category,
  directImpact: preset.directImpact,
  secondOrderImpact: preset.secondOrderImpact,
  crossMarketImpact: preset.crossMarketImpact,
  suggestedMarketReaction: preset.suggestedMarketReaction,
  operatorNotes: preset.operatorNotes,
  debateRelevance: preset.debateRelevance,
  ipoRelevance: preset.ipoRelevance,
  targetClassifications: preset.targetClassifications || [],
  v2: preset
}));

export function getPresetById(id) {
  if (!id) return null;
  const target = String(id).toUpperCase().trim();
  return NEWS_PRESETS.find(p => 
    p.id.toUpperCase() === target || 
    p.presetId.toUpperCase() === target ||
    (p.v2?.legacyId && p.v2.legacyId.toUpperCase() === target) ||
    String(p.sequence) === target || 
    String(p.step) === target
  );
}

export function getPresetsByStep(step) {
  return NEWS_PRESETS.filter(p => p.step === Number(step));
}

export function getPresetsByCompany(companyTicker) {
  return NEWS_PRESETS.filter(p => p.affectedSecurityIds.includes(companyTicker));
}

export function getPresetsByScope(scope) {
  if (!scope || scope === 'All') return NEWS_PRESETS;
  return NEWS_PRESETS.filter(p => p.scope?.toUpperCase() === scope?.toUpperCase());
}

export default NEWS_PRESETS;
