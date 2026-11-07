/**
 * ==============================================================================
 * SAAMX Authoritative API Gateway & Client Adapter (Phase 4.5)
 * ==============================================================================
 * All mutations, orders, transactions, corporate actions, and administrative
 * operations strictly route through HTTP REST endpoints (/api/*) to the
 * authoritative backend server.
 *
 * Direct client-side Realtime Database writes are completely purged in accordance
 * with Phase 4.3 database.rules.json (.write: false for all client contexts).
 * ==============================================================================
 */

export function calculateMarketClock(marketState, serverTimeOffset = 0) {
  if (!marketState) {
    return {
      sessionState: 'PRE_OPEN',
      currentPhase: 'PRE_OPEN',
      timeString: '09:00 AM',
      timeLeftString: '00:00',
      elapsedMinutes: 0,
      isPaused: false,
      isTradingActive: false
    };
  }

  const now = Date.now() + serverTimeOffset;
  const isCountdown =
    marketState.timerMode === 'COUNTDOWN' ||
    marketState.mode === 'COUNTDOWN' ||
    marketState.mode === 'DEMO';
  const mode = isCountdown ? 'COUNTDOWN' : 'EVENT';

  if (mode === 'EVENT') {
    let hours = 9,
      minutes = 30,
      seconds = 0;
    try {
      const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Kolkata',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }).formatToParts(new Date(now));
      hours = parseInt(parts.find(p => p.type === 'hour')?.value || '9', 10);
      minutes = parseInt(parts.find(p => p.type === 'minute')?.value || '30', 10);
      seconds = parseInt(parts.find(p => p.type === 'second')?.value || '0', 10);
    } catch (e) {
      const d = new Date(now);
      hours = d.getHours();
      minutes = d.getMinutes();
      seconds = d.getSeconds();
    }
    const totalMinutes = hours * 60 + minutes;

    let sessionState = 'PRE_OPEN';
    let currentPhase = 'REGISTRATION';
    let timeLeftString = '';
    let elapsedMinutes = 0;
    let isTradingActive = false;

    // Canonical SAAMX Schedule (Asia/Kolkata):
    // < 08:00          -> REGISTRATION
    // 08:00 - 09:00    -> BRIEFING
    // 09:00 - 09:30    -> PRE_OPEN
    // 09:30 - 10:00    -> MARKET_OPEN
    // 10:00 - 12:00    -> MORNING_SESSION
    // 12:00 - 13:00    -> LUNCH_BREAK
    // 13:00 - 15:30    -> AFTERNOON_SESSION
    // 15:30            -> MARKET CLOSE & VALUATION FREEZE
    // 15:30 - 15:45    -> RECONCILIATION
    // 15:45 - 16:00    -> APPROVAL (Judging Deliberation & Results Approval)
    // 16:00+           -> RESULTS

    if (totalMinutes < 8 * 60) {
      sessionState = 'PRE_OPEN';
      currentPhase = 'REGISTRATION';
      const rem = 8 * 60 - totalMinutes;
      timeLeftString = `REGISTRATION IN ${rem}M`;
      isTradingActive = false;
    } else if (totalMinutes < 9 * 60) {
      sessionState = 'PRE_OPEN';
      currentPhase = 'BRIEFING';
      const rem = 9 * 60 - totalMinutes;
      timeLeftString = `PRE-OPEN IN ${rem}M`;
      isTradingActive = false;
    } else if (totalMinutes < 9 * 60 + 30) {
      sessionState = 'PRE_OPEN';
      currentPhase = 'PRE_OPEN';
      const rem = 9 * 60 + 30 - totalMinutes;
      timeLeftString = `BELL RINGS IN ${rem}M`;
      isTradingActive = false;
    } else if (totalMinutes < 12 * 60) {
      sessionState = 'CONTINUOUS_TRADING';
      currentPhase = totalMinutes < 10 * 60 ? 'MARKET_OPEN' : 'MORNING_SESSION';
      const rem = 12 * 60 - totalMinutes;
      timeLeftString = `LUNCH IN ${Math.floor(rem / 60)}h ${rem % 60}m`;
      elapsedMinutes = totalMinutes - (9 * 60 + 30);
      isTradingActive = true;
    } else if (totalMinutes < 13 * 60) {
      sessionState = 'LUNCH_BREAK';
      currentPhase = 'LUNCH_BREAK';
      const rem = 13 * 60 - totalMinutes;
      timeLeftString = `LUNCH: RESUMES IN ${rem}M`;
      isTradingActive = false;
    } else if (totalMinutes < 15 * 60 + 30) {
      sessionState = 'CONTINUOUS_TRADING';
      currentPhase = 'AFTERNOON_SESSION';
      const rem = 15 * 60 + 30 - totalMinutes;
      timeLeftString = `CLOSES IN ${Math.floor(rem / 60)}h ${rem % 60}m`;
      elapsedMinutes = 120 + (totalMinutes - 13 * 60);
      isTradingActive = true;
    } else if (totalMinutes < 15 * 60 + 45) {
      sessionState = 'CLOSING';
      currentPhase = 'RECONCILIATION';
      const rem = 15 * 60 + 45 - totalMinutes;
      timeLeftString = `RECONCILIATION: ${rem}M`;
      isTradingActive = false;
    } else if (totalMinutes < 16 * 60) {
      sessionState = 'CLOSING';
      currentPhase = 'APPROVAL';
      const rem = 16 * 60 - totalMinutes;
      timeLeftString = `RESULTS APPROVAL: ${rem}M`;
      isTradingActive = false;
    } else {
      sessionState = 'RESULTS';
      currentPhase = 'RESULTS';
      timeLeftString = 'RESULTS PUBLISHED';
      isTradingActive = false;
    }

    let timeString = '09:30 AM';
    try {
      timeString = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }).format(new Date(now));
    } catch (e) {
      timeString = new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return {
      sessionState,
      currentPhase,
      timeString,
      timeLeftString,
      elapsedMinutes,
      isTradingActive: isTradingActive && marketState.status === 'Open',
      isPaused: marketState.status === 'Paused' || marketState.isFrozen
    };
  } else {
    // DEMO / SIMULATION MODE timings:
    const startTime = marketState.simulationStartTime;
    const durationMins = marketState.simulationDurationMinutes || 360;
    if (marketState.status === 'NotStarted' || !startTime) {
      return {
        sessionState: 'PRE_OPEN',
        currentPhase: 'PRE_OPEN',
        timeString: '09:30 AM',
        timeLeftString: `${String(durationMins).padStart(2, '0')}:00`,
        elapsedMinutes: 0,
        isPaused: false,
        isTradingActive: false
      };
    }

    const pauseOffset = marketState.pauseTimeOffset || 0;
    const pausedAt = marketState.pausedAt;

    let elapsedMs = 0;
    if (marketState.status === 'Paused' && pausedAt) {
      elapsedMs = pausedAt - startTime - pauseOffset;
    } else {
      elapsedMs = now - startTime - pauseOffset;
    }

    const elapsedMinutes = elapsedMs / 60000;

    let sessionState = 'CONTINUOUS_TRADING';
    let currentPhase = 'MORNING_SESSION';
    let timeLeftString = '00:00';
    let timeString = '09:30 AM';
    let isTradingActive = marketState.status === 'Open';

    const tradingLimit = durationMins * 0.75;
    const closingLimit = durationMins * 0.916;

    if (elapsedMinutes < tradingLimit) {
      sessionState = 'CONTINUOUS_TRADING';
      currentPhase = 'MORNING_SESSION';
      const progress = elapsedMinutes / tradingLimit;
      const simMinutes = progress * 360;
      const simTime = new Date(new Date().setHours(9, 30, 0, 0) + simMinutes * 60000);
      timeString = simTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const remainingMs = Math.max(0, tradingLimit * 60000 - elapsedMs);
      const remMin = Math.floor(remainingMs / 60000);
      const remSec = Math.floor((remainingMs % 60000) / 1000);
      timeLeftString = `${String(remMin).padStart(2, '0')}:${String(remSec).padStart(2, '0')}`;
    } else if (elapsedMinutes < closingLimit) {
      sessionState = 'CLOSING';
      isTradingActive = false;
      const progress = (elapsedMinutes - tradingLimit) / (closingLimit - tradingLimit);
      const isSecondHalf = progress >= 0.5;
      currentPhase = isSecondHalf ? 'APPROVAL' : 'RECONCILIATION';
      const simMinutes = progress * 30;
      const simTime = new Date(new Date().setHours(15, 30, 0, 0) + simMinutes * 60000);
      timeString = simTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const remainingMs = Math.max(0, closingLimit * 60000 - elapsedMs);
      const remMin = Math.floor(remainingMs / 60000);
      const remSec = Math.floor((remainingMs % 60000) / 1000);
      timeLeftString = isSecondHalf
        ? `RESULTS APPROVAL: ${String(remMin).padStart(2, '0')}:${String(remSec).padStart(2, '0')}`
        : `RECONCILIATION: ${String(remMin).padStart(2, '0')}:${String(remSec).padStart(2, '0')}`;
    } else {
      sessionState = 'RESULTS';
      currentPhase = 'RESULTS';
      isTradingActive = false;
      timeString = '04:00 PM';
      timeLeftString = 'RESULTS UNLOCKED';
    }

    return {
      sessionState,
      currentPhase,
      timeString,
      timeLeftString,
      elapsedMinutes: Math.floor(elapsedMinutes),
      isTradingActive,
      isPaused: marketState.status === 'Paused' || marketState.isFrozen
    };
  }
}

