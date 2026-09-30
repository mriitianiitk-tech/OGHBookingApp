import React, { useState } from 'react';
import RoomCard from './RoomCard';
import { 
  Building, 
  Sparkles, 
  CalendarRange, 
  Search, 
  Users, 
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Clock,
  Wrench,
  X
} from 'lucide-react';

export default function RoomGrid({
  rooms = [],
  currentBuilding = 'OGH',
  onSwitchBuilding,
  onOpenBookingModal,
  onOpenAllotmentModal,
  onOpenMultiBookModal,
  onOpenSearchModal,
  onOpenTimelineModal,
  onOpenReportsModal
}) {
  const [displayPreference, setDisplayPreference] = useState('name');
  const [filterType, setFilterType] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const now = new Date();
  const buildingRooms = rooms.filter(r => r.building === currentBuilding);

  // Compute live room status counts for current building
  let vacantCount = 0;
  let occupiedCount = 0;
  let upcoming24hCount = 0;
  let blockedCount = 0;

  buildingRooms.forEach(room => {
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
    } else {
      vacantCount++;
    }

    // Upcoming in next 24 hours (including currently occupied rooms)
    const hasUpcoming = (room.bookings || []).some(b => {
      const bIn = new Date(b.checkIn);
      const diffMs = bIn.getTime() - now.getTime();
      return diffMs > 0 && diffMs <= 24 * 60 * 60 * 1000;
    });
    if (hasUpcoming) {
      upcoming24hCount++;
    }
  });

  // Filter rooms based on type, status pill, and search query
  const filteredRooms = buildingRooms.filter(room => {
    // 1. Room Type Filter
    if (filterType === 'vip' && !room.type.includes('VIP')) return false;
    if (filterType === '4bedded' && !room.type.includes('4-Bedded')) return false;
    if (filterType === 'ground' && room.floor !== 'Ground') return false;

    // 2. Status Pill Filter (vacant / occupied / upcoming / blocked)
    if (statusFilter !== 'all') {
      const activeBooking = (room.bookings || []).find(b => {
        const bIn = new Date(b.checkIn);
        const bOut = new Date(b.checkOut);
        return bIn <= now && bOut >= now;
      });

      if (statusFilter === 'occupied') {
        if (!activeBooking || activeBooking.category === 'Maintenance') return false;
      } else if (statusFilter === 'blocked') {
        if (!activeBooking || activeBooking.category !== 'Maintenance') return false;
      } else if (statusFilter === 'upcoming') {
        // Show any room that has an upcoming booking arriving in next 24h (including occupied)
        const hasUpcoming = (room.bookings || []).some(b => {
          const bIn = new Date(b.checkIn);
          const diffMs = bIn.getTime() - now.getTime();
          return diffMs > 0 && diffMs <= 24 * 60 * 60 * 1000;
        });
        if (!hasUpcoming) return false;
      } else if (statusFilter === 'vacant') {
        if (activeBooking) return false;
        const hasUpcoming = (room.bookings || []).some(b => {
          const bIn = new Date(b.checkIn);
          const diffMs = bIn.getTime() - now.getTime();
          return diffMs > 0 && diffMs <= 24 * 60 * 60 * 1000;
        });
        if (hasUpcoming) return false;
      }
    }

    // 3. Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = room.id.toLowerCase().includes(q);
      const matchType = room.type.toLowerCase().includes(q);
      const matchOccupant = (room.bookings || []).some(b => 
        (b.name && b.name.toLowerCase().includes(q)) ||
        (b.reference && b.reference.toLowerCase().includes(q)) ||
        (b.place && b.place.toLowerCase().includes(q))
      );
      if (!matchId && !matchType && !matchOccupant) return false;
    }

    return true;
  });

  return (
    <div className="room-grid-wrapper">
      {/* Row 1: Building Selector & Action Buttons */}
      <div className="clean-top-bar">
        {/* Segmented Building Switcher */}
        <div className="segmented-tabs">
          <button 
            className={`segmented-tab ${currentBuilding === 'OGH' ? 'active' : ''}`}
            onClick={() => onSwitchBuilding('OGH')}
          >
            <Building size={15} />
            <span>OGH <span className="tab-count">({rooms.filter(r => r.building === 'OGH').length})</span></span>
          </button>
          <button 
            className={`segmented-tab ${currentBuilding === 'ORH' ? 'active' : ''}`}
            onClick={() => onSwitchBuilding('ORH')}
          >
            <Building size={15} />
            <span>ORH <span className="tab-count">({rooms.filter(r => r.building === 'ORH').length})</span></span>
          </button>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="clean-action-toolbar">
          <button 
            className="btn btn-accent btn-sm" 
            onClick={onOpenAllotmentModal}
            title="Launch Smart Auto Allotment Engine"
          >
            <Sparkles size={14} />
            <span>Auto-Allot</span>
          </button>

          <button 
            className="btn btn-primary btn-sm" 
            onClick={onOpenMultiBookModal}
            title="Book multiple rooms for delegation or group"
          >
            <Users size={14} />
            <span>Multi-Room</span>
          </button>

          <button 
            className="btn btn-secondary btn-sm" 
            onClick={onOpenSearchModal}
            title="Find vacant rooms by date interval"
          >
            <Search size={14} />
            <span>Vacancy</span>
          </button>

          <button 
            className="btn btn-secondary btn-sm" 
            onClick={onOpenTimelineModal}
            title="View 14-day interactive Gantt timeline"
          >
            <CalendarRange size={14} />
            <span>Timeline</span>
          </button>

          <button 
            className="btn btn-secondary btn-sm" 
            onClick={onOpenReportsModal}
            title="Generate official occupancy register and allotment slips"
          >
            <FileSpreadsheet size={14} />
            <span>Reports</span>
          </button>
        </div>
      </div>

      {/* Row 2: Unified Interactive Status KPI Strip & Sleek Search Bar */}
      <div className="clean-controls-bar">
        {/* Interactive Status KPI Filter Chips */}
        <div className="status-chips-strip">
          <button 
            className={`status-chip all ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
            title="Show all rooms"
          >
            <span>All</span>
            <span className="chip-badge">{buildingRooms.length}</span>
          </button>

          <button 
            className={`status-chip vacant ${statusFilter === 'vacant' ? 'active' : ''}`}
            onClick={() => setStatusFilter(statusFilter === 'vacant' ? 'all' : 'vacant')}
            title="Click to filter Vacant rooms"
          >
            <CheckCircle2 size={13} />
            <span>Vacant</span>
            <span className="chip-badge">{vacantCount}</span>
          </button>

          <button 
            className={`status-chip occupied ${statusFilter === 'occupied' ? 'active' : ''}`}
            onClick={() => setStatusFilter(statusFilter === 'occupied' ? 'all' : 'occupied')}
            title="Click to filter Occupied rooms"
          >
            <XCircle size={13} />
            <span>Occupied</span>
            <span className="chip-badge">{occupiedCount}</span>
          </button>

          <button 
            className={`status-chip upcoming ${statusFilter === 'upcoming' ? 'active' : ''}`}
            onClick={() => setStatusFilter(statusFilter === 'upcoming' ? 'all' : 'upcoming')}
            title="Click to filter rooms arriving within 24h"
          >
            <Clock size={13} />
            <span>In 24h</span>
            <span className="chip-badge">{upcoming24hCount}</span>
          </button>

          {blockedCount > 0 && (
            <button 
              className={`status-chip blocked ${statusFilter === 'blocked' ? 'active' : ''}`}
              onClick={() => setStatusFilter(statusFilter === 'blocked' ? 'all' : 'blocked')}
              title="Click to filter Maintenance rooms"
            >
              <Wrench size={13} />
              <span>Maint</span>
              <span className="chip-badge">{blockedCount}</span>
            </button>
          )}
        </div>

        {/* Sleek Search & Filters */}
        <div className="clean-search-filters">
          {/* Sleek Pill Search Box */}
          <div className="search-pill-box">
            <Search size={14} className="search-pill-icon" />
            <input 
              type="text" 
              className="search-pill-input" 
              placeholder="Search room, guest..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button 
                type="button" 
                className="search-pill-clear" 
                onClick={() => setSearchQuery('')}
                title="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Room Type Selector */}
          <select 
            className="custom-select-compact" 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
            title="Filter by Room Type"
          >
            <option value="all">All Types</option>
            <option value="vip">VIP / VVIP</option>
            <option value="4bedded">4-Bedded</option>
            <option value="ground">Ground Floor</option>
          </select>

          {/* Display Preference Selector */}
          <select 
            className="custom-select-compact display-select" 
            value={displayPreference} 
            onChange={(e) => setDisplayPreference(e.target.value)}
            title="Display Preference"
          >
            <option value="name">Guest Name</option>
            <option value="ref">Reference</option>
          </select>
        </div>
      </div>

      {/* Compact Room Grid */}
      <div className="room-grid-compact">
        {filteredRooms.map(room => (
          <RoomCard 
            key={`${room.building}_${room.id}`}
            room={room}
            displayPreference={displayPreference}
            onClick={onOpenBookingModal}
          />
        ))}
      </div>

      {filteredRooms.length === 0 && (
        <div className="empty-rooms-state">
          No rooms match the selected criteria.
          {statusFilter !== 'all' && (
            <button 
              className="btn btn-secondary btn-sm" 
              style={{ display: 'inline-block', marginLeft: 10 }}
              onClick={() => { setStatusFilter('all'); setFilterType('all'); setSearchQuery(''); }}
            >
              Reset Filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
