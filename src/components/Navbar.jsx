import React from 'react';
import { 
  Building2, 
  RotateCw, 
  Moon, 
  Sun, 
  Settings, 
  LogOut,
  Smartphone
} from 'lucide-react';

export default function Navbar({
  currentBuilding,
  onSwitchBuilding,
  theme,
  onToggleTheme,
  lastSyncTime,
  isSyncing,
  onForceSync,
  onOpenSettings,
  onLogout,
  onInstallPwa,
  canInstallPwa
}) {
  return (
    <header className="app-header">
      <div className="brand-section">
        <div className="brand-icon">
          <Building2 size={22} />
        </div>
        <div>
          <div className="brand-title">
            <span>BLW Accommodation</span>
            <span className="version-pill">v3.0</span>
          </div>
          <div className="brand-subtitle">
            Smart Guest House & Rest House Management
          </div>
        </div>
      </div>

      <div className="nav-actions">
        {/* Supabase Realtime Sync Badge */}
        <div className="sync-badge" title="Supabase Cloud Synchronization">
          <span className={`sync-dot ${isSyncing ? 'syncing' : ''}`} />
          <span className="sync-text">{isSyncing ? 'Syncing...' : lastSyncTime ? `Synced: ${lastSyncTime}` : 'Cloud Live'}</span>
          <button 
            className="btn-close" 
            onClick={onForceSync} 
            title="Force Cloud Sync"
            style={{ padding: '2px', marginLeft: '4px' }}
          >
            <RotateCw size={13} className={isSyncing ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* PWA Android Install Button */}
        <button 
          className={`btn btn-secondary btn-icon-mobile ${canInstallPwa ? 'install-highlight' : ''}`}
          onClick={onInstallPwa}
          title="Install App on Android / Device"
        >
          <Smartphone size={15} />
          <span className="btn-label-desktop">Install App</span>
        </button>

        {/* Light / Dark Mode Toggle */}
        <button 
          className="btn btn-secondary btn-icon-only" 
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* Settings */}
        <button 
          className="btn btn-secondary btn-icon-mobile" 
          onClick={onOpenSettings}
          title="Settings & Backups"
        >
          <Settings size={15} />
          <span className="btn-label-desktop">Settings</span>
        </button>

        {/* Logout */}
        <button 
          className="btn btn-danger btn-sm btn-icon-only" 
          onClick={onLogout}
          title="Logout"
        >
          <LogOut size={15} />
        </button>
      </div>
    </header>
  );
}
