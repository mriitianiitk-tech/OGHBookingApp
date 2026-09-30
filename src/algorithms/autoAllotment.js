/**
 * BLW Varanasi - Smart Accommodation Auto-Allotment Engine v7.0
 * ============================================================
 * Advanced multi-objective, probabilistic room allocation engine
 * for Officers Guest House (OGH) and Officers Rest House (ORH).
 * 
 * Features:
 * 1. Calendar & Seasonal Peak Surge Engine (Holidays, Long Weekends, Varanasi Festival Peaks, GM Inspections).
 * 2. Long-Stay Surge Collision Penalty for non-duty stays > 3 days crossing peak days.
 * 3. Proximity-Sensitive Dynamic Quota Inflation (Poisson arrival model).
 * 4. 3-Tier Allocation Directive (MUST_ALLOT, SHOULD_ALLOT, NORMAL_ALLOT).
 * 5. Multi-Option Partial Allotment Engine (Less Capacity, Less Duration, Split Stays, ORH Transit).
 * 6. Configurable parameters & calendar registry.
 */

import { formatDateDDMMYYYY } from '../utils/dateUtils.js';

export const DEFAULT_SETTINGS = {
  directive_must_allot_score: 1000.0,
  directive_should_allot_boost: 350.0,
  level_multiplier: 12.0,
  apex_bonus_l17: 80.0,
  apex_bonus_l16: 50.0,
  apex_bonus_l15: 35.0,
  apex_bonus_l14: 20.0,
  apex_bonus_l12: 10.0,
  purpose_duty_score: 40.0,
  purpose_medical_score: 30.0,
  purpose_personal_score: 15.0,
  purpose_guest_score: 5.0,
  status_mult_serving: 1.10,
  status_mult_retired: 1.00,
  status_mult_guest: 0.80,
  duration_bonus_le_1d: 25.0,
  duration_bonus_le_2d: 18.0,
  duration_bonus_le_3d: 10.0,
  duration_penalty_gt_7d_personal: -20.0,
  duration_penalty_gt_7d_duty: -5.0,
  demand_bonus_le_2beds: 20.0,
  demand_bonus_le_4beds: 5.0,
  demand_penalty_gt_4beds: -15.0,
  reference_bonus_apex: 25.0,
  reference_bonus_senior: 15.0,
  reference_bonus_general: 5.0,
  dow_mult_friday: 1.45,
  dow_mult_sunday: 1.20,
  dow_mult_saturday: 1.15,
  dow_mult_weekday: 0.85,
  surge_overlap_penalty_rate: 20.0,
  surge_long_stay_threshold_days: 3.0,
  peak_horizon_max_days: 7.0,
  calendar_events: [
    { name: "Gandhi Jayanti (Long Weekend)", start: "2026-10-02", end: "2026-10-04", surge_factor: 1.6 },
    { name: "Dussehra / Vijayadashami", start: "2026-10-19", end: "2026-10-21", surge_factor: 1.7 },
    { name: "Diwali & Dev Deepawali Peak", start: "2026-11-08", end: "2026-11-25", surge_factor: 2.2 },
    { name: "Chhath Puja", start: "2026-11-15", end: "2026-11-18", surge_factor: 1.8 },
    { name: "GM Annual Inspection Week", start: "2026-12-10", end: "2026-12-16", surge_factor: 2.5 },
    { name: "Christmas & New Year Peak", start: "2026-12-24", end: "2027-01-02", surge_factor: 2.0 }
  ],
  fitness_slack_multiplier: 15.0,
  fitness_gf_bonus_senior: 40.0,
  fitness_gf_penalty_senior: -20.0,
  fitness_upper_bonus_junior: 25.0,
  fitness_gf_penalty_junior: -15.0,
  fitness_group_4bed_bonus: 50.0,
  fitness_group_2bed_penalty: -20.0,
  fitness_single_2bed_bonus: 30.0,
  fitness_single_4bed_penalty: -40.0,
  prob_target_service_level: 0.85,
  lambda_vvip: 0.05,
  lambda_vip: 0.15,
  lambda_gf: 0.35,
  lambda_standard: 0.20,
  buffer_standard_hours: 2.0,
  buffer_vip_hours: 4.0
};

/**
 * Poisson Cumulative Distribution Function
 */
export function poissonCdf(k, mu) {
  if (mu <= 0) return 1.0;
  let s = 0.0;
  let term = Math.exp(-mu);
  s += term;
  for (let i = 1; i <= k; i++) {
    term *= (mu / i);
    s += term;
  }
  return s;
}