/**
 * Pure calculation of market indices from active securities list.
 * Note: Index persistence is handled authoritatively on the server backend.
 */
export async function updateMarketIndices(securities) {
  const activeSecurities = Object.values(securities || {}).filter(s => s && s.status !== 'Suspended');
  if (activeSecurities.length === 0) return {};

  let globalSum = 0, globalCount = 0;
  let indiaSum = 0, indiaCount = 0;
  let usSum = 0, usCount = 0;
  let ukSum = 0, ukCount = 0;

  activeSecurities.forEach(s => {
    const basePrice = s.basePrice || s.openingPrice || 100;
    const currentPrice = s.currentPrice || 100;
    const pctChange = ((currentPrice - basePrice) / basePrice) * 100;

    globalSum += pctChange;
    globalCount++;

    if (s.exchange === 'NSE' || s.exchange === 'BSE' || s.country === 'India') {
      indiaSum += pctChange;
      indiaCount++;
    }

    if (s.exchange === 'NASDAQ' || s.exchange === 'NYSE' || s.country === 'USA') {
      usSum += pctChange;
      usCount++;
    }

    if (s.exchange === 'LSE' || s.country === 'UK') {
      ukSum += pctChange;
      ukCount++;
    }
  });

  const globalAvg = globalCount > 0 ? globalSum / globalCount : 0;
  const indiaAvg = indiaCount > 0 ? indiaSum / indiaCount : 0;
  const usAvg = usCount > 0 ? usSum / usCount : 0;
  const ukAvg = ukCount > 0 ? ukSum / ukCount : 0;

  const globalVal = parseFloat((1000 * (1 + globalAvg / 100)).toFixed(2));
  const indiaVal = parseFloat((5000 * (1 + indiaAvg / 100)).toFixed(2));
  const usVal = parseFloat((8000 * (1 + usAvg / 100)).toFixed(2));
  const ukVal = parseFloat((4000 * (1 + ukAvg / 100)).toFixed(2));

  return {
    GLOBAL100: {
      name: 'SAAMX GLOBAL 100',
      currentValue: globalVal,
      openingValue: 1000,
      changePercent: parseFloat(globalAvg.toFixed(2)),
      changeAbsolute: parseFloat((globalVal - 1000).toFixed(2))
    },
    INDIA50: {
      name: 'SAAMX INDIA 50',
      currentValue: indiaVal,
      openingValue: 5000,
      changePercent: parseFloat(indiaAvg.toFixed(2)),
      changeAbsolute: parseFloat((indiaVal - 5000).toFixed(2))
    },
    US100: {
      name: 'SAAMX US 100',
      currentValue: usVal,
      openingValue: 8000,
      changePercent: parseFloat(usAvg.toFixed(2)),
      changeAbsolute: parseFloat((usVal - 8000).toFixed(2))
    },
    UK100: {
      name: 'SAAMX UK 100',
      currentValue: ukVal,
      openingValue: 4000,
      changePercent: parseFloat(ukAvg.toFixed(2)),
      changeAbsolute: parseFloat((ukVal - 4000).toFixed(2))
    }
  };
}

