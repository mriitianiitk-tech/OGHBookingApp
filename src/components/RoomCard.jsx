import React from 'react';
import { Crown, Wrench, Clock, CalendarClock, UserCheck } from 'lucide-react';

export default function RoomCard({ room, displayPreference, onClick }) {
  const now = new Date();

  // Find currently active booking
  const activeBooking = (room.bookings || []).find(b => {
    const start = new Date(b.checkIn);
    const end = new Date(b.checkOut);
    return start <= now && end >= now;
  });

  // Find bookings arriving within next 24 hours
  const upcoming24hBookings = (room.bookings || [])
    .filter(b => {
      const start = new Date(b.checkIn);
      const diffMs = start.getTime() - now.getTime();
      return diffMs > 0 && diffMs <= 24 * 60 * 60 * 1000;
    })
    .sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn));

  const nextBooking = upcoming24hBookings[0];

  // Count all future scheduled bookings
  const futureBookingsCount = (room.bookings || []).filter(b => new Date(b.checkIn) > now).length;

  // Status computation:
  // - Occupied: shade of red
  // - Vacant + arrival in 24h: shade of yellow
  // - Vacant: shade of green
  // - Maintenance / Blocked: muted neutral slate
  let status = 'vacant';
  if (activeBooking) {
    status = activeBooking.category === 'Maintenance' ? 'blocked' : 'occupied';
  } else if (nextBooking) {
    status = 'upcoming-24h';
  }

  // Format short time/date string (strictly DD/MM/YYYY or DD/MM)
  const formatShortTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const isToday = d.toDateString() === now.toDateString();
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) return `Today ${time}`;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${month} ${time}`;
  };

  // Determine text content for the clean card
  let primaryText = 'Available';
  let secondaryText = `${room.floor || 'Ground'} Floor`;

  if (status === 'occupied') {
    if (displayPreference === 'ref' && activeBooking.reference) {
      primaryText = activeBooking.reference;
      secondaryText = activeBooking.name ? `Guest: ${activeBooking.name}` : (activeBooking.place || 'Occupied');
    } else {
      primaryText = activeBooking.name || 'Occupied';
      secondaryText = activeBooking.place || (activeBooking.reference ? `Ref: ${activeBooking.reference}` : activeBooking.designation || 'On Duty');
    }
  } else if (status === 'upcoming-24h') {
    primaryText = nextBooking.name || 'Reserved';
    secondaryText = `Arr: ${formatShortTime(nextBooking.checkIn)}`;
  } else if (status === 'blocked') {
    primaryText = 'Under Maintenance';
    secondaryText = activeBooking?.name || activeBooking?.purpose || 'Out of order';
  } else {
    // Vacant
    primaryText = room.type || 'Vacant';
    secondaryText = room.note ? `${room.floor} Fl • ${room.note}` : `${room.floor || 'Ground'} Floor • ${room.beds || 2} Beds`;
  }

  const isVVIP = room.id === '13' || (room.type || '').includes('VVIP');
  const isVIP = (room.type || '').includes('VIP') && !isVVIP;

  return (
    <div 
      className={`room-card-compact ${status}`} 
      onClick={() => onClick(room.id)}
      role="button"
      tabIndex={0}
      title={`Room ${room.id} (${room.building}) - Click to manage booking`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(room.id); }}
    >
      {/* Top Header Row: Room Number & Quick Status / VIP Badges */}
      <div className="card-top-row">
        <div className="room-id-badge">
          <span className="room-num">{room.id}</span>
          {isVVIP ? (
            <span className="vip-crown-pill vvip" title="VVIP Suite">
              <Crown size={10} /> VVIP
            </span>
          ) : isVIP ? (
            <span className="vip-crown-pill vip" title="VIP Suite">
              <Crown size={10} /> VIP
            </span>
          ) : null}
        </div>

        <div className="card-status-pill">
          {status === 'occupied' && (
            <span className="status-label occupied">Occupied</span>
          )}
          {status === 'upcoming-24h' && (
            <span className="status-label upcoming" title="Check-in arriving within 24 hours">
              <Clock size={10} /> In 24h
            </span>
          )}
          {status === 'vacant' && (
            <span className="status-label vacant">Vacant</span>
          )}
          {status === 'blocked' && (
            <span className="status-label blocked">
              <Wrench size={10} /> Maint
            </span>
          )}
        </div>
      </div>

      {/* Main Content Info */}
      <div className="card-body-content">
        <div className="primary-title" title={primaryText}>
          {primaryText}
        </div>
        <div className="secondary-subtitle" title={secondaryText}>
          {secondaryText}
        </div>
      </div>

      {/* Bottom Footer Row: Schedule indicators */}
      <div className="card-bottom-row">
        {status === 'occupied' && activeBooking?.checkOut && (
          <span className="footer-checkout" title={`Checkout: ${formatShortTime(activeBooking.checkOut)}`}>
            Out: {formatShortTime(activeBooking.checkOut)}
          </span>
        )}
        {status === 'upcoming-24h' && (
          <span className="footer-upcoming-guest">
            {nextBooking.reference ? `Ref: ${nextBooking.reference}` : 'Confirmed Allotment'}
          </span>
        )}
        {status === 'vacant' && futureBookingsCount > 0 && (
          <span className="footer-future-count">
            <CalendarClock size={10} /> {futureBookingsCount} future
          </span>
        )}
        {status === 'vacant' && futureBookingsCount === 0 && (
          <span className="footer-available-hint">Ready to allot</span>
        )}
        {status === 'blocked' && (
          <span className="footer-checkout">Service hold</span>
        )}
      </div>
    </div>
  );
}