/**
 * Determine room tier classification
 */
export function getRoomTier(room) {
  if (room.tier) return room.tier;
  if (room.building === 'OGH') {
    if (room.id === '13') return 'VVIP';
    if ((room.type || '').includes('VIP')) return 'VIP';
    if (room.floor === 'Ground') return 'Ground_Floor';
    return 'Standard';
  }
  if (room.building === 'ORH') {
    if (['101', '203'].includes(room.id)) return 'ORH_Buffer';
    return 'ORH_Transit';
  }
  return 'Standard';
}

/**
 * Calculate Date Surge Multiplier and associated reasons
 */
export function calculateDateSurgeFactor(dt, settings = DEFAULT_SETTINGS) {
  const d = new Date(dt);
  const dow = d.toLocaleDateString('en-US', { weekday: 'long' });
  const dStr = d.toISOString().slice(0, 10);

  const factors = [];
  const reasons = [];

  if (dow === 'Friday') {
    factors.push(settings.dow_mult_friday ?? 1.45);
    reasons.push('Friday Peak');
  } else if (dow === 'Saturday') {
    factors.push(settings.dow_mult_saturday ?? 1.15);
    reasons.push('Saturday Weekend');
  } else if (dow === 'Sunday') {
    factors.push(settings.dow_mult_sunday ?? 1.20);
    reasons.push('Sunday Weekend');
  } else {
    factors.push(settings.dow_mult_weekday ?? 0.85);
  }

  const events = settings.calendar_events || [];
  for (const ev of events) {
    if (ev.start <= dStr && dStr <= ev.end) {
      factors.push(ev.surge_factor ?? 1.5);
      reasons.push(ev.name);
    }
  }

  let composite = Math.max(...factors);
  if (factors.length > 1 && reasons.some(r => r.includes('Weekend') || r.includes('Peak'))) {
    composite = factors[0] * factors[1] * 0.85;
  }

  return {
    factor: Math.round(composite * 100) / 100,
    reasons
  };
}

/**
 * Calculate Stay Calendar Metrics (excess surge, peak days crossed, peak reasons)
 */
export function calculateStayCalendarMetrics(startDt, endDt, settings = DEFAULT_SETTINGS) {
  const s = new Date(startDt);
  const e = new Date(endDt);
  let curr = new Date(s);
  let peakCount = 0;
  let totalSurgeExcess = 0.0;
  const allReasons = new Set();

  // Step day by day
  while (curr < e) {
    const { factor, reasons } = calculateDateSurgeFactor(curr, settings);
    if (factor > 1.1) {
      peakCount++;
      totalSurgeExcess += (factor - 1.0);
      reasons.forEach(r => allReasons.add(r));
    }
    curr.setDate(curr.getDate() + 1);
  }

  return {
    totalSurgeExcess: Math.round(totalSurgeExcess * 100) / 100,
    peakDays: peakCount,
    reasons: Array.from(allReasons)
  };
}

/**
 * Calculate Preserved Quota for room tiers using Poisson arrival model
 */
export function calculatePreservedQuotaV7(tier, startDt, currentTime, settings = DEFAULT_SETTINGS) {
  const lambdas = {
    VVIP: settings.lambda_vvip ?? 0.05,
    VIP: settings.lambda_vip ?? 0.15,
    Ground_Floor: settings.lambda_gf ?? 0.35,
    Standard: settings.lambda_standard ?? 0.20
  };
  const baseLambda = lambdas[tier] ?? 0.15;
  const now = currentTime ? new Date(currentTime) : new Date();
  const start = new Date(startDt);
  const leadTimeDays = Math.max(0.0, (start.getTime() - now.getTime()) / (1000 * 86400));
  const { factor: surgeMult } = calculateDateSurgeFactor(start, settings);
  const maxHorizon = settings.peak_horizon_max_days ?? 7.0;
  const horizon = Math.min(Math.max(leadTimeDays, 0.5), maxHorizon);
  const mu = baseLambda * surgeMult * horizon;
  const targetSL = settings.prob_target_service_level ?? 0.85;

  for (let k = 0; k < 10; k++) {
    if (poissonCdf(k, mu) >= targetSL) {
      return k;
    }
  }
  return 2;
}

/**
 * Calculate Importance Priority Score v7.0 with breakdown
 */