/**
 * Client-side audit log helper. Routes to authoritative backend POST /api/audit-log.
 */
export async function logAuditEvent(entry) {
  try {
    const res = await apiFetch('/api/audit-log', {
      method: 'POST',
      body: JSON.stringify(entry)
    });
    if (res && res.ok) {
      const data = await res.json();
      return data.auditEntry || entry;
    }
    return entry;
  } catch (err) {
    console.error('Audit log API dispatch warning:', err);
    return entry;
  }
}

/**
 * Returns the configurable API base URL (VITE_API_URL or cloud domain fallback).
 */
export function getApiBaseUrl() {
  const envApiUrl = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL;
  if (envApiUrl) {
    return String(envApiUrl).replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined') {
    if (window.__SAAMX_API_URL__) {
      return String(window.__SAAMX_API_URL__).replace(/\/+$/, '');
    }
    const host = window.location.hostname;
    if (
      host === 'saamx.in' ||
      host === 'www.saamx.in' ||
      host === 'fmos-a6573.web.app' ||
      host === 'fmos-a6573.firebaseapp.com'
    ) {
      return 'https://api.saamx.in';
    }
  }
  return '';
}

/**
 * Authoritative API Gateway client fetcher.
 * Automatically injects authentication tokens, passwords, and role headers.
 * All mutations strictly route to Render / Express backend via configured VITE_API_URL.
 */
