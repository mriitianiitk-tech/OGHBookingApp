import React, { useState, useEffect, useMemo } from 'react';
import { CATEGORIES } from '../constants/initialRooms';
import { X, Calendar, User, Phone, MapPin, Briefcase, FileText, Trash2, Edit2, Printer, Zap } from 'lucide-react';
import { formatDateTimeDDMMYYYY } from '../utils/dateUtils';
import { calculateStayCalendarMetrics } from '../algorithms/autoAllotment';
import { getStoredAllotmentSettings } from '../services/storageService';

export default function BookingModal({
  isOpen,
  onClose,
  room,
  currentBuilding,
  onSaveBooking,
  onDeleteBooking,
  onPrintSlip
}) {
  const [formData, setFormData] = useState({
    id: '',
    category: 'On Duty',
    name: '',
    reference: '',
    mobile: '',
    place: '',
    arrivalFrom: '',
    checkIn: '',
    checkOut: ''
  });

  const [editingId, setEditingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [showPastBookings, setShowPastBookings] = useState(false);

  // Reset form when modal opens or room changes
  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen, room]);

  const resetForm = () => {
    const now = new Date();
    const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    const tmrw = new Date(now.getTime() + 24 * 60 * 60 * 1000 - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

    setFormData({
      id: '',
      category: 'On Duty',
      name: '',
      reference: '',
      mobile: '',
      place: '',
      arrivalFrom: '',
      checkIn: localNow,
      checkOut: tmrw
    });
    setEditingId(null);
    setErrorMessage('');
  };

  const surgeMetrics = useMemo(() => {
    if (!formData.checkIn || !formData.checkOut) return null;
    const s = new Date(formData.checkIn);
    const e = new Date(formData.checkOut);
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || s >= e) return null;
    try {
      const settings = getStoredAllotmentSettings();
      const metrics = calculateStayCalendarMetrics(s, e, settings);
      return metrics.peakDays > 0 ? metrics : null;
    } catch (err) {
      return null;
    }
  }, [formData.checkIn, formData.checkOut]);

  if (!isOpen || !room) return null;

  const isMaintenance = formData.category === 'Maintenance';

  const handleEditClick = (booking) => {
    setEditingId(booking.id);
    setFormData({
      id: booking.id,
      category: booking.category || 'On Duty',
      name: booking.name || '',
      reference: booking.reference || '',
      mobile: booking.mobile || '',
      place: booking.place || '',
      arrivalFrom: booking.arrivalFrom || '',
      checkIn: booking.checkIn ? new Date(booking.checkIn).toISOString().slice(0, 16) : '',
      checkOut: booking.checkOut ? new Date(booking.checkOut).toISOString().slice(0, 16) : ''
    });
    setErrorMessage('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMessage('');

    const start = new Date(formData.checkIn).getTime();
    const end = new Date(formData.checkOut).getTime();

    if (isNaN(start) || isNaN(end) || start >= end) {
      setErrorMessage('Check-out time must be after check-in time.');
      return;
    }

    // Check overlap with other bookings for this room
    const hasOverlap = (room.bookings || []).some(b => {
      if (editingId && b.id === editingId) return false;
      const bStart = new Date(b.checkIn).getTime();
      const bEnd = new Date(b.checkOut).getTime();
      return start < bEnd && end > bStart;
    });

    if (hasOverlap) {
      setErrorMessage('Dates conflict with an existing booking in this room.');
      return;
    }

    const bookingPayload = {
      ...formData,
      name: isMaintenance ? 'Maintenance' : formData.name,
      roomId: room.id,
      building: currentBuilding,
      checkIn: new Date(formData.checkIn).toISOString(),
      checkOut: new Date(formData.checkOut).toISOString()
    };

    onSaveBooking(bookingPayload, editingId);
    resetForm();
  };

  const now = new Date();

  // Filter strictly to only current (active now) and upcoming bookings
  const currentAndUpcomingBookings = (room.bookings || [])
    .filter(b => new Date(b.checkOut) >= now)
    .sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn));

  // Past bookings (ended before now)
  const pastBookings = (room.bookings || [])
    .filter(b => new Date(b.checkOut) < now)
    .sort((a, b) => new Date(b.checkIn) - new Date(b.checkIn));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            <span>Room {room.id} ({currentBuilding})</span>
            <span className="badge badge-type" style={{ fontSize: '0.75rem' }}>{room.type}</span>
          </h2>
          <button className="btn-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Current & Upcoming Bookings List */}
        <div style={{ marginBottom: 12 }}>
          <h4 style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Current & Upcoming Bookings ({currentAndUpcomingBookings.length})</span>
            {pastBookings.length > 0 && (
              <button
                type="button"
                onClick={() => setShowPastBookings(prev => !prev)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                {showPastBookings ? 'Hide past history' : `View ${pastBookings.length} past bookings`}
              </button>
            )}
          </h4>
          <div className="booking-history-list">
            {currentAndUpcomingBookings.length === 0 ? (
              <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
                No active or scheduled bookings for this room.
              </div>
            ) : (
              currentAndUpcomingBookings.map(b => {
                const bIn = new Date(b.checkIn);
                const bOut = new Date(b.checkOut);
                const isActive = bIn <= now && bOut >= now;

                return (
                  <div key={b.id} className="booking-item-row">
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {b.name}
                        {isActive && (
                          <span className="badge" style={{ background: 'var(--available-bg)', color: 'var(--available-text)' }}>
                            ACTIVE NOW
                          </span>
                        )}
                        <span className="badge" style={{ background: 'var(--bg-subtle)' }}>
                          {b.category}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                        {formatDateTimeDDMMYYYY(bIn)} → {formatDateTimeDDMMYYYY(bOut)}
                      </div>
                      {b.reference && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Ref: {b.reference}</div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: 6 }}>
                      {onPrintSlip && b.category !== 'Maintenance' && (
                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={() => onPrintSlip(b, room)}
                          title="Print Allotment Slip"
                        >
                          <Printer size={13} />
                        </button>
                      )}
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleEditClick(b)}
                        title="Edit Entry"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button 
                        className="btn btn-danger btn-sm"
                        onClick={() => onDeleteBooking(room.id, b.id)}
                        title="Delete Entry"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}

            {/* Optional Collapsible Past Bookings */}
            {showPastBookings && pastBookings.length > 0 && (
              <div style={{ borderTop: '2px dashed var(--card-border)', background: 'var(--bg-subtle)', padding: '8px 10px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>
                  Past Booking History:
                </div>
                {pastBookings.map(b => (
                  <div key={b.id} style={{ fontSize: '0.74rem', color: 'var(--text-muted)', padding: '4px 0', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong>{b.name}</strong> ({b.category}) • {formatDateTimeDDMMYYYY(b.checkIn)} → {formatDateTimeDDMMYYYY(b.checkOut)}
                    </div>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => onDeleteBooking(room.id, b.id)}
                      title="Delete Past Record"
                      style={{ padding: '2px 5px', fontSize: '0.7rem' }}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Booking Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ fontWeight: 700, fontSize: '0.92rem', marginBottom: 12, color: 'var(--primary)' }}>
            {editingId ? 'Edit Booking Details' : 'Add New Booking / Reservation'}
          </div>

          <div className="form-group">
            <label>Category (श्रेणी)</label>
            <select 
              className="form-select"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            >
              {CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>

          {!isMaintenance && (
            <>
              <div className="form-group">
                <label>Guest Name & Title (अतिथि का नाम)</label>
                <input 
                  type="text" 
                  className="form-input"
                  required
                  placeholder="e.g., Shri Rajesh Kumar, IRSE"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Designation (पदनाम)</label>
                  <input 
                    type="text" 
                    className="form-input"
                    placeholder="e.g., ADRM / Lucknow"
                    value={formData.place}
                    onChange={(e) => setFormData({ ...formData, place: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Arrival From (कहॉं से)</label>
                  <input 
                    type="text" 
                    className="form-input"
                    placeholder="e.g., New Delhi"
                    value={formData.arrivalFrom}
                    onChange={(e) => setFormData({ ...formData, arrivalFrom: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Guest of (Ref / संदर्भ)</label>
                  <input 
                    type="text" 
                    className="form-input"
                    placeholder="Reference Officer"
                    value={formData.reference}
                    onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Mobile Number (मोबाईल नं.)</label>
                  <input 
                    type="tel" 
                    className="form-input"
                    placeholder="10-digit number"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  />
                </div>
              </div>
            </>
          )}

          <div className="form-row">
            <div className="form-group">
              <label>Check-in Time (कब से)</label>
              <input 
                type="datetime-local" 
                className="form-input"
                required
                value={formData.checkIn}
                onChange={(e) => setFormData({ ...formData, checkIn: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Check-out Time (कब तक)</label>
              <input 
                type="datetime-local" 
                className="form-input"
                required
                value={formData.checkOut}
                onChange={(e) => setFormData({ ...formData, checkOut: e.target.value })}
              />
            </div>
          </div>

          {surgeMetrics && (
            <div style={{
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              borderRadius: 'var(--radius-sm)',
              padding: '8px 12px',
              marginBottom: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: '0.82rem'
            }}>
              <Zap size={16} color="#d97706" style={{ flexShrink: 0 }} />
              <div>
                <strong style={{ color: '#b45309' }}>Peak Calendar Surge:</strong>{' '}
                <span>
                  Stay crosses <strong>{surgeMetrics.peakDays} peak day{surgeMetrics.peakDays > 1 ? 's' : ''}</strong> ({surgeMetrics.reasons.join(', ')}). Expect high VIP arrival pressure.
                </span>
              </div>
            </div>
          )}

          {errorMessage && (
            <div style={{ color: 'var(--booked)', fontSize: '0.84rem', fontWeight: 600, marginBottom: 12 }}>
              {errorMessage}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
            {editingId && (
              <button type="button" className="btn btn-secondary" onClick={resetForm}>
                Cancel Edit
              </button>
            )}
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
            <button type="submit" className="btn btn-primary">
              {editingId ? 'Update Booking' : 'Confirm Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