export function calculateImportanceScoreV7(req, settings = DEFAULT_SETTINGS) {
  const breakdown = {};
  const directive = (req.directive || (req.must_allot ? 'MUST_ALLOT' : 'NORMAL_ALLOT')).toUpperCase().trim();

  if (directive === 'MUST_ALLOT') {
    const mustScore = settings.directive_must_allot_score ?? 1000.0;
    breakdown['directive_must_allot'] = mustScore;
    return { score: mustScore, breakdown };
  }

  const level = parseInt(req.level, 10) || 11;
  const levelBase = level * (settings.level_multiplier ?? 12.0);

  let apex = 0.0;
  if (level >= 17) apex = settings.apex_bonus_l17 ?? 80.0;
  else if (level === 16) apex = settings.apex_bonus_l16 ?? 50.0;
  else if (level === 15) apex = settings.apex_bonus_l15 ?? 35.0;
  else if (level === 14) apex = settings.apex_bonus_l14 ?? 20.0;
  else if (level >= 12) apex = settings.apex_bonus_l12 ?? 10.0;
  breakdown['seniority_score'] = levelBase + apex;

  const purpose = (req.purpose || req.category || 'Guest').trim();
  let pScore = settings.purpose_guest_score ?? 5.0;
  if (['Duty', 'Official', 'On Duty'].includes(purpose)) {
    pScore = settings.purpose_duty_score ?? 40.0;
  } else if (['Medical', 'Emergency'].includes(purpose)) {
    pScore = settings.purpose_medical_score ?? 30.0;
  } else if (['Personal', 'Private'].includes(purpose)) {
    pScore = settings.purpose_personal_score ?? 15.0;
  }
  breakdown['purpose_score'] = pScore;

  const status = (req.status || 'Serving').trim();
  let sMult = settings.status_mult_guest ?? 0.80;
  if (status === 'Serving') sMult = settings.status_mult_serving ?? 1.10;
  else if (status === 'Retired') sMult = settings.status_mult_retired ?? 1.00;

  const subtotal = (levelBase + apex + pScore) * sMult;
  breakdown['status_adjusted_subtotal'] = Math.round(subtotal * 10) / 10;

  const dur = req.duration_days ?? 2.0;
  let dBonus = 0.0;
  if (dur <= 1.0) dBonus = settings.duration_bonus_le_1d ?? 25.0;
  else if (dur <= 2.0) dBonus = settings.duration_bonus_le_2d ?? 18.0;
  else if (dur <= 3.0) dBonus = settings.duration_bonus_le_3d ?? 10.0;
  else if (dur > 7.0) {
    dBonus = ['Duty', 'Official', 'On Duty'].includes(purpose)
      ? (settings.duration_penalty_gt_7d_duty ?? -5.0)
      : (settings.duration_penalty_gt_7d_personal ?? -20.0);
  }
  breakdown['duration_bonus'] = dBonus;

  const beds = parseInt(req.beds, 10) || 2;
  let bBonus = 0.0;
  if (beds <= 2) bBonus = settings.demand_bonus_le_2beds ?? 20.0;
  else if (beds <= 4) bBonus = settings.demand_bonus_le_4beds ?? 5.0;
  else bBonus = settings.demand_penalty_gt_4beds ?? -15.0;
  breakdown['demand_bonus'] = bBonus;

  const ref = (req.reference || '').toLowerCase();
  let rBonus = 0.0;
  if (['gm', 'mr', 'minister', 'crb', 'board'].some(k => ref.includes(k))) {
    rBonus = settings.reference_bonus_apex ?? 25.0;
  } else if (['cvo', 'pce', 'pcee', 'pcme', 'pfa', 'drm', 'agm', 'phod'].some(k => ref.includes(k))) {
    rBonus = settings.reference_bonus_senior ?? 15.0;
  } else if (ref.trim().length > 2) {
    rBonus = settings.reference_bonus_general ?? 5.0;
  }
  breakdown['reference_bonus'] = rBonus;

  let surgePenalty = 0.0;
  if (!['Duty', 'Official', 'On Duty'].includes(purpose) && dur > (settings.surge_long_stay_threshold_days ?? 3.0)) {
    const metrics = calculateStayCalendarMetrics(req.start_dt || req.from, req.end_dt || req.to, settings);
    if (metrics.peakDays > 0) {
      surgePenalty = -1.0 * metrics.peakDays * (settings.surge_overlap_penalty_rate ?? 20.0);
    }
  }
  breakdown['surge_collision_penalty'] = surgePenalty;

  let total = subtotal + dBonus + bBonus + rBonus + surgePenalty;

  if (directive === 'SHOULD_ALLOT') {
    const boost = settings.directive_should_allot_boost ?? 350.0;
    total += boost;
    breakdown['directive_should_allot_boost'] = boost;
  }

  const finalScore = Math.max(10.0, Math.round(total * 100) / 100);
  return { score: finalScore, breakdown };
}