export async function apiFetch(path, options = {}) {
  const sessionToken =
    typeof sessionStorage !== 'undefined'
      ? sessionStorage.getItem('saamx_token') || localStorage.getItem('saamx_token')
      : null;
  const sessionPw =
    typeof sessionStorage !== 'undefined'
      ? sessionStorage.getItem('saamx_password') || localStorage.getItem('saamx_password')
      : null;
  const sessionRole =
    typeof sessionStorage !== 'undefined'
      ? sessionStorage.getItem('saamx_role') || localStorage.getItem('saamx_role')
      : null;
  const sessionTeamCode =
    typeof sessionStorage !== 'undefined'
      ? sessionStorage.getItem('saamx_team_code') || localStorage.getItem('saamx_team_code')
      : null;

  const headers = {
    'Content-Type': 'application/json',
    ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
    ...(sessionPw ? { 'X-FMS-Password': sessionPw } : {}),
    ...(sessionRole ? { 'X-FMS-Role': sessionRole } : {}),
    ...(sessionTeamCode ? { 'X-FMS-Team-Code': sessionTeamCode } : {}),
    ...(options.idempotencyKey ? { 'X-Idempotency-Key': options.idempotencyKey } : {}),
    ...(options.headers || {})
  };

  const apiBase = getApiBaseUrl();
  let targetUrl;
  if (path.startsWith('http://') || path.startsWith('https://')) {
    targetUrl = path;
  } else {
    const normalizedPath = path.startsWith('/api')
      ? path
      : `/api${path.startsWith('/') ? '' : '/'}${path}`;
    targetUrl = apiBase ? `${apiBase}${normalizedPath}` : normalizedPath;
  }

  const nativeFetch =
    typeof window !== 'undefined' && window.__nativeFetch
      ? window.__nativeFetch
      : typeof fetch === 'function'
      ? fetch
      : null;

  if (!nativeFetch) {
    throw new Error('HTTP fetch unavailable in current runtime environment.');
  }

  const fetchOptions = {
    ...options,
    _skipApiIntercept: true,
    headers
  };

  if (fetchOptions.body && typeof fetchOptions.body !== 'string' && !(fetchOptions.body instanceof FormData)) {
    fetchOptions.body = JSON.stringify(fetchOptions.body);
  }

  return await nativeFetch(targetUrl, fetchOptions);
}


// ==========================================
// SAAMX PHASE 3 & 4 AUTHORITATIVE CLIENT HELPERS
// ==========================================

export async function fetchEventSchedule(eventId) {
  const q = eventId ? `?eventId=${eventId}` : '';
  const res = await apiFetch(`/api/event/schedule${q}`);
  return res.json();
}

export async function updateEventSchedule(eventId, updates) {
  const res = await apiFetch('/api/event/schedule/update', {
    method: 'POST',
    body: JSON.stringify({ eventId, ...updates })
  });
  return res.json();
}

export async function overrideSchedulePhase(phase, options = {}) {
  const res = await apiFetch('/api/event/schedule/override', {
    method: 'POST',
    body: JSON.stringify({ phase, ...options })
  });
  return res.json();
}

export async function freezeValuationSnapshot(eventId, reason = 'Market Close Snapshot') {
  const res = await apiFetch('/api/event/valuation/freeze', {
    method: 'POST',
    body: JSON.stringify({ eventId, reason })
  });
  return res.json();
}

