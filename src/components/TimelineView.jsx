import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Printer, 
  Calendar, 
  ZoomIn, 
  ZoomOut, 
  User, 
  Clock, 
  Phone, 
  MapPin, 
  ShieldCheck 
} from 'lucide-react';
import { formatDateDDMMYYYY, formatDateTimeDDMMYYYY } from '../utils/dateUtils';

const ZOOM_PRESETS = [3, 5, 7, 14, 21];

export default function TimelineView({
  isOpen,
  onClose,
  rooms = [],
  currentBuilding = 'OGH',
  onSelectBooking
}) {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  // Default Zoom View: 5 Days (4-5 days)
  const [daysCount, setDaysCount] = useState(5);

  // Rich Tooltip State
  const [activeTooltip, setActiveTooltip] = useState(null);

  if (!isOpen) return null;

  const buildingRooms = rooms.filter(r => r.building === currentBuilding);

  // Generate array of visible dates
  const dates = [];
  for (let i = 0; i < daysCount; i++) {
    const d = new Date(startDate.getTime() + i * 86400000);
    dates.push(d);
  }

  const timelineStartMs = startDate.getTime();
  const timelineEndMs = timelineStartMs + daysCount * 86400000;
  const totalTimelineDuration = daysCount * 86400000;

  // Navigation handlers
  const handlePrev = () => {
    const shiftDays = Math.max(1, daysCount - 1);
    setStartDate(new Date(startDate.getTime() - shiftDays * 86400000));
  };

  const handleNext = () => {
    const shiftDays = Math.max(1, daysCount - 1);
    setStartDate(new Date(startDate.getTime() + shiftDays * 86400000));
  };

  const handleToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setStartDate(d);
  };

  // Zoom handlers
  const handleZoomIn = () => {
    const currentIdx = ZOOM_PRESETS.indexOf(daysCount);
    if (currentIdx > 0) {
      setDaysCount(ZOOM_PRESETS[currentIdx - 1]);
    } else if (daysCount > 3) {
      setDaysCount(3);
    }
  };

  const handleZoomOut = () => {
    const currentIdx = ZOOM_PRESETS.indexOf(daysCount);
    if (currentIdx >= 0 && currentIdx < ZOOM_PRESETS.length - 1) {
      setDaysCount(ZOOM_PRESETS[currentIdx + 1]);
    } else if (daysCount < 21) {
      setDaysCount(14);
    }
  };

  const getCategoryColor = (cat) => {
    switch (cat) {
      case 'On Duty':
      case 'Official':
        return 'var(--cat-duty)';
      case 'Private':
        return 'var(--cat-private)';
      case 'Guest':
        return 'var(--cat-guest)';
      case 'Maintenance':
        return 'var(--cat-maint)';
      default:
        return 'var(--booked)';
    }
  };

  // Calculate day column width dynamically based on zoom
  const dayColMinWidth = daysCount <= 3 ? 240 : daysCount <= 5 ? 180 : daysCount <= 7 ? 130 : 80;
  const totalTrackMinWidth = Math.max(880, daysCount * dayColMinWidth);

  const now = new Date();

  // Tooltip mouse handlers
  const handleBarMouseEnter = (e, booking, room) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setActiveTooltip({
      booking,
      room,
      x: rect.left + rect.width / 2,
      y: rect.top - 8
    });
  };

  const handleBarMouseMove = (e) => {
    if (activeTooltip) {
      setActiveTooltip(prev => prev ? {
        ...prev,
        x: e.clientX,
        y: e.clientY - 12
      } : null);
    }
  };

  const handleBarMouseLeave = () => {
    setActiveTooltip(null);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container xlarge" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2>
            <Calendar size={20} />
            <span>{currentBuilding} Timeline Gantt View ({daysCount}-Day Horizon)</span>
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="btn-close" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Toolbar: Navigation, Zoom Controls, and Category Legend */}
        <div className="timeline-toolbar-bar">
          {/* Navigation Controls */}
          <div className="timeline-control-group">
            <button className="btn btn-secondary btn-sm" onClick={handlePrev} title="Previous Days">
              <ChevronLeft size={16} />
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleToday} title="Jump to Today">
              Today
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleNext} title="Next Days">
              <ChevronRight size={16} />
            </button>
            <span className="timeline-date-range-badge">
              {formatDateDDMMYYYY(startDate)} — {formatDateDDMMYYYY(dates[dates.length - 1])}
            </span>
          </div>

          {/* Zoom In / Zoom Out Controls */}
          <div className="timeline-zoom-group">
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>Zoom:</span>
            <button 
              className="btn btn-secondary btn-sm" 
              onClick={handleZoomIn} 
              disabled={daysCount <= 3}
              title="Zoom In (Fewer days, wider bars)"
            >
              <ZoomIn size={14} />
            </button>
            <button 
              className="btn btn-secondary btn-sm" 
              onClick={handleZoomOut} 
              disabled={daysCount >= 21}
              title="Zoom Out (More days)"
            >
              <ZoomOut size={14} />
            </button>

            {/* Quick Zoom Preset Buttons */}
            <div className="timeline-preset-pills">
              <button 
                className={`preset-pill ${daysCount === 3 ? 'active' : ''}`}
                onClick={() => setDaysCount(3)}
              >
                3D
              </button>
              <button 
                className={`preset-pill ${daysCount === 5 ? 'active' : ''}`}
                onClick={() => setDaysCount(5)}
                title="Default 5-Day View"
              >
                5D (Default)
              </button>
              <button 
                className={`preset-pill ${daysCount === 7 ? 'active' : ''}`}
                onClick={() => setDaysCount(7)}
              >
                7D
              </button>
              <button 
                className={`preset-pill ${daysCount === 14 ? 'active' : ''}`}
                onClick={() => setDaysCount(14)}
              >
                14D
              </button>
            </div>
          </div>

          {/* Category Color Legend */}
          <div className="timeline-legend-group">
            <div className="legend-item"><span style={{ background: 'var(--cat-duty)' }} /> Duty</div>
            <div className="legend-item"><span style={{ background: 'var(--cat-private)' }} /> Private</div>
            <div className="legend-item"><span style={{ background: 'var(--cat-guest)' }} /> Guest</div>
            <div className="legend-item"><span style={{ background: 'var(--cat-maint)' }} /> Maint</div>
          </div>
        </div>

        {/* Gantt Matrix Chart Container */}
        <div className="timeline-card" style={{ maxHeight: '62vh', overflowY: 'auto' }}>
          <div style={{ minWidth: totalTrackMinWidth }}>
            {/* Header Days Row */}
            <div className="timeline-header-row">
              {dates.map((d, index) => {
                const isToday = d.toDateString() === now.toDateString();
                const dayName = d.toLocaleDateString(undefined, { weekday: 'short' });
                return (
                  <div key={index} className={`timeline-day-header ${isToday ? 'today' : ''}`} style={{ minWidth: dayColMinWidth }}>
                    <div style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>{dayName}</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800 }}>
                      {d.getDate()} <span style={{ fontSize: '0.72rem', fontWeight: 500 }}>{d.toLocaleString('default', { month: 'short' })}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Room Rows */}
            {buildingRooms.map(room => (
              <div key={room.id} className="timeline-row">
                <div className="timeline-room-label">
                  <span style={{ fontWeight: 800, fontSize: '0.92rem' }}>Room {room.id}</span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{room.type}</span>
                </div>

                <div className="timeline-track" style={{ minWidth: totalTrackMinWidth - 100 }}>
                  {/* Grid Lines for Each Day */}
                  {dates.map((_, idx) => (
                    <div 
                      key={idx} 
                      className="timeline-grid-line" 
                      style={{ left: `${(idx / daysCount) * 100}%` }} 
                    />
                  ))}

                  {/* Booking Blocks */}
                  {(room.bookings || []).map(b => {
                    const bStart = new Date(b.checkIn).getTime();
                    const bEnd = new Date(b.checkOut).getTime();

                    // Check if booking overlaps current visible timeline range
                    if (bEnd > timelineStartMs && bStart < timelineEndMs) {
                      const displayStart = Math.max(bStart, timelineStartMs);
                      const displayEnd = Math.min(bEnd, timelineEndMs);

                      const offsetMs = displayStart - timelineStartMs;
                      const durationMs = displayEnd - displayStart;

                      const leftPct = (offsetMs / totalTimelineDuration) * 100;
                      const widthPct = Math.max((durationMs / totalTimelineDuration) * 100, 1.2);
                      const bg = getCategoryColor(b.category);

                      return (
                        <div 
                          key={b.id} 
                          className="timeline-bar"
                          style={{
                            left: `${leftPct}%`,
                            width: `${widthPct}%`,
                            background: bg
                          }}
                          onMouseEnter={(e) => handleBarMouseEnter(e, b, room)}
                          onMouseMove={handleBarMouseMove}
                          onMouseLeave={handleBarMouseLeave}
                          onClick={() => {
                            setActiveTooltip(null);
                            if (onSelectBooking) onSelectBooking(room.id, b);
                          }}
                        >
                          <span style={{ fontWeight: 700 }}>{b.name || 'Occupied'}</span>
                          {b.place && <span style={{ opacity: 0.85, marginLeft: 6, fontSize: '0.72rem' }}>• {b.place}</span>}
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Rich Floating Hover Tooltip */}
        {activeTooltip && (
          <div 
            className="timeline-floating-tooltip"
            style={{
              position: 'fixed',
              left: `${Math.min(window.innerWidth - 300, Math.max(16, activeTooltip.x - 140))}px`,
              top: `${Math.max(10, activeTooltip.y - 170)}px`,
              zIndex: 99999,
              pointerEvents: 'none'
            }}
          >
            <div className="tooltip-header">
              <span className="tooltip-room-title">
                Room {activeTooltip.room.id} ({activeTooltip.room.building}) • {activeTooltip.room.type}
              </span>
              <span className="tooltip-cat-badge" style={{ background: getCategoryColor(activeTooltip.booking.category) }}>
                {activeTooltip.booking.category}
              </span>
            </div>

            <div className="tooltip-guest-name">
              {activeTooltip.booking.name || 'Occupant / Guest'}
            </div>

            {activeTooltip.booking.place && (
              <div className="tooltip-row">
                <span className="tooltip-label">Designation:</span>
                <span className="tooltip-val">{activeTooltip.booking.place}</span>
              </div>
            )}

            {activeTooltip.booking.reference && (
              <div className="tooltip-row">
                <span className="tooltip-label">Guest of (Ref):</span>
                <span className="tooltip-val">{activeTooltip.booking.reference}</span>
              </div>
            )}

            {activeTooltip.booking.mobile && (
              <div className="tooltip-row">
                <span className="tooltip-label">Mobile:</span>
                <span className="tooltip-val">{activeTooltip.booking.mobile}</span>
              </div>
            )}

            <div className="tooltip-dates-block">
              <div>
                <strong>Check-In:</strong> {formatDateTimeDDMMYYYY(activeTooltip.booking.checkIn)}
              </div>
              <div>
                <strong>Check-Out:</strong> {formatDateTimeDDMMYYYY(activeTooltip.booking.checkOut)}
              </div>
            </div>

            <div className="tooltip-click-hint">
              Click bar to manage this room booking
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