/**
 * Generate multi-option partial allotment alternatives (Less Capacity, Less Duration, Split Stay, ORH alternative)
 */
export function generatePartialAllotmentOptionsV7(req, rooms, settings = DEFAULT_SETTINGS) {
  const reqStart = new Date(req.start_dt || req.from);
  const reqEnd = new Date(req.end_dt || req.to);
  const totalRequestedDays = req.duration_days || Math.max(0.5, (reqEnd - reqStart) / 86400000);
  const bedsNeeded = parseInt(req.beds, 10) || 2;
  const defaultBuf = settings.buffer_standard_hours ?? 2.0;
  const vipBuf = settings.buffer_vip_hours ?? 4.0;

  const options = {
    less_capacity: [],
    less_duration: [],
    split_stay: [],
    orh_alternative: []
  };

  const getBufMs = (r) => (r.id === '13' || (r.type || '').includes('VIP') ? vipBuf : defaultBuf) * 3600000;

  // 1. Less Capacity & 2. Less Duration
  for (const r of rooms) {
    const bufMs = getBufMs(r);
    const bookings = r.bookings || [];

    const isAvailableForRange = (sMs, eMs) => {
      return bookings.every(b => {
        const bStart = new Date(b.checkIn).getTime();
        const bEnd = new Date(b.checkOut).getTime() + bufMs;
        return !(sMs < bEnd && (eMs + bufMs) > bStart);
      });
    };

    const fullFree = isAvailableForRange(reqStart.getTime(), reqEnd.getTime());
    const rBeds = (r.type || '').includes('4-Bedded') || r.beds === 4 ? 4 : 2;

    if (fullFree && rBeds < bedsNeeded) {
      options.less_capacity.push({
        type: 'LESS_CAPACITY',
        roomId: r.id,
        building: r.building,
        roomType: r.type,
        floor: r.floor,
        availableBeds: rBeds,
        requestedBeds: bedsNeeded,
        checkIn: reqStart.toISOString(),
        checkOut: reqEnd.toISOString(),
        datesText: `${formatDateDDMMYYYY(reqStart)} to ${formatDateDDMMYYYY(reqEnd)}`,
        title: `Allot ${r.building}-${r.id} (${rBeds} beds)`,
        description: `Confirm ${rBeds} beds in ${r.building}-${r.id} (${r.type}). Deficit of ${bedsNeeded - rBeds} beds waitlisted.`
      });
    }

    // Check free blocks in 6-hour increments
    let curr = new Date(reqStart);
    const stepMs = 6 * 3600000;
    let freeBlocks = [];
    let inBlock = false;
    let blockStart = null;

    while (curr < reqEnd) {
      const subFree = isAvailableForRange(curr.getTime(), curr.getTime() + stepMs);
      if (subFree) {
        if (!inBlock) {
          inBlock = true;
          blockStart = new Date(curr);
        }
      } else {
        if (inBlock) {
          inBlock = false;
          freeBlocks.push({ start: blockStart, end: new Date(curr) });
        }
      }
      curr = new Date(curr.getTime() + stepMs);
    }
    if (inBlock) {
      freeBlocks.push({ start: blockStart, end: new Date(curr) });
    }

    for (const blk of freeBlocks) {
      const blkDays = (blk.end - blk.start) / 86400000;
      if (blkDays >= 1.0 && (blk.start > reqStart || blk.end < reqEnd)) {
        const pct = Math.round((blkDays / totalRequestedDays) * 100);
        options.less_duration.push({
          type: 'LESS_DURATION',
          roomId: r.id,
          building: r.building,
          roomType: r.type,
          floor: r.floor,
          availableBeds: rBeds,
          checkIn: blk.start.toISOString(),
          checkOut: blk.end.toISOString(),
          coveredDays: Math.round(blkDays * 10) / 10,
          coveragePct: pct,
          datesText: `${formatDateDDMMYYYY(blk.start)} to ${formatDateDDMMYYYY(blk.end)}`,
          title: `Allot ${r.building}-${r.id} for Partial Period (${pct}% coverage)`,
          description: `Allot ${r.building}-${r.id} for ${Math.round(blkDays * 10) / 10} of ${Math.round(totalRequestedDays * 10) / 10} days (${pct}% coverage). Midweek dates covered, avoiding peak collision.`
        });
      }
    }
  }

  // 3. Split Stay (Midpoint combinations across different rooms)
  const midPoints = [];
  const daysInt = Math.floor(totalRequestedDays);
  for (let d = 1; d < Math.min(daysInt, 6); d++) {
    const mid = new Date(reqStart.getTime() + d * 86400000);
    mid.setHours(12, 0, 0, 0);
    midPoints.push(mid);
  }

  for (const mid of midPoints) {
    const r1Candidates = [];
    const r2Candidates = [];

    for (const r of rooms) {
      const bufMs = getBufMs(r);
      const bookings = r.bookings || [];
      const free1 = bookings.every(b => {
        const bStart = new Date(b.checkIn).getTime();
        const bEnd = new Date(b.checkOut).getTime() + bufMs;
        return !(reqStart.getTime() < bEnd && (mid.getTime() + bufMs) > bStart);
      });
      const free2 = bookings.every(b => {
        const bStart = new Date(b.checkIn).getTime();
        const bEnd = new Date(b.checkOut).getTime() + bufMs;
        return !(mid.getTime() < bEnd && (reqEnd.getTime() + bufMs) > bStart);
      });

      if (free1) r1Candidates.push(r);
      if (free2) r2Candidates.push(r);
    }

    for (const r1 of r1Candidates) {
      for (const r2 of r2Candidates) {
        if (r1.id !== r2.id || r1.building !== r2.building) {
          options.split_stay.push({
            type: 'SPLIT_STAY',
            firstRoom: { id: r1.id, building: r1.building, type: r1.type, checkIn: reqStart.toISOString(), checkOut: mid.toISOString() },
            secondRoom: { id: r2.id, building: r2.building, type: r2.type, checkIn: mid.toISOString(), checkOut: reqEnd.toISOString() },
            switchDate: mid.toISOString(),
            title: `Split Stay: ${r1.building}-${r1.id} ➔ ${r2.building}-${r2.id}`,
            description: `Stay in ${r1.building}-${r1.id} until ${formatDateDDMMYYYY(mid)}, then switch to ${r2.building}-${r2.id} for the remainder.`
          });
          break;
        }
      }
      if (options.split_stay.length >= 2) break;
    }
    if (options.split_stay.length >= 2) break;
  }

  // 4. ORH Alternative (if request had OGH focus and ORH rooms are available)
  const orhRooms = rooms.filter(r => r.building === 'ORH');
  for (const orh of orhRooms) {
    const bufMs = getBufMs(orh);
    const bookings = orh.bookings || [];
    const isFree = bookings.every(b => {
      const bStart = new Date(b.checkIn).getTime();
      const bEnd = new Date(b.checkOut).getTime() + bufMs;
      return !(reqStart.getTime() < bEnd && (reqEnd.getTime() + bufMs) > bStart);
    });

    if (isFree) {
      const orhCap = (orh.type || '').includes('4-Bedded') ? 4 : 2;
      options.orh_alternative.push({
        type: 'ORH_ALTERNATIVE',
        roomId: orh.id,
        building: 'ORH',
        roomType: orh.type,
        floor: orh.floor,
        availableBeds: orhCap,
        checkIn: reqStart.toISOString(),
        checkOut: reqEnd.toISOString(),
        title: `Route to Officers Rest House: ORH-${orh.id}`,
        description: `Confirm full dates in ORH-${orh.id} (${orh.type}, ${orh.floor} Floor). Keeps prime OGH suites free for incoming inspection officers.`
      });
      if (options.orh_alternative.length >= 2) break;
    }
  }

  // Limit and sort options
  options.less_duration.sort((a, b) => b.coveredDays - a.coveredDays);
  options.less_duration = options.less_duration.slice(0, 3);
  options.less_capacity = options.less_capacity.slice(0, 2);
  options.split_stay = options.split_stay.slice(0, 2);
  options.orh_alternative = options.orh_alternative.slice(0, 2);

  return options;
}

