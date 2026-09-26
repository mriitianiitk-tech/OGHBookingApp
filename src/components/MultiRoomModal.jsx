import React, { useState, useEffect } from 'react';
import { CATEGORIES } from '../constants/initialRooms';
import { X, CheckSquare, Square, Users } from 'lucide-react';

export default function MultiRoomModal({
  isOpen,
  onClose,
  rooms = [],
  currentBuilding = 'OGH',
  onSaveMultiBookings
}) {
  const [formData, setFormData] = useState({
    category: 'On Duty',
    name: '',
    reference: '',
    mobile: '',
    place: '',
    arrivalFrom: '',
    checkIn: '',
    checkOut: ''
  });

  const [selectedRoomIds, setSelectedRoomIds] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      const tmrw = new Date(now.getTime() + 24 * 60 * 60 * 1000 - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

      setFormData({
        category: 'On Duty',
        name: '',
        reference: '',
        mobile: '',
        place: '',
        arrivalFrom: '',
        checkIn: localNow,
        checkOut: tmrw
      });
      setSelectedRoomIds([]);
      setErrorMessage('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isMaintenance = formData.category === 'Maintenance';

  // Compute available rooms for given checkIn and checkOut
  const getAvailableRooms = () => {
    if (!formData.checkIn || !formData.checkOut) return [];
    const start = new Date(formData.checkIn).getTime();
    const end = new Date(formData.checkOut).getTime();

    if (isNaN(start) || isNaN(end) || start >= end) return [];

    return rooms.filter(r => {
      if (r.building !== currentBuilding) return false;
      // Check if room has any overlap
      const hasConflict = (r.bookings || []).some(b => {
        const bStart = new Date(b.checkIn).getTime();
        const bEnd = new Date(b.checkOut).getTime();
        return start < bEnd && end > bStart;
      });
      return !hasConflict;
    });
  };

  const availableRooms = getAvailableRooms();

  const toggleRoomSelection = (roomId) => {
    setSelectedRoomIds(prev => 
      prev.includes(roomId) ? prev.filter(id => id !== roomId) : [...prev, roomId]
    );
  };

  const handleSelectAll = () => {
    if (selectedRoomIds.length === availableRooms.length) {
      setSelectedRoomIds([]);
    } else {
      setSelectedRoomIds(availableRooms.map(r => r.id));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedRoomIds.length === 0) {
      setErrorMessage('Please select at least one available room.');
      return;
    }

    const bookingsToCreate = selectedRoomIds.map(roomId => ({
      ...formData,
      name: isMaintenance ? 'Maintenance' : formData.name,
      roomId,
      building: currentBuilding,
      checkIn: new Date(formData.checkIn).toISOString(),
      checkOut: new Date(formData.checkOut).toISOString()
    }));

    onSaveMultiBookings(bookingsToCreate);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            <Users size={20} />
            <span>Multi-Room Delegation Booking ({currentBuilding})</span>
          </h2>
          <button className="btn-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Guest Details */}
          <div style={{ background: 'var(--bg-subtle)', padding: 16, borderRadius: 'var(--radius-sm)', marginBottom: 16 }}>
            <h4 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: 12, color: 'var(--primary)' }}>
              1. Guest / Delegation Information
            </h4>

            <div className="form-row">
              <div className="form-group">
                <label>Category</label>
                <select 
                  className="form-select"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  {CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              {!isMaintenance && (
                <div className="form-group" style={{ flex: 2 }}>
                  <label>Group / Leader Name</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    required 
                    placeholder="e.g., Railway Inspection Delegation"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              )}
            </div>

            {!isMaintenance && (
              <div className="form-row">
                <div className="form-group">
                  <label>Designation</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Designation"
                    value={formData.place}
                    onChange={(e) => setFormData({ ...formData, place: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>From Where</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Origin Station/City"
                    value={formData.arrivalFrom}
                    onChange={(e) => setFormData({ ...formData, arrivalFrom: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Reference</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Ref Officer"
                    value={formData.reference}
                    onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Mobile</label>
                  <input 
                    type="tel" 
                    className="form-input" 
                    placeholder="Mobile number"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Schedule */}
          <div style={{ background: 'var(--bg-subtle)', padding: 16, borderRadius: 'var(--radius-sm)', marginBottom: 16 }}>
            <h4 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: 12, color: 'var(--primary)' }}>
              2. Schedule Interval
            </h4>
            <div className="form-row">
              <div className="form-group">
                <label>Check-in Time</label>
                <input 
                  type="datetime-local" 
                  className="form-input" 
                  required
                  value={formData.checkIn}
                  onChange={(e) => setFormData({ ...formData, checkIn: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Check-out Time</label>
                <input 
                  type="datetime-local" 
                  className="form-input" 
                  required
                  value={formData.checkOut}
                  onChange={(e) => setFormData({ ...formData, checkOut: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Room Selection */}
          <div style={{ background: 'var(--bg-subtle)', padding: 16, borderRadius: 'var(--radius-sm)', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--primary)' }}>
                3. Select Available Rooms ({selectedRoomIds.length} of {availableRooms.length} Selected)
              </h4>
              {availableRooms.length > 0 && (
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm"
                  onClick={handleSelectAll}
                >
                  {selectedRoomIds.length === availableRooms.length ? 'Deselect All' : 'Select All Available'}
                </button>
              )}
            </div>

            {availableRooms.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>
                No rooms are fully vacant for the selected date interval.
              </div>
            ) : (
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', 
                gap: 10,
                maxHeight: 220,
                overflowY: 'auto',
                padding: 4
              }}>
                {availableRooms.map(r => {
                  const isChecked = selectedRoomIds.includes(r.id);
                  return (
                    <div 
                      key={r.id} 
                      onClick={() => toggleRoomSelection(r.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 12px',
                        background: isChecked ? 'var(--primary-glow)' : 'var(--bg-surface)',
                        border: `1px solid ${isChecked ? 'var(--primary)' : 'var(--card-border)'}`,
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                    >
                      {isChecked ? <CheckSquare size={16} color="var(--primary)" /> : <Square size={16} color="var(--text-muted)" />}
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Room {r.id}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{r.type}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {errorMessage && (
            <div style={{ color: 'var(--booked)', fontSize: '0.84rem', fontWeight: 600, marginBottom: 12 }}>
              {errorMessage}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={selectedRoomIds.length === 0}>
              Confirm All {selectedRoomIds.length} Bookings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
