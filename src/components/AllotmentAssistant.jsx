import React, { useState, useEffect } from 'react';
import { 
  runAutoAllotmentEngine, 
  commitAllotmentPlan, 
  commitAlternativeOption,
  DEFAULT_SETTINGS 
} from '../algorithms/autoAllotment';
import { getStoredAllotmentSettings, saveAllotmentSettings } from '../services/storageService';
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
  Calendar,
  Zap,
  RotateCcw,
  Check,
  ChevronDown,
  ChevronUp,
  Layers,
  ArrowRight,
  ShieldAlert,
  Info
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
  const [activeTab, setActiveTab] = useState('requests'); // 'requests' | 'config' | 'settings'
  const [includeOrh, setIncludeOrh] = useState(true);
  const [bufferHours, setBufferHours] = useState(2);
  const [results, setResults] = useState(null);
  const [expandedScores, setExpandedScores] = useState({});

  // Engine v7 Settings State
  const [engineSettings, setEngineSettings] = useState(() => getStoredAllotmentSettings());
  const [settingsSavedToast, setSettingsSavedToast] = useState(false);

  // New Event Form State
  const [newEvent, setNewEvent] = useState({
    name: '',
    start: '2026-10-01',
    end: '2026-10-05',
    surge_factor: 1.5
  });

  // Optimization range
  const [optFrom, setOptFrom] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [optTo, setOptTo] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    return d.toISOString().slice(0, 10);
  });

  // Local state for requests table
  const [requests, setRequests] = useState([
    {
      id: 'req_1',
      guestName: 'Shri A. K. Sharma',
      directive: 'NORMAL_ALLOT',
      level: 14,
      status: 'Serving',
      beds: 2,
      gfPref: false,
      from: '2026-10-01T10:00',
      to: '2026-10-06T12:00',
      purpose: 'Personal',
      place: 'SAG / Headquarters',
      reference: 'Self',
      mobile: '9876543210'
    }
  ]);

  // Local state for room configuration editor
  const [localConfigs, setLocalConfigs] = useState(roomConfigs);

  useEffect(() => {
    setLocalConfigs(roomConfigs);
  }, [roomConfigs]);

  if (!isOpen) return null;

  const handleAddRow = () => {
    const now = new Date();
    const tmrw = new Date(now.getTime() + 86400000);
    setRequests(prev => [
      ...prev,
      {
        id: `req_${Date.now()}`,
        guestName: '',
        directive: 'NORMAL_ALLOT',
        level: 13,
        status: 'Serving',
        beds: 2,
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

  const toggleScoreBreakdown = (id) => {
    setExpandedScores(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleGenerateTestData = () => {
    // Test dataset aligned with Gandhi Jayanti long weekend scenario from v7.0 design bench
    const generated = [
      {
        id: 'req_test_01',
        guestName: 'Shri R. K. Verma (Sr. Sec. Engineer)',
        directive: 'NORMAL_ALLOT',
        level: 11,
        status: 'Serving',
        beds: 2,
        gfPref: false,
        from: '2026-10-01T10:00',
        to: '2026-10-06T12:00',
        purpose: 'Personal',
        place: 'SSE / Bridges / BLW',
        reference: 'Personal Stay',
        mobile: '9876500001'
      },
      {
        id: 'req_test_02',
        guestName: 'Member Infrastructure, Railway Board',
        directive: 'MUST_ALLOT',
        level: 17,
        status: 'Serving',
        beds: 2,
        gfPref: true,
        from: '2026-10-02T08:00',
        to: '2026-10-04T18:00',
        purpose: 'Duty',
        place: 'Railway Board / New Delhi',
        reference: 'CRB / Apex Inspection Tour',
        mobile: '9876500002'
      },
      {
        id: 'req_test_03',
        guestName: 'Smt. Anita Roy, ADRM',
        directive: 'SHOULD_ALLOT',
        level: 15,
        status: 'Serving',
        beds: 2,
        gfPref: true,
        from: '2026-10-02T12:00',
        to: '2026-10-04T14:00',
        purpose: 'Duty',
        place: 'ADRM / Lucknow Div.',
        reference: 'GM BLW Review Meeting',
        mobile: '9876500003'
      },
      {
        id: 'req_test_04',
        guestName: 'Shri V. K. Jha, Retd. PCE',
        directive: 'NORMAL_ALLOT',
        level: 15,
        status: 'Retired',
        beds: 2,
        gfPref: true,
        from: '2026-10-03T11:00',
        to: '2026-10-05T10:00',
        purpose: 'Personal',
        place: 'Ex-PCE / NER',
        reference: 'Senior Officer',
        mobile: '9876500004'
      },
      {
        id: 'req_test_05',
        guestName: 'Dr. P. C. Gupta & Family (Delegation)',
        directive: 'NORMAL_ALLOT',
        level: 14,
        status: 'Serving',
        beds: 4,
        gfPref: false,
        from: '2026-10-02T14:00',
        to: '2026-10-04T12:00',
        purpose: 'Duty',
        place: 'CMS / Central Hospital',
        reference: 'PHOD Medical',
        mobile: '9876500005'
      }
    ];

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
            directive: 'NORMAL_ALLOT',
            level: 13,
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
      settings: engineSettings,
      currentTime: new Date()
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

  const handleAcceptAlternativeOption = (request, option) => {
    const { updatedRooms, committedCount } = commitAlternativeOption(request, option, rooms);
    onCommitPlan(updatedRooms);

    try {
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.7 }
      });
    } catch (e) {}

    alert(`Option accepted! Committed ${committedCount} reservation(s) to schedule for ${request.guestName || 'Officer'}.`);
    // Re-run allotment engine to update visual plan state
    const recalculated = runAutoAllotmentEngine({
      requests: requests.filter(r => r.id !== request.id),
      rooms: updatedRooms,
      roomConfigs: localConfigs,
      includeOrh,
      currentBuilding,
      settings: engineSettings
    });
    setResults(recalculated);
  };

  const handleConfigChange = (key, level) => {
    const updated = { ...localConfigs, [key]: level };
    setLocalConfigs(updated);
    onSaveRoomConfigs(updated);
  };

  const handleSaveSettings = () => {
    saveAllotmentSettings(engineSettings);
    setSettingsSavedToast(true);
    setTimeout(() => setSettingsSavedToast(false), 3000);
  };

  const handleResetSettings = () => {
    if (window.confirm('Reset all engine parameters and calendar events to v7 defaults?')) {
      setEngineSettings(DEFAULT_SETTINGS);
      saveAllotmentSettings(DEFAULT_SETTINGS);
      setSettingsSavedToast(true);
      setTimeout(() => setSettingsSavedToast(false), 3000);
    }
  };

  const handleAddCalendarEvent = () => {
    if (!newEvent.name || !newEvent.start || !newEvent.end) {
      alert('Please fill in Event Name, Start Date, and End Date.');
      return;
    }
    const updated = {
      ...engineSettings,
      calendar_events: [
        ...(engineSettings.calendar_events || []),
        { ...newEvent, surge_factor: parseFloat(newEvent.surge_factor) || 1.5 }
      ]
    };
    setEngineSettings(updated);
    saveAllotmentSettings(updated);
    setNewEvent({ name: '', start: '2026-10-01', end: '2026-10-05', surge_factor: 1.5 });
  };

  const handleRemoveCalendarEvent = (idx) => {
    const updatedList = (engineSettings.calendar_events || []).filter((_, i) => i !== idx);
    const updated = { ...engineSettings, calendar_events: updatedList };
    setEngineSettings(updated);
    saveAllotmentSettings(updated);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container xlarge" onClick={(e) => e.stopPropagation()} style={{ height: '92vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div className="modal-header" style={{ marginBottom: 12 }}>
          <h2>
            <Sparkles size={22} color="var(--primary)" />
            <span>Room Auto-Allotment Engine v7.0</span>
            <span style={{ fontSize: '0.74rem', background: 'var(--badge-type-bg)', color: 'var(--badge-type-text)', padding: '2px 8px', borderRadius: 12, marginLeft: 8, fontWeight: 700 }}>
              Calendar & Surge Aware
            </span>
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
            <span>Room Priority Scores</span>
          </button>
          <button 
            className={`btn ${activeTab === 'settings' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => setActiveTab('settings')}
          >
            <Calendar size={15} />
            <span>Calendar & Surge Settings (v7.0)</span>
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }}>
          {activeTab === 'requests' && (
            <div>
              {/* Load Existing Bookings Box */}
              <div style={{ 
                background: 'var(--badge-type-bg)', 
                border: '1px solid rgba(2, 132, 199, 0.25)', 
                padding: '12px 16px', 
                borderRadius: 'var(--radius-sm)', 
                marginBottom: 16,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12
              }}>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--badge-type-text)', fontSize: '0.90rem' }}>
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
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Layers size={16} />
                    <span>Incoming Allotment Requests ({requests.length})</span>
                  </h4>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-secondary btn-sm" onClick={handleGenerateTestData}>
                      <Sparkles size={13} />
                      <span>Generate v7 Test Scenarios</span>
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
                        <th>Directive</th>
                        <th>Pay Level</th>
                        <th>Status</th>
                        <th>Beds</th>
                        <th>Ground floor</th>
                        <th>Check-in Time</th>
                        <th>Check-out Time</th>
                        <th>Purpose</th>
                        <th>Reference / VIP Link</th>
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
                              style={{ padding: '6px 8px', fontSize: '0.82rem', minWidth: 140 }}
                            />
                          </td>
                          <td>
                            <select 
                              className="form-select"
                              value={req.directive || 'NORMAL_ALLOT'}
                              onChange={(e) => handleRowChange(req.id, 'directive', e.target.value)}
                              style={{ 
                                padding: '6px', 
                                fontSize: '0.80rem', 
                                width: 120,
                                fontWeight: req.directive === 'MUST_ALLOT' ? 700 : 500,
                                color: req.directive === 'MUST_ALLOT' ? 'var(--booked-text)' : (req.directive === 'SHOULD_ALLOT' ? '#b45309' : 'inherit')
                              }}
                            >
                              <option value="NORMAL_ALLOT">Normal Allot</option>
                              <option value="SHOULD_ALLOT">Should Allot (+350)</option>
                              <option value="MUST_ALLOT">Must Allot (Guaranteed)</option>
                            </select>
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
                              <option value="Serving">Serving (x1.1)</option>
                              <option value="Retired">Retired (x1.0)</option>
                              <option value="Guest">Guest (x0.8)</option>
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
                              style={{ padding: '6px', fontSize: '0.82rem', width: 55 }}
                            />
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: '0.80rem' }}>
                              <input 
                                type="checkbox"
                                checked={req.gfPref}
                                onChange={(e) => handleRowChange(req.id, 'gfPref', e.target.checked)}
                              />
                              <span>Ground floor</span>
                            </label>
                          </td>
                          <td>
                            <input 
                              type="datetime-local" 
                              className="form-input" 
                              value={req.from}
                              onChange={(e) => handleRowChange(req.id, 'from', e.target.value)}
                              style={{ padding: '6px', fontSize: '0.78rem', minWidth: 155 }}
                            />
                          </td>
                          <td>
                            <input 
                              type="datetime-local" 
                              className="form-input" 
                              value={req.to}
                              onChange={(e) => handleRowChange(req.id, 'to', e.target.value)}
                              style={{ padding: '6px', fontSize: '0.78rem', minWidth: 155 }}
                            />
                          </td>
                          <td>
                            <select 
                              className="form-select"
                              value={req.purpose}
                              onChange={(e) => handleRowChange(req.id, 'purpose', e.target.value)}
                              style={{ padding: '6px', fontSize: '0.80rem', width: 100 }}
                            >
                              <option value="Duty">Duty (40pt)</option>
                              <option value="Medical">Medical (30pt)</option>
                              <option value="Personal">Personal (15pt)</option>
                              <option value="Guest">Guest (5pt)</option>
                            </select>
                          </td>
                          <td>
                            <input 
                              type="text" 
                              className="form-input" 
                              placeholder="Ref (GM/PCE)"
                              value={req.reference || ''}
                              onChange={(e) => handleRowChange(req.id, 'reference', e.target.value)}
                              style={{ padding: '6px 8px', fontSize: '0.80rem', width: 100 }}
                            />
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
                    <span>Include ORH Rooms (Transit/Buffer Pool)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.86rem' }}>
                    <span>Cleaning Buffer:</span>
                    <select 
                      className="custom-select" 
                      value={bufferHours} 
                      onChange={(e) => setBufferHours(parseInt(e.target.value, 10))}
                      style={{ padding: '4px 8px' }}
                    >
                      <option value="1">1 Hour</option>
                      <option value="2">2 Hours (Standard)</option>
                      <option value="4">4 Hours (VIP Standard)</option>
                    </select>
                  </label>
                </div>

                <button className="btn btn-accent" onClick={handleCalculateAllotment} style={{ padding: '8px 18px', fontSize: '0.92rem' }}>
                  <Sparkles size={16} />
                  <span>Run v7.0 Allotment Engine</span>
                </button>
              </div>

              {/* Results View */}
              {results && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>
                        Allotment Plan Preview ({results.filter(r => (r.allottedRooms || []).length > 0).length} of {results.length} Allotted)
                      </h3>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Optimized with Calendar Surge Multipliers, Long-Stay Collision Penalties, and Dynamic Quotas.
                      </div>
                    </div>
                    <button className="btn btn-primary" onClick={handleCommitPlanToSchedule}>
                      <CheckCheck size={16} />
                      <span>Commit Full Plan to Live Schedule</span>
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {results.map((res, idx) => {
                      const allotted = res.allottedRooms || [];
                      const isFullyAllotted = res.status === 'Fully Allotted';
                      const isPartiallyAllotted = res.status.includes('Partially Allotted');
                      const isDenied = !isFullyAllotted && !isPartiallyAllotted;
                      const hasOptions = res.partialAllotmentOptions && (
                        (res.partialAllotmentOptions.less_duration || []).length > 0 ||
                        (res.partialAllotmentOptions.less_capacity || []).length > 0 ||
                        (res.partialAllotmentOptions.split_stay || []).length > 0 ||
                        (res.partialAllotmentOptions.orh_alternative || []).length > 0
                      );

                      const isExpanded = !!expandedScores[res.request.id];
                      const bd = res.scoreBreakdown || {};

                      return (
                        <div 
                          key={res.request.id || idx} 
                          className="allotment-result-card" 
                          style={{ 
                            borderLeft: `5px solid ${isFullyAllotted ? 'var(--available)' : (isPartiallyAllotted ? '#eab308' : 'var(--booked)')}`,
                            background: 'var(--bg-surface)',
                            padding: 16,
                            borderRadius: 'var(--radius-sm)',
                            boxShadow: 'var(--shadow-sm)'
                          }}
                        >
                          {/* Row 1: Header */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <span 
                                className="allotment-score-pill" 
                                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                                onClick={() => toggleScoreBreakdown(res.request.id)}
                                title="Click to view score breakdown"
                              >
                                <span>Score: {res.score}</span>
                                {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                              </span>

                              {res.request.directive && res.request.directive !== 'NORMAL_ALLOT' && (
                                <span className="badge" style={{ 
                                  background: res.request.directive === 'MUST_ALLOT' ? 'var(--booked-bg)' : '#fef3c7',
                                  color: res.request.directive === 'MUST_ALLOT' ? 'var(--booked-text)' : '#b45309',
                                  fontWeight: 700
                                }}>
                                  {res.request.directive}
                                </span>
                              )}

                              <strong style={{ fontSize: '0.98rem' }}>
                                {res.request.guestName || `Request #${idx + 1}`}
                              </strong>

                              <span style={{ fontSize: '0.80rem', color: 'var(--text-muted)' }}>
                                (Level {res.request.level} • {res.request.status} • {res.request.purpose} • {res.request.beds} Bed{res.request.beds > 1 ? 's' : ''})
                              </span>

                              {res.peakDaysCrossed > 0 && (
                                <span style={{
                                  background: 'rgba(234, 179, 8, 0.12)',
                                  color: '#b45309',
                                  border: '1px solid rgba(234, 179, 8, 0.35)',
                                  fontSize: '0.74rem',
                                  padding: '2px 8px',
                                  borderRadius: 12,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  fontWeight: 600
                                }}>
                                  <Zap size={12} color="#b45309" />
                                  <span>{res.peakDaysCrossed} Peak Day{res.peakDaysCrossed > 1 ? 's' : ''} ({res.peakEvents.join(', ')})</span>
                                </span>
                              )}
                            </div>

                            <span className="badge" style={{ 
                              background: isFullyAllotted ? 'var(--available-bg)' : (isPartiallyAllotted ? '#fef3c7' : 'var(--booked-bg)'),
                              color: isFullyAllotted ? 'var(--available-text)' : (isPartiallyAllotted ? '#b45309' : 'var(--booked-text)'),
                              fontWeight: 700,
                              fontSize: '0.84rem',
                              padding: '4px 10px'
                            }}>
                              {res.status}
                            </span>
                          </div>

                          {/* Row 2: Score Breakdown (collapsible) */}
                          {isExpanded && (
                            <div style={{
                              background: 'var(--bg-subtle)',
                              padding: '10px 14px',
                              borderRadius: 'var(--radius-sm)',
                              marginTop: 10,
                              fontSize: '0.78rem',
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: '10px 20px',
                              border: '1px solid var(--card-border)'
                            }}>
                              <div>Seniority: <strong>+{bd.seniority_score || 0}</strong></div>
                              <div>Purpose: <strong>+{bd.purpose_score || 0}</strong></div>
                              <div>Status Subtotal: <strong>{bd.status_adjusted_subtotal || 0}</strong></div>
                              <div>Duration Bonus: <strong>{bd.duration_bonus > 0 ? `+${bd.duration_bonus}` : bd.duration_bonus || 0}</strong></div>
                              <div>Demand Bonus: <strong>{bd.demand_bonus > 0 ? `+${bd.demand_bonus}` : bd.demand_bonus || 0}</strong></div>
                              {bd.reference_bonus > 0 && <div>Reference Bonus: <strong>+{bd.reference_bonus}</strong></div>}
                              {bd.directive_should_allot_boost > 0 && <div>Should Allot Boost: <strong>+{bd.directive_should_allot_boost}</strong></div>}
                              {bd.surge_collision_penalty < 0 && (
                                <div style={{ color: 'var(--booked-text)', fontWeight: 800 }}>
                                  Surge Collision Penalty: {bd.surge_collision_penalty} pts ({res.peakDaysCrossed} peak days crossed)
                                </div>
                              )}
                            </div>
                          )}

                          {/* Row 3: Allotted Rooms info */}
                          <div style={{ fontSize: '0.86rem', marginTop: 8 }}>
                            {allotted.length > 0 ? (
                              <div style={{ color: 'var(--available)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <CheckCircle2 size={16} />
                                <span>Allotted Rooms: {allotted.map(r => `${r.building}-${r.id} (${r.type}, ${r.floor} Floor)`).join(' + ')}</span>
                              </div>
                            ) : (
                              <div style={{ color: 'var(--booked-text)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <AlertTriangle size={16} />
                                <span>Primary Request Waitlisted: Safety quota held for upcoming peak or capacity filled.</span>
                              </div>
                            )}
                          </div>

                          {/* Row 4: Reason text */}
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
                            {res.reasons.join(' ')}
                          </div>

                          {/* Row 5: Multi-Option Partial Allotment Engine Fallbacks */}
                          {hasOptions && (isDenied || isPartiallyAllotted) && (
                            <div style={{
                              marginTop: 12,
                              paddingTop: 12,
                              borderTop: '1px dashed var(--card-border)'
                            }}>
                              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Wand2 size={14} />
                                <span>Smart Alternative Allotments & Fallback Options:</span>
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
                                {/* Less Duration Options */}
                                {(res.partialAllotmentOptions.less_duration || []).map((opt, oIdx) => (
                                  <div 
                                    key={`dur_${oIdx}`}
                                    style={{
                                      background: 'var(--bg-subtle)',
                                      border: '1px solid var(--card-border)',
                                      borderRadius: 'var(--radius-sm)',
                                      padding: 10,
                                      display: 'flex',
                                      flexDirection: 'column',
                                      justifyContent: 'space-between',
                                      gap: 8
                                    }}
                                  >
                                    <div>
                                      <div style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--text-main)' }}>
                                        {opt.title}
                                      </div>
                                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                        {opt.description}
                                      </div>
                                    </div>
                                    <button 
                                      className="btn btn-secondary btn-sm"
                                      style={{ alignSelf: 'flex-start', fontSize: '0.76rem', padding: '4px 10px' }}
                                      onClick={() => handleAcceptAlternativeOption(res.request, opt)}
                                    >
                                      <Check size={12} />
                                      <span>Accept & Allot Option</span>
                                    </button>
                                  </div>
                                ))}

                                {/* Less Capacity Options */}
                                {(res.partialAllotmentOptions.less_capacity || []).map((opt, oIdx) => (
                                  <div 
                                    key={`cap_${oIdx}`}
                                    style={{
                                      background: 'var(--bg-subtle)',
                                      border: '1px solid var(--card-border)',
                                      borderRadius: 'var(--radius-sm)',
                                      padding: 10,
                                      display: 'flex',
                                      flexDirection: 'column',
                                      justifyContent: 'space-between',
                                      gap: 8
                                    }}
                                  >
                                    <div>
                                      <div style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--text-main)' }}>
                                        {opt.title}
                                      </div>
                                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                        {opt.description}
                                      </div>
                                    </div>
                                    <button 
                                      className="btn btn-secondary btn-sm"
                                      style={{ alignSelf: 'flex-start', fontSize: '0.76rem', padding: '4px 10px' }}
                                      onClick={() => handleAcceptAlternativeOption(res.request, opt)}
                                    >
                                      <Check size={12} />
                                      <span>Accept & Allot Option</span>
                                    </button>
                                  </div>
                                ))}

                                {/* Split Stay Options */}
                                {(res.partialAllotmentOptions.split_stay || []).map((opt, oIdx) => (
                                  <div 
                                    key={`splt_${oIdx}`}
                                    style={{
                                      background: 'var(--bg-subtle)',
                                      border: '1px solid var(--card-border)',
                                      borderRadius: 'var(--radius-sm)',
                                      padding: 10,
                                      display: 'flex',
                                      flexDirection: 'column',
                                      justifyContent: 'space-between',
                                      gap: 8
                                    }}
                                  >
                                    <div>
                                      <div style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--text-main)' }}>
                                        {opt.title}
                                      </div>
                                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                        {opt.description}
                                      </div>
                                    </div>
                                    <button 
                                      className="btn btn-secondary btn-sm"
                                      style={{ alignSelf: 'flex-start', fontSize: '0.76rem', padding: '4px 10px' }}
                                      onClick={() => handleAcceptAlternativeOption(res.request, opt)}
                                    >
                                      <Check size={12} />
                                      <span>Accept & Allot Option</span>
                                    </button>
                                  </div>
                                ))}

                                {/* ORH Alternative Options */}
                                {(res.partialAllotmentOptions.orh_alternative || []).map((opt, oIdx) => (
                                  <div 
                                    key={`orh_${oIdx}`}
                                    style={{
                                      background: 'var(--badge-type-bg)',
                                      border: '1px solid rgba(2, 132, 199, 0.3)',
                                      borderRadius: 'var(--radius-sm)',
                                      padding: 10,
                                      display: 'flex',
                                      flexDirection: 'column',
                                      justifyContent: 'space-between',
                                      gap: 8
                                    }}
                                  >
                                    <div>
                                      <div style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--badge-type-text)' }}>
                                        {opt.title}
                                      </div>
                                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                        {opt.description}
                                      </div>
                                    </div>
                                    <button 
                                      className="btn btn-primary btn-sm"
                                      style={{ alignSelf: 'flex-start', fontSize: '0.76rem', padding: '4px 10px' }}
                                      onClick={() => handleAcceptAlternativeOption(res.request, opt)}
                                    >
                                      <Check size={12} />
                                      <span>Route to ORH</span>
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'config' && (
            /* Tab 2: Room Priority Score Thresholds (Entitlements) */
            <div>
              <div style={{ marginBottom: 16 }}>
                <h4 style={{ fontSize: '0.94rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Sliders size={16} />
                  <span>Room Minimum Priority Score Thresholds</span>
                </h4>
                <p style={{ fontSize: '0.80rem', color: 'var(--text-muted)' }}>
                  Set the minimum Importance Priority Score required for the auto-allotment engine to allot each room.
                  Rooms set to <strong>1000 (Manual Only)</strong> are reserved exclusively for manual booking and are <strong>NEVER auto-allotted</strong>.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 12 }}>
                {rooms.map(r => {
                  const key = `${r.building}_${r.id}`;
                  const defaultScore = (r.building === 'OGH' && r.id === '13') 
                    ? '1000' 
                    : ((r.building === 'OGH' && r.type.includes('VIP') && !r.type.includes('Semi')) 
                      ? '250' 
                      : (r.building === 'OGH' && r.type.includes('Semi-VIP') 
                        ? '220' 
                        : (r.building === 'OGH' && r.floor === 'Ground' ? '180' : (r.building === 'OGH' ? '140' : '100'))));
                  const currentScore = localConfigs[key] || defaultScore;
                  const isManualOnly = parseInt(currentScore, 10) >= 1000;

                  return (
                    <div 
                      key={key} 
                      style={{ 
                        background: isManualOnly ? 'rgba(239, 68, 68, 0.05)' : 'var(--bg-surface)', 
                        border: `1px solid ${isManualOnly ? 'rgba(239, 68, 68, 0.4)' : 'var(--card-border)'}`, 
                        padding: 12, 
                        borderRadius: 'var(--radius-sm)' 
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <strong style={{ fontSize: '0.92rem' }}>{r.building}-{r.id}</strong>
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          {isManualOnly && (
                            <span className="badge" style={{ background: 'var(--booked-bg)', color: 'var(--booked-text)', fontWeight: 700, fontSize: '0.70rem' }}>
                              🔒 Manual Only
                            </span>
                          )}
                          <span className="badge badge-type">{r.type}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Min Score:</span>
                        <select 
                          className="form-select"
                          value={currentScore}
                          onChange={(e) => handleConfigChange(key, e.target.value)}
                          style={{ 
                            padding: '4px 6px', 
                            fontSize: '0.80rem',
                            fontWeight: isManualOnly ? 700 : 500,
                            color: isManualOnly ? 'var(--booked-text)' : 'inherit'
                          }}
                        >
                          <option value="1000">1000 - Manual Only (No Auto)</option>
                          <option value="500">500 - Apex / VVIP Priority</option>
                          <option value="350">350 - Senior SAG Priority</option>
                          <option value="300">300 - High VIP Suite</option>
                          <option value="250">250 - VIP Standard Suite</option>
                          <option value="220">220 - Semi-VIP Suite</option>
                          <option value="200">200 - Prime Ground Floor</option>
                          <option value="180">180 - Standard Ground Floor</option>
                          <option value="150">150 - First Floor Standard</option>
                          <option value="140">140 - First Floor Normal</option>
                          <option value="120">120 - Buffer Suite</option>
                          <option value="100">100 - Base / Transit</option>
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            /* Tab 3: Calendar & Surge Settings (v7.0) */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Header Action Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <h4 style={{ fontSize: '0.98rem', fontWeight: 700, margin: 0 }}>
                    Algorithm v7.0 Parameters & Calendar Registry
                  </h4>
                  <p style={{ fontSize: '0.80rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                    Configure high-demand dates, surge multipliers, penalty equations, and safety quotas.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {settingsSavedToast && (
                    <span style={{ fontSize: '0.80rem', color: 'var(--available)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Check size={14} /> Settings Saved!
                    </span>
                  )}
                  <button className="btn btn-secondary btn-sm" onClick={handleResetSettings}>
                    <RotateCcw size={13} />
                    <span>Reset to v7 Defaults</span>
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={handleSaveSettings}>
                    <Check size={14} />
                    <span>Save All Parameters</span>
                  </button>
                </div>
              </div>

              {/* 1. Calendar Events Registry */}
              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--card-border)', borderRadius: 'var(--radius-sm)', padding: 16 }}>
                <h5 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Calendar size={15} color="var(--primary)" />
                  <span>Calendar Events & Varanasi Festival Peaks</span>
                </h5>

                <div style={{ overflowX: 'auto', marginBottom: 14 }}>
                  <table className="allotment-table">
                    <thead>
                      <tr>
                        <th>Festival / Event Name</th>
                        <th>Start Date</th>
                        <th>End Date</th>
                        <th>Surge Multiplier</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(engineSettings.calendar_events || []).map((ev, i) => (
                        <tr key={i}>
                          <td><strong>{ev.name}</strong></td>
                          <td>{ev.start}</td>
                          <td>{ev.end}</td>
                          <td>
                            <span className="badge" style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#b45309', fontWeight: 700 }}>
                              {ev.surge_factor}x
                            </span>
                          </td>
                          <td>
                            <button 
                              className="btn btn-danger btn-sm"
                              onClick={() => handleRemoveCalendarEvent(i)}
                              title="Delete Event"
                            >
                              <Trash2 size={12} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Add New Event inline */}
                <div style={{ background: 'var(--bg-subtle)', padding: 12, borderRadius: 'var(--radius-sm)', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Event Name (e.g. Mahashivratri)"
                    value={newEvent.name}
                    onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                    style={{ flex: 2, minWidth: 160 }}
                  />
                  <input 
                    type="date" 
                    className="form-input" 
                    value={newEvent.start}
                    onChange={(e) => setNewEvent({ ...newEvent, start: e.target.value })}
                    style={{ flex: 1, minWidth: 120 }}
                  />
                  <span style={{ fontSize: '0.8rem' }}>to</span>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={newEvent.end}
                    onChange={(e) => setNewEvent({ ...newEvent, end: e.target.value })}
                    style={{ flex: 1, minWidth: 120 }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: '0.78rem' }}>Surge:</span>
                    <input 
                      type="number" 
                      step="0.1" 
                      className="form-input" 
                      value={newEvent.surge_factor}
                      onChange={(e) => setNewEvent({ ...newEvent, surge_factor: parseFloat(e.target.value) || 1.5 })}
                      style={{ width: 65 }}
                    />
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={handleAddCalendarEvent}>
                    <Plus size={13} />
                    <span>Add Event</span>
                  </button>
                </div>
              </div>

              {/* 2. Grid: Day-of-Week Multipliers & Long Stay Penalty */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
                {/* Day of Week Multipliers */}
                <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--card-border)', borderRadius: 'var(--radius-sm)', padding: 16 }}>
                  <h5 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: 12 }}>
                    Day-of-Week Inflow Multipliers
                  </h5>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '0.78rem' }}>Friday Peak Multiplier</label>
                      <input 
                        type="number" 
                        step="0.05" 
                        className="form-input" 
                        value={engineSettings.dow_mult_friday ?? 1.45}
                        onChange={(e) => setEngineSettings({ ...engineSettings, dow_mult_friday: parseFloat(e.target.value) || 1.45 })}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '0.78rem' }}>Sunday Return Multiplier</label>
                      <input 
                        type="number" 
                        step="0.05" 
                        className="form-input" 
                        value={engineSettings.dow_mult_sunday ?? 1.20}
                        onChange={(e) => setEngineSettings({ ...engineSettings, dow_mult_sunday: parseFloat(e.target.value) || 1.20 })}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '0.78rem' }}>Saturday Weekend Multiplier</label>
                      <input 
                        type="number" 
                        step="0.05" 
                        className="form-input" 
                        value={engineSettings.dow_mult_saturday ?? 1.15}
                        onChange={(e) => setEngineSettings({ ...engineSettings, dow_mult_saturday: parseFloat(e.target.value) || 1.15 })}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '0.78rem' }}>Midweek (Tue-Thu) Baseline</label>
                      <input 
                        type="number" 
                        step="0.05" 
                        className="form-input" 
                        value={engineSettings.dow_mult_weekday ?? 0.85}
                        onChange={(e) => setEngineSettings({ ...engineSettings, dow_mult_weekday: parseFloat(e.target.value) || 0.85 })}
                      />
                    </div>
                  </div>
                </div>

                {/* Long Stay Collision Penalty Parameters */}
                <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--card-border)', borderRadius: 'var(--radius-sm)', padding: 16 }}>
                  <h5 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: 12 }}>
                    Long-Stay Surge Collision Penalty ($P_surge$)
                  </h5>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '0.78rem' }}>Overlap Penalty Rate (pts/day)</label>
                      <input 
                        type="number" 
                        step="5" 
                        className="form-input" 
                        value={engineSettings.surge_overlap_penalty_rate ?? 20.0}
                        onChange={(e) => setEngineSettings({ ...engineSettings, surge_overlap_penalty_rate: parseFloat(e.target.value) || 20.0 })}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '0.78rem' }}>Long-Stay Threshold (Days)</label>
                      <input 
                        type="number" 
                        step="1" 
                        className="form-input" 
                        value={engineSettings.surge_long_stay_threshold_days ?? 3.0}
                        onChange={(e) => setEngineSettings({ ...engineSettings, surge_long_stay_threshold_days: parseFloat(e.target.value) || 3.0 })}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '0.78rem' }}>Peak Horizon Max (Days)</label>
                      <input 
                        type="number" 
                        step="1" 
                        className="form-input" 
                        value={engineSettings.peak_horizon_max_days ?? 7.0}
                        onChange={(e) => setEngineSettings({ ...engineSettings, peak_horizon_max_days: parseFloat(e.target.value) || 7.0 })}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '0.78rem' }}>Prob. Target Service Level</label>
                      <input 
                        type="number" 
                        step="0.05" 
                        min="0.5" 
                        max="0.99" 
                        className="form-input" 
                        value={engineSettings.prob_target_service_level ?? 0.85}
                        onChange={(e) => setEngineSettings({ ...engineSettings, prob_target_service_level: parseFloat(e.target.value) || 0.85 })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Poisson Arrival Rates & Directive Boosts */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
                {/* Poisson Lambdas */}
                <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--card-border)', borderRadius: 'var(--radius-sm)', padding: 16 }}>
                  <h5 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: 12 }}>
                    Poisson Arrival Rates ($\lambda$) for Safety Stock
                  </h5>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '0.78rem' }}>VVIP Suite 13 ($\lambda$)</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        className="form-input" 
                        value={engineSettings.lambda_vvip ?? 0.05}
                        onChange={(e) => setEngineSettings({ ...engineSettings, lambda_vvip: parseFloat(e.target.value) || 0.05 })}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '0.78rem' }}>VIP Suites ($\lambda$)</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        className="form-input" 
                        value={engineSettings.lambda_vip ?? 0.15}
                        onChange={(e) => setEngineSettings({ ...engineSettings, lambda_vip: parseFloat(e.target.value) || 0.15 })}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '0.78rem' }}>Ground Floor Suites ($\lambda$)</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        className="form-input" 
                        value={engineSettings.lambda_gf ?? 0.35}
                        onChange={(e) => setEngineSettings({ ...engineSettings, lambda_gf: parseFloat(e.target.value) || 0.35 })}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '0.78rem' }}>Standard Suites ($\lambda$)</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        className="form-input" 
                        value={engineSettings.lambda_standard ?? 0.20}
                        onChange={(e) => setEngineSettings({ ...engineSettings, lambda_standard: parseFloat(e.target.value) || 0.20 })}
                      />
                    </div>
                  </div>
                </div>

                {/* Directive & Buffers */}
                <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--card-border)', borderRadius: 'var(--radius-sm)', padding: 16 }}>
                  <h5 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: 12 }}>
                    Directives & Sanitization Buffers
                  </h5>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '0.78rem' }}>MUST_ALLOT Score</label>
                      <input 
                        type="number" 
                        step="50" 
                        className="form-input" 
                        value={engineSettings.directive_must_allot_score ?? 1000.0}
                        onChange={(e) => setEngineSettings({ ...engineSettings, directive_must_allot_score: parseFloat(e.target.value) || 1000.0 })}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '0.78rem' }}>SHOULD_ALLOT Boost (pts)</label>
                      <input 
                        type="number" 
                        step="25" 
                        className="form-input" 
                        value={engineSettings.directive_should_allot_boost ?? 350.0}
                        onChange={(e) => setEngineSettings({ ...engineSettings, directive_should_allot_boost: parseFloat(e.target.value) || 350.0 })}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '0.78rem' }}>VIP Cleaning Buffer (Hours)</label>
                      <input 
                        type="number" 
                        step="1" 
                        className="form-input" 
                        value={engineSettings.buffer_vip_hours ?? 4.0}
                        onChange={(e) => setEngineSettings({ ...engineSettings, buffer_vip_hours: parseFloat(e.target.value) || 4.0 })}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '0.78rem' }}>Standard Buffer (Hours)</label>
                      <input 
                        type="number" 
                        step="1" 
                        className="form-input" 
                        value={engineSettings.buffer_standard_hours ?? 2.0}
                        onChange={(e) => setEngineSettings({ ...engineSettings, buffer_standard_hours: parseFloat(e.target.value) || 2.0 })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
