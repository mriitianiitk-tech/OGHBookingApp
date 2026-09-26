/**
 * Auto-Allotment Algorithm for BLW Accommodation Management v3.0
 * 
 * Rules:
 * 1. Priority scoring: Duty (100) > Personal (50) > Guest (10) + Serving (+20) + Pay-Level.
 * 2. Entitlement verification against room minimum level configuration.
 * 3. Ground floor priority for retired officers, senior executives, and mobility needs.
 * 4. Capacity matching (preserving 4-bedded suites for larger parties).
 * 5. High-quota preservation (assigning appropriate rooms without wasting higher-tier suites).
 * 6. Contiguity & 2-hour cleaning/sanitization buffer check.
 */

import { formatDateDDMMYYYY } from '../utils/dateUtils';

export function calculatePriorityScore(request) {
  let score = 0;

  // 1. Visit Purpose
  if (request.purpose === 'Duty' || request.purpose === 'Official') {
    score += 100;
  } else if (request.purpose === 'Personal' || request.purpose === 'Private') {
    score += 50;
  } else {
    score += 10; // Guest
  }

  // 2. Employment Status
  if (request.status === 'Serving') {
    score += 20;
  } else if (request.status === 'Retired') {
    score += 10;
  }

  // 3. Pay Level Seniority (Level 8 to 17+)
  const levelNum = parseInt(request.level, 10) || 8;
  score += levelNum;

  // 4. VVIP & Apex Level Bonus
  if (levelNum >= 16) {
    score += 15;
  } else if (levelNum >= 14) {
    score += 8;
  }

  return score;
}

export function runAutoAllotmentEngine({
  requests = [],
  rooms = [],
  roomConfigs = {},
  includeOrh = false,
  currentBuilding = 'OGH',
  bufferHours = 2
}) {
  if (!requests.length) return [];

  // Deep clone requests and assign priority scores
  const scoredRequests = requests.map((req, idx) => ({
    ...req,
    id: req.id || `req_${idx + 1}`,
    score: calculatePriorityScore(req),
    level: parseInt(req.level, 10) || 11,
    beds: parseInt(req.beds, 10) || 1,
    from: new Date(req.from),
    to: new Date(req.to)
  }));

  // Sort requests by Priority Score descending (highest score gets first pick)
  scoredRequests.sort((a, b) => b.score - a.score);

  // Filter available room inventory based on building selection
  const eligibleRooms = rooms.filter(r => {
    // VVIP Room 13 in OGH is exclusively reserved for Level 17+ / GM / Railway Board / Ministers
    if (includeOrh) {
      return r.building === 'OGH' || r.building === 'ORH';
    }
    return r.building === currentBuilding;
  });

  // Create simulated room state so allotments don't overlap across requests in the same batch
  const simRooms = eligibleRooms.map(r => ({
    ...r,
    bookings: [...(r.bookings || []).map(b => ({ ...b }))]
  }));

  const results = [];
  const bufferMs = bufferHours * 60 * 60 * 1000;

  for (const req of scoredRequests) {
    const reqStart = req.from.getTime();
    const reqEnd = req.to.getTime() + bufferMs;

    // Filter suitable rooms based on minimum pay-level threshold
    let candidateRooms = simRooms.filter(r => {
      // Room 13 rule: only allow if Level >= 17
      if (r.id === '13' && r.building === 'OGH' && req.level < 17) {
        return false;
      }

      const minLevel = parseInt(roomConfigs[`${r.building}_${r.id}`] || 13, 10);
      return req.level >= minLevel;
    });

    // Floor and capacity optimization sorting
    const preferGF = req.gfPref || req.status === 'Retired' || req.purpose === 'Personal' || req.level >= 15;

    candidateRooms.sort((a, b) => {
      // 1. Ground Floor sorting
      const isAGF = a.building === 'OGH' && (parseInt(a.id, 10) <= 13 || a.floor === 'Ground');
      const isBGF = b.building === 'OGH' && (parseInt(b.id, 10) <= 13 || b.floor === 'Ground');

      if (preferGF) {
        if (isAGF && !isBGF) return -1;
        if (!isAGF && isBGF) return 1;
      } else {
        // Lower priority officers prefer upper floor to keep GF vacant for senior arrivals
        if (!isAGF && isBGF) return -1;
        if (isAGF && !isBGF) return 1;
      }

      // 2. Bed Capacity matching
      const aIs4 = (a.type || '').includes('4-Bedded') || (a.beds === 4);
      const bIs4 = (b.type || '').includes('4-Bedded') || (b.beds === 4);

      if (req.beds > 2) {
        if (aIs4 && !bIs4) return -1;
        if (!aIs4 && bIs4) return 1;
      } else {
        // Save 4-bedded rooms if only 1-2 beds needed
        if (!aIs4 && bIs4) return -1;
        if (aIs4 && !bIs4) return 1;
      }

      // 3. Exact Quota Level Match (minimize waste of overly high-tier rooms)
      const minA = parseInt(roomConfigs[`${a.building}_${a.id}`] || 13, 10);
      const minB = parseInt(roomConfigs[`${b.building}_${b.id}`] || 13, 10);
      return minB - minA;
    });

    const allocatedRooms = [];
    let remainingBedsNeeded = req.beds;
    const reasons = [];

    for (const room of candidateRooms) {
      if (remainingBedsNeeded <= 0) break;

      // Check date overlaps with existing or batch-allocated bookings (including buffer)
      let isAvailable = true;
      for (const booking of room.bookings) {
        const bStart = new Date(booking.checkIn).getTime();
        const bEnd = new Date(booking.checkOut).getTime() + bufferMs;

        if (reqStart < bEnd && reqEnd > bStart) {
          isAvailable = false;
          break;
        }
      }

      if (isAvailable) {
        const roomCapacity = (room.type || '').includes('4-Bedded') || room.beds === 4 ? 4 : 2;
        
        // Add temporary booking into simulation
        const simBooking = {
          id: `sim_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          roomId: room.id,
          building: room.building,
          name: req.guestName || `Officer L${req.level}`,
          place: req.place || `Level ${req.level}`,
          reference: req.reference || '',
          mobile: req.mobile || '',
          arrivalFrom: req.arrivalFrom || '',
          category: req.purpose === 'Duty' ? 'On Duty' : (req.purpose === 'Personal' ? 'Private' : 'Guest'),
          checkIn: req.from.toISOString(),
          checkOut: req.to.toISOString(),
          isAutoAllotted: true
        };

        room.bookings.push(simBooking);
        allocatedRooms.push({
          id: room.id,
          building: room.building,
          type: room.type,
          floor: room.floor,
          capacity: roomCapacity,
          bookingData: simBooking
        });

        remainingBedsNeeded -= roomCapacity;
      }
    }

    if (allocatedRooms.length > 0) {
      if (remainingBedsNeeded <= 0) {
        reasons.push(`Optimal room matched based on Level ${req.level} eligibility and date vacancy.`);
      } else {
        reasons.push(`Partial allotment: Allotted ${req.beds - remainingBedsNeeded} of ${req.beds} requested beds.`);
      }
    } else {
      reasons.push(`No eligible room vacant between ${formatDateDDMMYYYY(req.from)} and ${formatDateDDMMYYYY(req.to)}.`);
    }

    results.push({
      request: req,
      score: req.score,
      allottedRooms,
      status: allocatedRooms.length > 0 ? (remainingBedsNeeded <= 0 ? 'Fully Allotted' : 'Partially Allotted') : 'Unfulfilled / Waitlisted',
      reasons
    });
  }

  return results;
}

/**
 * Commit calculated auto-allotment results into live rooms state
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
