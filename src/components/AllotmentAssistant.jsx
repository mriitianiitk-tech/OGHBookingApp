import React, { useState } from 'react';
import { runAutoAllotmentEngine, commitAllotmentPlan } from '../algorithms/autoAllotment';
import confetti from 'canvas-confetti';
import { 
  X, 
  Sparkles, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  Sliders, 
  CheckCheck,
  Wand2,
  Calendar
} from 'lucide-react';

export default function AllotmentAssistant({
  isOpen,
  onClose,
  rooms = [],
  roomConfigs = {},
  onSaveRoomConfigs,
  onCommitPlan,
  currentBuilding = 'OGH'
}) {
  const [activeTab, setActiveTab] = useState('requests'); // 'requests' | 'config'
  const [includeOrh, setIncludeOrh] = useState(false);
  const [bufferHours, setBufferHours] = useState(2);
  const [results, setResults] = useState(null);

  // Optimization range
  const [optFrom, setOptFrom] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [optTo, setOptTo] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().slice(0, 10);
  });

  // Local state for requests table
  const [requests, setRequests] = useState([
    {
      id: 'req_1',
      guestName: 'Shri A. K. Sharma',
      level: 14,
      status: 'Serving',
      beds: 1,
      gfPref: false,
      from: new Date().toISOString().slice(0, 16),
      to: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
      purpose: 'Duty',
      place: 'SAG / Headquarters',
      reference: '',
      mobile: ''
    }
  ]);

  // Local state for room configuration editor
  const [localConfigs, setLocalConfigs] = useState(roomConfigs);

  if (!isOpen) return null;

  const handleAddRow = () => {
    const now = new Date();
    const tmrw = new Date(now.getTime() + 86400000);
    setRequests(prev => [
      ...prev,
      {
        id: `req_${Date.now()}`,
        guestName: '',
        level: 13,
        status: 'Serving',
        beds: 1,
        gfPref: false,
        from: now.toISOString().slice(0, 16),
        to: tmrw.toISOString().slice(0, 16),
        purpose: 'Duty',
        place: '',
        reference: '',
        mobile: ''
      }
    ]);
  };

  const handleRemoveRow = (id) => {
    setRequests(prev => prev.filter(r => r.id !== id));
  };

  const handleRowChange = (id, field, value) => {
    setRequests(prev =>
      prev.map(r => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const handleGenerateTestData = () => {
    const names = [
      'Shri R. K. Verma, SAG',
      'Smt. Anita Roy, ADRM',
      'Shri P. C. Gupta, Dy.CE',
      'Dr. S. K. Singh, CMS',
      'Shri Anand Mishra, Sr.DME',
      'Shri V. K. Jha, Retd. GM'
    ];

    const generated = [];
    const count = 5;

    for (let i = 0; i < count; i++) {
      const isServing = Math.random() > 0.25;
      const purpose = Math.random() > 0.4 ? 'Duty' : (Math.random() > 0.5 ? 'Personal' : 'Guest');
      const level = isServing ? (11 + Math.floor(Math.random() * 5)) : 14;
      const beds = Math.random() > 0.7 ? 4 : (Math.random() > 0.5 ? 2 : 1);

      const start = new Date();
      start.setDate(start.getDate() + Math.floor(Math.random() * 3));
      start.setHours(10 + Math.floor(Math.random() * 8), 0, 0, 0);

      const end = new Date(start);
      end.setDate(end.getDate() + 1 + Math.floor(Math.random() * 2));
      end.setHours(12, 0, 0, 0);

      generated.push({
        id: `req_test_${Date.now()}_${i}`,
        guestName: names[i % names.length],
        level,
        status: isServing ? 'Serving' : 'Retired',
        beds,
        gfPref: !isServing || level >= 15,
        from: start.toISOString().slice(0, 16),
        to: end.toISOString().slice(0, 16),
        purpose,
        place: `Pay Level ${level}`,
        reference: '',
        mobile: '9876543210'
      });
    }

    setRequests(generated);
    setResults(null);
  };

  const handleLoadExistingBookings = () => {
    const fDate = new Date(optFrom);
    const tDate = new Date(optTo);
    tDate.setHours(23, 59, 59);

    const loadedRequests = [];
    rooms.forEach(r => {
      if (!includeOrh && r.building !== currentBuilding) return;

      (r.bookings || []).forEach(b => {
        const bIn = new Date(b.checkIn);
        const bOut = new Date(b.checkOut);

        if (bIn < tDate && bOut > fDate && b.category !== 'Maintenance') {
          loadedRequests.push({
            id: `req_imp_${b.id}`,
            guestName: b.name,
            level: 13, // Default Level 13 for import
            status: 'Serving',
            beds: (r.type || '').includes('4-Bedded') ? 4 : 2,
            gfPref: r.floor === 'Ground',
            from: bIn.toISOString().slice(0, 16),
            to: bOut.toISOString().slice(0, 16),
            purpose: b.category === 'On Duty' ? 'Duty' : (b.category === 'Private' ? 'Personal' : 'Guest'),
            place: b.place || '',
            reference: b.reference || '',
            mobile: b.mobile || ''
          });
        }
      });
    });

    if (loadedRequests.length === 0) {
      alert('No active bookings found in this date range.');
      return;
    }

    setRequests(loadedRequests);
    setResults(null);
    alert(`Loaded ${loadedRequests.length} bookings for optimization.`);
  };

  const handleCalculateAllotment = () => {
    if (requests.length === 0) {
      alert('Please add at least one request row.');
      return;
    }

    const calculated = runAutoAllotmentEngine({
      requests,
      rooms,
      roomConfigs: localConfigs,
      includeOrh,
      currentBuilding,
      bufferHours
    });

    setResults(calculated);
  };

  const handleCommitPlanToSchedule = () => {
    if (!results || results.length === 0) return;

    const { updatedRooms, committedCount } = commitAllotmentPlan(results, rooms);
    onCommitPlan(updatedRooms);

    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (e) {}

    alert(`Successfully committed ${committedCount} room allotments directly to the live schedule!`);
    onClose();
  };

  const handleConfigChange = (key, level) => {
    const updated = { ...localConfigs, [key]: level };
    setLocalConfigs(updated);
    onSaveRoomConfigs(updated);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container xlarge" onClick={(e) => e.stopPropagation()} style={{ height: '90vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div className="modal-header" style={{ marginBottom: 12 }}>
          <h2>
            <Sparkles size={22} color="var(--primary)" />
            <span>Room Auto-Allotment Engine</span>
          </h2>
          <button className="btn-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Tab Selection */}
        <div style={{ display: 'flex', gap: 10, borderBottom: '1px solid var(--card-border)', paddingBottom: 10, marginBottom: 16 }}>
          <button 
            className={`btn ${activeTab === 'requests' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => setActiveTab('requests')}
          >
            <Wand2 size={15} />
            <span>Allotment Requests & Optimizer</span>
          </button>
          <button 
            className={`btn ${activeTab === 'config' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => setActiveTab('config')}
          >
            <Sliders size={15} />
            <span>Room Entitlement Level Configuration</span>
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }}>
          {activeTab === 'requests' ? (
            <div>
              {/* Load Existing Bookings Box */}
              <div style={{ 
                background: 'var(--badge-type-bg)', 
                border: '1px solid rgba(2, 132, 199, 0.25)', 
                padding: '14px 18px', 
                borderRadius: 'var(--radius-sm)', 
                marginBottom: 16,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12
              }}>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--badge-type-text)', fontSize: '0.92rem' }}>
                    Re-Optimize Existing Schedule
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Pull active bookings in a date interval to automatically reorganize optimal room placement.
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input 
                    type="date" 
                    className="custom-input" 
                    value={optFrom} 
                    onChange={(e) => setOptFrom(e.target.value)} 
                  />
                  <span style={{ fontSize: '0.8rem' }}>to</span>
                  <input 
                    type="date" 
                    className="custom-input" 
                    value={optTo} 
                    onChange={(e) => setOptTo(e.target.value)} 
                  />
                  <button className="btn btn-secondary btn-sm" onClick={handleLoadExistingBookings}>
                    Load Interval
                  </button>
                </div>
              </div>

              {/* Request Table / Builder */}
              <div style={{ background: 'var(--bg-subtle)', padding: 14, borderRadius: 'var(--radius-sm)', marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 700 }}>
                    Incoming Allotment Requests ({requests.length})
                  </h4>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-secondary btn-sm" onClick={handleGenerateTestData}>
                      <Sparkles size={13} />
                      <span>Generate Test Requests</span>
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={handleAddRow}>
                      <Plus size={13} />
                      <span>Add Request</span>
                    </button>
                  </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table className="allotment-table">
                    <thead>
                      <tr>
                        <th>Officer / Guest Name</th>
                        <th>Pay Level</th>
                        <th>Status</th>
                        <th>Beds</th>
                        <th>GF Req.</th>
                        <th>Check-in Time</th>
                        <th>Check-out Time</th>
                        <th>Purpose</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requests.map((req) => (
                        <tr key={req.id}>
                          <td>
                            <input 
                              type="text" 
                              className="form-input" 
                              placeholder="Guest Name"
                              value={req.guestName}
                              onChange={(e) => handleRowChange(req.id, 'guestName', e.target.value)}
                              style={{ padding: '6px 8px', fontSize: '0.82rem' }}
                            />
                          </td>
                          <td>
                            <select 
                              className="form-select"
                              value={req.level}
                              onChange={(e) => handleRowChange(req.id, 'level', parseInt(e.target.value, 10))}
                              style={{ padding: '6px', fontSize: '0.82rem', width: 90 }}
                            >
                              {[8, 9, 10, 11, 12, 13, 14, 15, 16, 17].map(lvl => (
                                <option key={lvl} value={lvl}>Level {lvl}</option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <select 
                              className="form-select"
                              value={req.status}
                              onChange={(e) => handleRowChange(req.id, 'status', e.target.value)}
                              style={{ padding: '6px', fontSize: '0.82rem', width: 90 }}
                            >
                              <option value="Serving">Serving</option>
                              <option value="Retired">Retired</option>
                            </select>
                          </td>
                          <td>
                            <input 
                              type="number" 
                              className="form-input"
                              min="1"
                              max="4"
                              value={req.beds}
                              onChange={(e) => handleRowChange(req.id, 'beds', parseInt(e.target.value, 10) || 1)}
                              style={{ padding: '6px', fontSize: '0.82rem', width: 60 }}
                            />
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <input 
                              type="checkbox"
                              checked={req.gfPref}
                              onChange={(e) => handleRowChange(req.id, 'gfPref', e.target.checked)}
                            />
                          </td>
                          <td>
                            <input 
                              type="datetime-local" 
                              className="form-input"
                              value={req.from}
                              onChange={(e) => handleRowChange(req.id, 'from', e.target.value)}
                              style={{ padding: '6px', fontSize: '0.8rem' }}
                            />
                          </td>
                          <td>
                            <input 
                              type="datetime-local" 
                              className="form-input"
                              value={req.to}
                              onChange={(e) => handleRowChange(req.id, 'to', e.target.value)}
                              style={{ padding: '6px', fontSize: '0.8rem' }}
                            />
                          </td>
                          <td>
                            <select 
                              className="form-select"
                              value={req.purpose}
                              onChange={(e) => handleRowChange(req.id, 'purpose', e.target.value)}
                              style={{ padding: '6px', fontSize: '0.82rem', width: 95 }}
                            >
                              <option value="Duty">Duty (100pt)</option>
                              <option value="Personal">Personal (50pt)</option>
                              <option value="Guest">Guest (10pt)</option>
                            </select>
                          </td>
                          <td>
                            <button 
                              className="btn btn-danger btn-sm"
                              onClick={() => handleRemoveRow(req.id)}
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action Bar for Calculation */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.86rem', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={includeOrh} 
                      onChange={(e) => setIncludeOrh(e.target.checked)} 
                    />
                    <span>Include ORH Rooms in Allotment Pool</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.86rem' }}>
                    <span>Sanitization Buffer:</span>
                    <select 
                      className="custom-select" 
                      value={bufferHours} 
                      onChange={(e) => setBufferHours(parseInt(e.target.value, 10))}
                      style={{ padding: '4px 8px' }}
                    >
                      <option value="1">1 Hour</option>
                      <option value="2">2 Hours</option>
                      <option value="3">3 Hours</option>
                    </select>
                  </label>
                </div>

                <button className="btn btn-accent" onClick={handleCalculateAllotment}>
                  <Sparkles size={16} />
                  <span>Run Auto-Allotment Algorithm</span>
                </button>
              </div>

              {/* Results View */}
              {results && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>
                      Allotment Plan Preview ({results.filter(r => (r.allottedRooms || []).length > 0).length} of {results.length} Allotted)
                    </h3>
                    <button className="btn btn-primary" onClick={handleCommitPlanToSchedule}>
                      <CheckCheck size={16} />
                      <span>Commit Plan to Live Schedule</span>
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {results.map((res, idx) => {
                      const allotted = res.allottedRooms || [];
                      const isSuccess = allotted.length > 0;
                      return (
                        <div key={idx} className="allotment-result-card" style={{ borderLeft: `4px solid ${isSuccess ? 'var(--available)' : 'var(--booked)'}` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span className="allotment-score-pill">
                                Priority Score: {res.score}
                              </span>
                              <strong style={{ fontSize: '0.95rem' }}>
                                {res.request.guestName || `Request #${idx + 1}`}
                              </strong>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                (Level {res.request.level} • {res.request.status} • {res.request.purpose})
                              </span>
                            </div>
                            <span className="badge" style={{ 
                              background: isSuccess ? 'var(--available-bg)' : 'var(--booked-bg)',
                              color: isSuccess ? 'var(--available-text)' : 'var(--booked-text)'
                            }}>
                              {res.status}
                            </span>
                          </div>

                          <div style={{ fontSize: '0.84rem', marginTop: 4 }}>
                            {isSuccess ? (
                              <div style={{ color: 'var(--available)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <CheckCircle2 size={16} />
                                <span>Allotted Rooms: {allotted.map(r => `${r.building}-${r.id} (${r.type})`).join(', ')}</span>
                              </div>
                            ) : (
                              <div style={{ color: 'var(--booked)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <AlertTriangle size={16} />
                                <span>No eligible room vacant for these dates.</span>
                              </div>
                            )}
                          </div>

                          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                            {res.reasons.join(' ')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Tab 2: Entitlement Level Configuration */
            <div>
              <div style={{ marginBottom: 16 }}>
                <h4 style={{ fontSize: '0.92rem', fontWeight: 700 }}>
                  Room Minimum Pay Level Thresholds
                </h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Set the minimum officer pay level required for the auto-allotment engine to assign each room.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12 }}>
                {rooms.map(r => {
                  const key = `${r.building}_${r.id}`;
                  const currentLvl = localConfigs[key] || (r.building === 'OGH' ? (r.id === '13' ? '17' : '13') : '11');

                  return (
                    <div 
                      key={key} 
                      style={{ 
                        background: 'var(--bg-surface)', 
                        border: '1px solid var(--card-border)', 
                        padding: 12, 
                        borderRadius: 'var(--radius-sm)' 
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <strong>{r.building}-{r.id}</strong>
                        <span className="badge badge-type">{r.type}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Min Level:</span>
                        <select 
                          className="form-select"
                          value={currentLvl}
                          onChange={(e) => handleConfigChange(key, e.target.value)}
                          style={{ padding: '4px 8px', fontSize: '0.84rem' }}
                        >
                          {[8, 9, 10, 11, 12, 13, 14, 15, 16, 17].map(l => (
                            <option key={l} value={l.toString()}>Level {l}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