export async function fetchValuationSnapshot(eventId) {
  const q = eventId ? `?eventId=${eventId}` : '';
  const res = await apiFetch(`/api/event/valuation/snapshot${q}`);
  return res.json();
}

export async function runReconciliation(eventId, adjustments = [], notes = '') {
  const res = await apiFetch('/api/event/reconciliation/run', {
    method: 'POST',
    body: JSON.stringify({ eventId, adjustments, notes })
  });
  return res.json();
}

export async function fetchScoringLeaderboard() {
  const res = await apiFetch('/api/scoring/leaderboard');
  return res.json();
}

export async function fetchTeamScorecard(teamId) {
  const res = await apiFetch(`/api/scoring/team/${encodeURIComponent(teamId)}`);
  return res.json();
}

export async function recalculateScores() {
  const res = await apiFetch('/api/scoring/recalculate', { method: 'POST' });
  return res.json();
}

export async function fetchJudgeScorecards(query = {}) {
  const params = new URLSearchParams(query).toString();
  const res = await apiFetch(`/api/judging/scorecards${params ? `?${params}` : ''}`);
  return res.json();
}

export async function saveJudgeScorecard(cardData) {
  const res = await apiFetch('/api/judging/scorecard/save', {
    method: 'POST',
    body: JSON.stringify(cardData)
  });
  return res.json();
}

export async function moderateJudgeScorecards(moderationData) {
  const res = await apiFetch('/api/judging/moderate', {
    method: 'POST',
    body: JSON.stringify(moderationData)
  });
  return res.json();
}

export async function fetchPenalties(teamCode) {
  const q = teamCode ? `?teamCode=${encodeURIComponent(teamCode)}` : '';
  const res = await apiFetch(`/api/penalties${q}`);
  return res.json();
}

export async function createPenalty(penaltyData) {
  const res = await apiFetch('/api/penalties/create', {
    method: 'POST',
    body: JSON.stringify(penaltyData)
  });
  return res.json();
}

export async function appealPenalty(penaltyId, appealReason, submittedBy) {
  const res = await apiFetch('/api/penalties/appeal', {
    method: 'POST',
    body: JSON.stringify({ penaltyId, appealReason, submittedBy })
  });
  return res.json();
}

export async function resolvePenaltyAppeal(penaltyId, resolution, resolutionReason, reviewedBy) {
  const res = await apiFetch('/api/penalties/resolve-appeal', {
    method: 'POST',
    body: JSON.stringify({ penaltyId, resolution, resolutionReason, reviewedBy })
  });
  return res.json();
}

export async function updateResultsLifecycle(lifecycleState) {
  const res = await apiFetch('/api/results/lifecycle', {
    method: 'POST',
    body: JSON.stringify({ lifecycleState })
  });
  return res.json();
}

export async function approveResults(eventId, approver, notes) {
  const res = await apiFetch('/api/results/approve', {
    method: 'POST',
    body: JSON.stringify({ eventId, approver, notes })
  });
  return res.json();
}

export async function publishResults(eventId, publisher) {
  const res = await apiFetch('/api/results/publish', {
    method: 'POST',
    body: JSON.stringify({ eventId, publisher })
  });
  return res.json();
}

export async function reopenResults(eventId, reason) {
  const res = await apiFetch('/api/results/reopen', {
    method: 'POST',
    body: JSON.stringify({ eventId, reason })
  });
  return res.json();
}

export async function fetchIntelligenceFeed(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const res = await apiFetch(`/api/intelligence/feed${qs ? `?${qs}` : ''}`);
  return res.json();
}

export async function publishIntelligenceItem(item) {
  const res = await apiFetch('/api/intelligence/item', {
    method: 'POST',
    body: JSON.stringify(item)
  });
  return res.json();
}

export async function manageScenario(action, scenario) {
  const res = await apiFetch('/api/scenarios/manage', {
    method: 'POST',
    body: JSON.stringify({ action, scenario })
  });
  return res.json();
}

export async function publishBrokerBulletin(bulletin) {
  const res = await apiFetch('/api/broker/bulletin', {
    method: 'POST',
    body: JSON.stringify(bulletin)
  });
  return res.json();
}

export async function startDebateRound(roundData) {
  const res = await apiFetch('/api/bull-bear/round', {
    method: 'POST',
    body: JSON.stringify(roundData)
  });
  return res.json();
}

export async function fetchEventReport() {
  const res = await apiFetch('/api/analytics/event-report');
  return res.json();
}