/**
 * Main Auto-Allotment Engine Execution v7.0
 */
export function runAutoAllotmentEngine({
  requests = [],
  rooms = [],
  roomConfigs = {},
  includeOrh = false,
  currentBuilding = 'OGH',
  settings = DEFAULT_SETTINGS,
  currentTime = null
}) {
  if (!requests.length) return [];

  const activeSettings = { ...DEFAULT_SETTINGS, ...settings };
  const now = currentTime ? new Date(currentTime) : new Date();

  // 1. Process & Score all incoming requests
  const processedRequests = requests.map((r, idx) => {
    const req = { ...r };
    req.id = req.id || `req_${idx + 1}`;
    const startDt = new Date(req.from);
    const endDt = new Date(req.to);
    const durationDays = Math.max(0.2, (endDt.getTime() - startDt.getTime()) / 86400000);

    req.start_dt = startDt;
    req.end_dt = endDt;
    req.duration_days = Math.round(durationDays * 100) / 100;
    req.level = parseInt(req.level, 10) || 11;
    req.beds = parseInt(req.beds, 10) || 1;
    req.directive = (req.directive || (req.must_allot ? 'MUST_ALLOT' : 'NORMAL_ALLOT')).toUpperCase().trim();

    const calendarMetrics = calculateStayCalendarMetrics(startDt, endDt, activeSettings);
    req.calendar_peak_days = calendarMetrics.peakDays;
    req.calendar_reasons = calendarMetrics.reasons;

    const { score, breakdown } = calculateImportanceScoreV7(req, activeSettings);
    req.importance_score = score;
    req.score_breakdown = breakdown;

    return req;
  });

  // 2. Sort requests by Importance Score descending
  processedRequests.sort((a, b) => b.importance_score - a.importance_score);

  // 3. Prepare simulated rooms pool
  const eligibleRooms = rooms.filter(r => {
    if (includeOrh) return r.building === 'OGH' || r.building === 'ORH';
    return r.building === currentBuilding;
  });

  const simRooms = eligibleRooms.map(r => ({
    ...r,
    bookings: [...(r.bookings || []).map(b => ({ ...b }))]
  }));

  const allotmentResults = [];

  for (const req of processedRequests) {
    const reqStart = req.start_dt.getTime();
    const reqEnd = req.end_dt.getTime();
    const level = req.level;
    const bedsNeeded = req.beds;
    const directive = req.directive;

    // Preserved Safety-Stock Quotas for peak protection
    const tierQuotas = {
      VVIP: calculatePreservedQuotaV7('VVIP', req.start_dt, now, activeSettings),
      VIP: calculatePreservedQuotaV7('VIP', req.start_dt, now, activeSettings),
      Ground_Floor: calculatePreservedQuotaV7('Ground_Floor', req.start_dt, now, activeSettings)
    };

    // Filter Candidate Rooms
    // Filter Candidate Rooms based on Room Priority Scores
    const candidateRooms = [];
    for (const r of simRooms) {
      const rTier = getRoomTier(r);
      const bufHours = (r.id === '13' || (r.type || '').includes('VIP')) 
        ? (activeSettings.buffer_vip_hours ?? 4.0) 
        : (activeSettings.buffer_standard_hours ?? 2.0);
      const bufMs = bufHours * 3600000;

      // Minimum required Priority Score threshold for this room
      const defaultThreshold = (r.building === 'OGH' && r.id === '13') 
        ? 1000 
        : ((r.building === 'OGH' && r.floor === 'Ground') ? 180 : (r.building === 'OGH' ? 140 : 100));
      const roomScoreThreshold = parseInt(roomConfigs[`${r.building}_${r.id}`] || defaultThreshold, 10);

      // RULE: Priority score 1000 is highest priority, allotted ONLY MANUALLY, NEVER on auto!
      if (roomScoreThreshold >= 1000) {
        continue;
      }

      if (directive !== 'MUST_ALLOT') {
        // Compare request importance score with room minimum priority score threshold
        if (req.importance_score < roomScoreThreshold) {
          continue;
        }

        // Count currently vacant rooms in this tier during the requested window
        const vacantInTier = simRooms.filter(tr => {
          if (getRoomTier(tr) !== rTier) return false;
          return (tr.bookings || []).every(b => {
            const bStart = new Date(b.checkIn).getTime();
            const bEnd = new Date(b.checkOut).getTime() + bufMs;
            return !(reqStart < bEnd && (reqEnd + bufMs) > bStart);
          });
        }).length;

        const preservedQuota = tierQuotas[rTier] || 0;
        const cutoff = directive === 'SHOULD_ALLOT' ? 200.0 : 250.0;

        // If vacant inventory touches preserved quota and score < cutoff, protect the room
        if (vacantInTier <= preservedQuota && req.importance_score < cutoff) {
          continue;
        }
      }

      candidateRooms.push(r);
    }

    // Room Fitness Scoring: Compare room priority score with request score & preferences
    const roomFitness = (r) => {
      const defaultThreshold = (r.building === 'OGH' && r.id === '13') ? 1000 : ((r.building === 'OGH' && r.floor === 'Ground') ? 180 : 140);
      const roomScoreThreshold = parseInt(roomConfigs[`${r.building}_${r.id}`] || defaultThreshold, 10);

      // Higher-priority rooms are assigned to higher-priority requests
      let fit = roomScoreThreshold * 1.0;

      const preferGf = (req.status === 'Retired' || level >= 15 || req.gfPref);
      const isGf = (r.floor === 'Ground');

      if (preferGf) {
        fit += isGf ? (activeSettings.fitness_gf_bonus_senior ?? 40.0) : (activeSettings.fitness_gf_penalty_senior ?? -20.0);
      } else {
        fit += !isGf ? (activeSettings.fitness_upper_bonus_junior ?? 25.0) : (activeSettings.fitness_gf_penalty_junior ?? -15.0);
      }

      const rBeds = (r.type || '').includes('4-Bedded') || r.beds === 4 ? 4 : 2;
      if (bedsNeeded > 2) {
        fit += rBeds >= 4 ? (activeSettings.fitness_group_4bed_bonus ?? 50.0) : (activeSettings.fitness_group_2bed_penalty ?? -20.0);
      } else {
        fit += rBeds === 2 ? (activeSettings.fitness_single_2bed_bonus ?? 30.0) : (activeSettings.fitness_single_4bed_penalty ?? -40.0);
      }

      return fit;
    };

    candidateRooms.sort((a, b) => roomFitness(b) - roomFitness(a));

    const allocatedRooms = [];
    let remainingBeds = bedsNeeded;
    const reasons = [];

    for (const room of candidateRooms) {
      if (remainingBeds <= 0) break;

      const bufHours = (room.id === '13' || (room.type || '').includes('VIP')) 
        ? (activeSettings.buffer_vip_hours ?? 4.0) 
        : (activeSettings.buffer_standard_hours ?? 2.0);
      const bufMs = bufHours * 3600000;

      const isVacant = (room.bookings || []).every(b => {
        const bStart = new Date(b.checkIn).getTime();
        const bEnd = new Date(b.checkOut).getTime() + bufMs;
        return !(reqStart < bEnd && (reqEnd + bufMs) > bStart);
      });

      if (isVacant) {
        const roomCap = (room.type || '').includes('4-Bedded') || room.beds === 4 ? 4 : 2;
        const bookingRecord = {
          id: `sim_auto_${Date.now()}_${room.id}_${Math.random().toString(36).substr(2, 4)}`,
          roomId: room.id,
          building: room.building,
          name: req.guestName || `Officer L${level}`,
          place: req.place || `Pay Level ${level}`,
          reference: req.reference || '',
          mobile: req.mobile || '',
          arrivalFrom: req.arrivalFrom || '',
          category: ['Duty', 'Official', 'On Duty'].includes(req.purpose) ? 'On Duty' : (['Personal', 'Private'].includes(req.purpose) ? 'Private' : 'Guest'),
          checkIn: req.start_dt.toISOString(),
          checkOut: req.end_dt.toISOString(),
          allottedBeds: Math.min(remainingBeds, roomCap),
          isAutoAllotted: true
        };

        room.bookings.push(bookingRecord);
        allocatedRooms.push({
          id: room.id,
          building: room.building,
          type: room.type,
          floor: room.floor,
          capacity: roomCap,
          allottedBeds: Math.min(remainingBeds, roomCap),
          bufferHours: bufHours,
          bookingData: bookingRecord
        });

        const defaultThreshold = (room.building === 'OGH' && room.id === '13') ? 1000 : ((room.building === 'OGH' && room.floor === 'Ground') ? 180 : 140);
        const rScore = parseInt(roomConfigs[`${room.building}_${room.id}`] || defaultThreshold, 10);
        remainingBeds -= roomCap;
        reasons.push(`Allotted ${room.building}-${room.id} (${room.type}, ${room.floor} Floor, Room Priority Score: ${rScore}) for Request Score ${req.importance_score} with ${bufHours}h buffer.`);
      }
    }

    let fallbackOptions = null;
    let status = 'Unfulfilled / Waitlisted';

    if (allocatedRooms.length > 0) {
      if (remainingBeds <= 0) {
        status = 'Fully Allotted';
      } else {
        status = `Partially Allotted (${bedsNeeded - remainingBeds}/${bedsNeeded} beds)`;
        fallbackOptions = generatePartialAllotmentOptionsV7(req, simRooms, activeSettings);
      }
    } else {
      status = 'Waitlisted / Denied';
      if (req.calendar_reasons.length > 0) {
        reasons.push(`Room held for VIP safety quota across peak period: ${req.calendar_reasons.join(', ')}.`);
      } else {
        reasons.push(`No eligible room vacant satisfying Room Priority Score threshold (Request Score: ${req.importance_score}) between ${formatDateDDMMYYYY(req.start_dt)} and ${formatDateDDMMYYYY(req.end_dt)}.`);
      }
      fallbackOptions = generatePartialAllotmentOptionsV7(req, simRooms, activeSettings);
    }

    allotmentResults.push({
      request: req,
      score: req.importance_score,
      scoreBreakdown: req.score_breakdown,
      peakDaysCrossed: req.calendar_peak_days,
      peakEvents: req.calendar_reasons,
      allottedRooms: allocatedRooms,
      status,
      reasons,
      partialAllotmentOptions: fallbackOptions
    });
  }

  return allotmentResults;
}

