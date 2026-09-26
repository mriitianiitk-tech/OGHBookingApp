import React, { useState } from 'react';
import { STORAGE_KEYS } from '../constants/initialRooms';
import { Building2, Lock, User, KeyRound } from 'lucide-react';

export default function LoginScreen({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    setErrorMsg('');

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.CRED) || '{"u":"admin","p":"password"}');
    
    if (username === stored.u && password === stored.p) {
      localStorage.setItem(STORAGE_KEYS.LOGIN, 'true');
      onLoginSuccess();
    } else {
      setErrorMsg('Invalid username or password. Please try again.');
    }
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <div className="brand-icon" style={{ width: 56, height: 56, borderRadius: 16 }}>
            <Building2 size={32} />
          </div>
        </div>

        <h2 style={{ fontSize: '1.45rem', fontWeight: 800, marginBottom: 4 }}>
          BLW Accommodation
        </h2>
        <div style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginBottom: 24 }}>
          Guest House Management Console v3.0
        </div>

        <form onSubmit={handleLogin}>
          <div className="form-group" style={{ textAlign: 'left' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <User size={14} />
              <span>Username</span>
            </label>
            <input 
              type="text" 
              className="form-input" 
              required
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ textAlign: 'left' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Lock size={14} />
              <span>Password</span>
            </label>
            <input 
              type="password" 
              className="form-input" 
              required
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {errorMsg && (
            <div style={{ color: 'var(--booked)', fontSize: '0.84rem', fontWeight: 600, marginBottom: 14 }}>
              {errorMsg}
            </div>
          )}

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '11px', marginTop: 8 }}>
            <span>Sign In to Console</span>
          </button>
        </form>
      </div>
    </div>
  );
}
