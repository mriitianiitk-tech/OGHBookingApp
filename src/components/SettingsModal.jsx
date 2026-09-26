import React, { useState } from 'react';
import { exportToCSV, parseCSVBackup } from '../services/storageService';
import { STORAGE_KEYS } from '../constants/initialRooms';
import { X, KeyRound, Download, Upload, ShieldCheck, Database, Check } from 'lucide-react';

export default function SettingsModal({
  isOpen,
  onClose,
  rooms = [],
  onRestoreRooms
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [credUpdated, setCredUpdated] = useState(false);

  if (!isOpen) return null;

  const handleUpdateCredentials = (e) => {
    e.preventDefault();
    if (!username || !password) {
      alert('Please provide both username and password.');
      return;
    }

    const newCreds = { u: username, p: password };
    localStorage.setItem(STORAGE_KEYS.CRED, JSON.stringify(newCreds));
    setCredUpdated(true);
    setTimeout(() => setCredUpdated(false), 3000);
    setUsername('');
    setPassword('');
  };

  const handleExportCSV = () => {
    exportToCSV(rooms);
  };

  const handleRestoreFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const csvContent = evt.target.result;
      const res = parseCSVBackup(csvContent, rooms);
      if (res.success) {
        onRestoreRooms(res.rooms);
        alert(`Successfully restored ${res.count} booking records from CSV backup!`);
        onClose();
      } else {
        alert(res.message || 'Failed to parse CSV backup.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            <Database size={20} />
            <span>System Settings & Data Backup</span>
          </h2>
          <button className="btn-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Change Credentials */}
        <div style={{ background: 'var(--bg-subtle)', padding: 18, borderRadius: 'var(--radius-sm)', marginBottom: 20 }}>
          <h4 style={{ fontSize: '0.92rem', fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <KeyRound size={16} />
            <span>Administrator Credentials</span>
          </h4>

          <form onSubmit={handleUpdateCredentials}>
            <div className="form-group">
              <label>New Admin Username</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Enter new username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>New Admin Password</label>
              <input 
                type="password" 
                className="form-input" 
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button type="submit" className="btn btn-primary btn-sm">
                Update Login Credentials
              </button>
              {credUpdated && (
                <span style={{ fontSize: '0.8rem', color: 'var(--available)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Check size={14} /> Credentials Updated!
                </span>
              )}
            </div>
          </form>
        </div>

        {/* Backup & Restore */}
        <div style={{ background: 'var(--bg-subtle)', padding: 18, borderRadius: 'var(--radius-sm)' }}>
          <h4 style={{ fontSize: '0.92rem', fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <ShieldCheck size={16} />
            <span>Data Preservation & CSV Backup</span>
          </h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 16 }}>
            Download a full CSV archive of all guest house bookings, or restore previous records from any saved CSV backup.
          </p>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={handleExportCSV}>
              <Download size={15} />
              <span>Download CSV Backup</span>
            </button>

            <label className="btn btn-primary" style={{ flex: 1, cursor: 'pointer', position: 'relative' }}>
              <Upload size={15} />
              <span>Restore from CSV</span>
              <input 
                type="file" 
                accept=".csv" 
                onChange={handleRestoreFile} 
                style={{ position: 'absolute', opacity: 0, inset: 0, cursor: 'pointer' }}
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