/**
 * Commit all batch calculated auto-allotments into live rooms state
 */
export function commitAllotmentPlan(allotmentResults, currentRooms) {
  const updatedRooms = currentRooms.map(r => ({
    ...r,
    bookings: [...(r.bookings || []).map(b => ({ ...b }))]
  }));

  let committedCount = 0;

  allotmentResults.forEach(res => {
    (res.allottedRooms || []).forEach(allotment => {
      const room = updatedRooms.find(r => r.id === allotment.id && r.building === allotment.building);
      if (room && allotment.bookingData) {
        room.bookings.push({
          ...allotment.bookingData,
          id: `book_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
        });
        committedCount++;
      }
    });
  });

  return { updatedRooms, committedCount };
}

/**
 * Commit an individual alternative option (Split Stay, Less Duration, Less Capacity, ORH Alternative)
 */
export function commitAlternativeOption(request, option, currentRooms) {
  const updatedRooms = currentRooms.map(r => ({
    ...r,
    bookings: [...(r.bookings || []).map(b => ({ ...b }))]
  }));

  let committedCount = 0;

  const baseBooking = {
    name: request.guestName || `Officer L${request.level || 13}`,
    place: request.place || `Pay Level ${request.level || 13}`,
    reference: request.reference || '',
    mobile: request.mobile || '',
    arrivalFrom: request.arrivalFrom || '',
    category: ['Duty', 'Official', 'On Duty'].includes(request.purpose) ? 'On Duty' : (['Personal', 'Private'].includes(request.purpose) ? 'Private' : 'Guest'),
    isAutoAllotted: true
  };

  if (option.type === 'SPLIT_STAY') {
    // Leg 1
    const r1 = updatedRooms.find(r => r.id === option.firstRoom.id && r.building === option.firstRoom.building);
    if (r1) {
      r1.bookings.push({
        ...baseBooking,
        id: `book_${Date.now()}_split1_${Math.random().toString(36).substr(2, 4)}`,
        roomId: r1.id,
        building: r1.building,
        checkIn: option.firstRoom.checkIn,
        checkOut: option.firstRoom.checkOut,
        note: 'Split Stay (Leg 1)'
      });
      committedCount++;
    }

    // Leg 2
    const r2 = updatedRooms.find(r => r.id === option.secondRoom.id && r.building === option.secondRoom.building);
    if (r2) {
      r2.bookings.push({
        ...baseBooking,
        id: `book_${Date.now()}_split2_${Math.random().toString(36).substr(2, 4)}`,
        roomId: r2.id,
        building: r2.building,
        checkIn: option.secondRoom.checkIn,
        checkOut: option.secondRoom.checkOut,
        note: 'Split Stay (Leg 2)'
      });
      committedCount++;
    }
  } else {
    // Single room (Less Duration, Less Capacity, or ORH Alternative)
    const targetRoom = updatedRooms.find(r => r.id === option.roomId && r.building === option.building);
    if (targetRoom) {
      targetRoom.bookings.push({
        ...baseBooking,
        id: `book_${Date.now()}_alt_${Math.random().toString(36).substr(2, 4)}`,
        roomId: targetRoom.id,
        building: targetRoom.building,
        checkIn: option.checkIn,
        checkOut: option.checkOut,
        note: option.title
      });
      committedCount++;
    }
  }

  return { updatedRooms, committedCount };
}
