import React from 'react';
import { CheckCircle2, XCircle, Clock, Wrench } from 'lucide-react';

export default function StatsOverview({ rooms = [], currentBuilding = 'OGH' }) {
  const displayRooms = rooms.filter(r => r.building === currentBuilding);
  const now = new Date();

  let occupiedCount = 0;
  let blockedCount = 0;
  let upcoming24hCount = 0;

  displayRooms.forEach(room => {
    const activeBooking = (room.bookings || []).find(b => {
      const bIn = new Date(b.checkIn);
      const bOut = new Date(b.checkOut);
      return bIn <= now && bOut >= now;
    });

    if (activeBooking) {
      if (activeBooking.category === 'Maintenance') {
        blockedCount++;
      } else {
        occupiedCount++;
      }
    }

    // Check if any booking arrives in next 24 hours (including currently occupied rooms)
    const hasUpcoming = (room.bookings || []).some(b => {
      const bIn = new Date(b.checkIn);
      const diffMs = bIn.getTime() - now.getTime();
      return diffMs > 0 && diffMs <= 24 * 60 * 60 * 1000;
    });
    if (hasUpcoming) {
      upcoming24hCount++;
    }
  });

  const totalCount = displayRooms.length;
  // Vacant ready rooms (not currently occupied and not maintenance)
  const vacantReadyCount = Math.max(0, totalCount - occupiedCount - blockedCount);
  const totalAvailable = vacantReadyCount;
  const occupancyRate = totalCount > 0 ? Math.round((occupiedCount / totalCount) * 100) : 0;

  return (
    <div className="stats-grid">
      {/* 1. Vacant (Green) */}
      <div className="stat-card">
        <div className="stat-content">
          <h4>Vacant & Ready</h4>
          <div className="stat-number" style={{ color: 'var(--available)' }}>
            {vacantReadyCount} 
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, marginLeft: 4 }}>
              / {totalCount}
            </span>
          </div>
        </div>
        <div className="stat-icon-wrapper" style={{ background: 'var(--rc-vacant-bg)', color: 'var(--available)' }}>
          <CheckCircle2 size={20} />
        </div>
      </div>

      {/* 2. Occupied (Red) */}
      <div className="stat-card">
        <div className="stat-content">
          <h4>Occupied ({occupancyRate}%)</h4>
          <div className="stat-number" style={{ color: 'var(--booked)' }}>
            {occupiedCount}
          </div>
        </div>
        <div className="stat-icon-wrapper" style={{ background: 'var(--rc-occupied-bg)', color: 'var(--booked)' }}>
          <XCircle size={20} />
        </div>
      </div>

      {/* 3. Arriving in 24 Hours (Yellow) */}
      <div className="stat-card">
        <div className="stat-content">
          <h4>Arriving &lt; 24h</h4>
          <div className="stat-number" style={{ color: 'var(--rc-upcoming-num)' }}>
            {upcoming24hCount}
          </div>
        </div>
        <div className="stat-icon-wrapper" style={{ background: 'var(--rc-upcoming-bg)', color: 'var(--rc-upcoming-num)' }}>
          <Clock size={20} />
        </div>
      </div>

      {/* 4. Maintenance / Blocked (Slate) */}
      <div className="stat-card">
        <div className="stat-content">
          <h4>Maintenance</h4>
          <div className="stat-number" style={{ color: 'var(--blocked)' }}>
            {blockedCount}
          </div>
        </div>
        <div className="stat-icon-wrapper" style={{ background: 'var(--rc-blocked-bg)', color: 'var(--blocked)' }}>
          <Wrench size={19} />
        </div>
      </div>
    </div>
  );
}
