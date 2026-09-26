import React, { useState, useEffect } from 'react';
import { X, Search, CheckCircle2, ArrowRight } from 'lucide-react';

export default function SearchModal({
  isOpen,
  onClose,
  rooms = [],
  currentBuilding = 'OGH',
  onSelectRoomToBook
}) {
  const [searchIn, setSearchIn] = useState('');
  const [searchOut, setSearchOut] = useState('');
  const [results, setResults] = useState(null);

  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      const tmrw = new Date(now.getTime() + 24 * 60 * 60 * 1000 - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      setSearchIn(localNow);
      setSearchOut(tmrw);
      setResults(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSearch = (e) => {
    e.preventDefault();
    const start = new Date(searchIn).getTime();
    const end = new Date(searchOut).getTime();

    if (isNaN(start) || isNaN(end) || start >= end) {
      alert('Please enter a valid check-in and check-out interval.');
      return;
    }

    const available = rooms.filter(r => {
      if (r.building !== currentBuilding) return false;
      const hasConflict = (r.bookings || []).some(b => {
        const bStart = new Date(b.checkIn).getTime();
        const bEnd = new Date(b.checkOut).getTime();
        return start < bEnd && end > bStart;
      });
      return !hasConflict;
    });

    setResults(available);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            <Search size={20} />
            <span>Check Vacancy ({currentBuilding})</span>
          </h2>
          <button className="btn-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSearch} style={{ marginBottom: 20 }}>
          <div className="form-row">
            <div className="form-group">
              <label>Check-in Time</label>
              <input 
                type="datetime-local" 
                className="form-input" 
                required
                value={searchIn}
                onChange={(e) => setSearchIn(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Check-out Time</label>
              <input 
                type="datetime-local" 
                className="form-input" 
                required
                value={searchOut}
                onChange={(e) => setSearchOut(e.target.value)}
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            Search Available Rooms
          </button>
        </form>

        {results !== null && (
          <div>
            <h4 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: 12, color: 'var(--primary)' }}>
              Found {results.length} Available Rooms
            </h4>

            {results.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
                No rooms available for the specified time range.
              </div>
            ) : (
              <div style={{ maxHeight: 260, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {results.map(r => (
                  <div 
                    key={r.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 14px',
                      background: 'var(--bg-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--card-border)'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <CheckCircle2 size={16} color="var(--available)" />
                        Room {r.id} ({r.type})
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                        Floor: {r.floor || 'Standard'} • Capacity: {r.beds || 2} Beds
                      </div>
                    </div>
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        onClose();
                        onSelectRoomToBook(r.id, searchIn, searchOut);
                      }}
                    >
                      <span>Book</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
