import React, { useState, useEffect, useCallback } from 'react';
import { 
  getInitialLocalRooms, 
  saveLocalRooms, 
  getStoredRoomConfigs, 
  saveRoomConfigs 
} from './services/storageService';
import { 
  fetchCloudRooms, 
  saveCloudRooms, 
  subscribeToCloudChanges 
} from './services/supabaseClient';
import { STORAGE_KEYS } from './constants/initialRooms';

// Components
import Navbar from './components/Navbar';
import StatsOverview from './components/StatsOverview';
import RoomGrid from './components/RoomGrid';
import BookingModal from './components/BookingModal';
import MultiRoomModal from './components/MultiRoomModal';
import SearchModal from './components/SearchModal';
import TimelineView from './components/TimelineView';
import AllotmentAssistant from './components/AllotmentAssistant';
import ReportsModal from './components/ReportsModal';
import SettingsModal from './components/SettingsModal';
import AllotmentSlipModal from './components/AllotmentSlipModal';
import LoginScreen from './components/LoginScreen';

export default function App() {
  // Authentication & Theme State
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.LOGIN) === 'true';
  });

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.THEME) || 'light';
  });

  // Building State (OGH vs ORH)
  const [currentBuilding, setCurrentBuilding] = useState('OGH');

  // Rooms and Configs State
  const [rooms, setRooms] = useState(() => getInitialLocalRooms());
  const [roomConfigs, setRoomConfigs] = useState(() => getStoredRoomConfigs());

  // Cloud Sync State
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState('');

  // Modals Visibility State
  const [bookingModalState, setBookingModalState] = useState({ isOpen: false, roomId: null, preIn: null, preOut: null });
  const [isMultiBookOpen, setIsMultiBookOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [isAllotmentOpen, setIsAllotmentOpen] = useState(false);
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [slipModalState, setSlipModalState] = useState({ isOpen: false, booking: null, room: null });

  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallPwa = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        console.log('User installed PWA');
      }
      setDeferredPrompt(null);
    } else {
      alert(
        'Install on Android / Smartphone:\n\n' +
        '1. Open Chrome or Edge on your phone.\n' +
        '2. Tap the three dots menu (⋮) in the top-right.\n' +
        '3. Select "Install app" or "Add to Home screen".\n\n' +
        'The BLW OGH app icon will appear directly on your home screen!'
      );
    }
  };

  // Apply Theme Attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  }, [theme]);

  // Initial Cloud Sync & Realtime Subscription
  useEffect(() => {
    let unsubscribe = null;

    const initCloud = async () => {
      setIsSyncing(true);
      const res = await fetchCloudRooms();
      if (res.success && Array.isArray(res.data)) {
        setRooms(prevRooms => {
          const merged = prevRooms.map(r => {
            const cloudMatch = res.data.find(p => p.id === r.id && p.building === r.building);
            return cloudMatch ? { ...r, bookings: cloudMatch.bookings || [] } : r;
          });
          saveLocalRooms(merged);
          return merged;
        });
        const now = new Date();
        setLastSyncTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }
      setIsSyncing(false);

      // Realtime listener
      unsubscribe = subscribeToCloudChanges((cloudRooms) => {
        if (Array.isArray(cloudRooms)) {
          setRooms(prevRooms => {
            const merged = prevRooms.map(r => {
              const cloudMatch = cloudRooms.find(p => p.id === r.id && p.building === r.building);
              return cloudMatch ? { ...r, bookings: cloudMatch.bookings || [] } : r;
            });
            saveLocalRooms(merged);
            return merged;
          });
          const now = new Date();
          setLastSyncTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        }
      });
    };

    initCloud();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Sync Helper to persist locally and push to Supabase
  const persistRooms = useCallback(async (updatedRooms) => {
    setRooms(updatedRooms);
    saveLocalRooms(updatedRooms);
    setIsSyncing(true);
    await saveCloudRooms(updatedRooms);
    setIsSyncing(false);
    const now = new Date();
    setLastSyncTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  }, []);

  // Force Cloud Sync Handler
  const handleForceSync = async () => {
    setIsSyncing(true);
    const res = await fetchCloudRooms();
    if (res.success && Array.isArray(res.data)) {
      const merged = rooms.map(r => {
        const cloudMatch = res.data.find(p => p.id === r.id && p.building === r.building);
        return cloudMatch ? { ...r, bookings: cloudMatch.bookings || [] } : r;
      });
      setRooms(merged);
      saveLocalRooms(merged);
      const now = new Date();
      setLastSyncTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } else {
      alert('Cloud sync failed. Check your internet connection.');
    }
    setIsSyncing(false);
  };

  // Toggle Dark / Light Theme
  const handleToggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Logout Handler
  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEYS.LOGIN);
    setIsLoggedIn(false);
  };

  // Save or Update Single Room Booking
  const handleSaveBooking = (bookingData, editingId) => {
    const updatedRooms = rooms.map(r => {
      if (r.id === bookingData.roomId && r.building === bookingData.building) {
        const currentBookings = [...(r.bookings || [])];
        if (editingId) {
          const index = currentBookings.findIndex(b => b.id === editingId);
          if (index !== -1) {
            currentBookings[index] = { ...bookingData, id: editingId };
          }
        } else {
          currentBookings.push({
            ...bookingData,
            id: `bk_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
          });
        }
        return { ...r, bookings: currentBookings };
      }
      return r;
    });

    persistRooms(updatedRooms);
  };

  // Delete Single Booking
  const handleDeleteBooking = (roomId, bookingId) => {
    if (!window.confirm('Are you sure you want to remove this booking?')) return;

    const updatedRooms = rooms.map(r => {
      if (r.id === roomId && r.building === currentBuilding) {
        return {
          ...r,
          bookings: (r.bookings || []).filter(b => b.id !== bookingId)
        };
      }
      return r;
    });

    persistRooms(updatedRooms);
  };

  // Save Multi-Room Delegation Bookings
  const handleSaveMultiBookings = (newBookings) => {
    const updatedRooms = rooms.map(r => {
      const matchingBookings = newBookings.filter(nb => nb.roomId === r.id && nb.building === r.building);
      if (matchingBookings.length > 0) {
        return {
          ...r,
          bookings: [
            ...(r.bookings || []),
            ...matchingBookings.map(nb => ({
              ...nb,
              id: `mb_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
            }))
          ]
        };
      }
      return r;
    });

    persistRooms(updatedRooms);
  };

  // Save Room Configs
  const handleSaveRoomConfigs = (newConfigs) => {
    setRoomConfigs(newConfigs);
    saveRoomConfigs(newConfigs);
  };

  // Open Room Booking Modal
  const handleOpenBookingModal = (roomId, preIn = null, preOut = null) => {
    setBookingModalState({ isOpen: true, roomId, preIn, preOut });
  };

  // Print Allotment Slip
  const handlePrintSlip = (booking, room) => {
    setSlipModalState({ isOpen: true, booking, room });
  };

  if (!isLoggedIn) {
    return <LoginScreen onLoginSuccess={() => setIsLoggedIn(true)} />;
  }

  const selectedRoom = rooms.find(
    r => r.id === bookingModalState.roomId && r.building === currentBuilding
  );

  return (
    <div className="app-container">
      {/* Top Navigation Bar */}
      <Navbar 
        currentBuilding={currentBuilding}
        onSwitchBuilding={setCurrentBuilding}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        lastSyncTime={lastSyncTime}
        isSyncing={isSyncing}
        onForceSync={handleForceSync}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAllotment={() => setIsAllotmentOpen(true)}
        onOpenMultiBook={() => setIsMultiBookOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenTimeline={() => setIsTimelineOpen(true)}
        onOpenReports={() => setIsReportsOpen(true)}
        onLogout={handleLogout}
        onInstallPwa={handleInstallPwa}
        canInstallPwa={Boolean(deferredPrompt)}
      />

      {/* Main Interactive Room Matrix with Integrated Clean Status Bar */}
      <RoomGrid 
        rooms={rooms}
        currentBuilding={currentBuilding}
        onSwitchBuilding={setCurrentBuilding}
        onOpenBookingModal={handleOpenBookingModal}
        onOpenAllotmentModal={() => setIsAllotmentOpen(true)}
        onOpenMultiBookModal={() => setIsMultiBookOpen(true)}
        onOpenSearchModal={() => setIsSearchOpen(true)}
        onOpenTimelineModal={() => setIsTimelineOpen(true)}
        onOpenReportsModal={() => setIsReportsOpen(true)}
      />

      {/* --- MODALS --- */}

      {/* Single Room Booking Drawer */}
      <BookingModal 
        isOpen={bookingModalState.isOpen}
        onClose={() => setBookingModalState({ isOpen: false, roomId: null, preIn: null, preOut: null })}
        room={selectedRoom}
        currentBuilding={currentBuilding}
        onSaveBooking={handleSaveBooking}
        onDeleteBooking={handleDeleteBooking}
        onPrintSlip={handlePrintSlip}
      />

      {/* Multi-Room Delegation Modal */}
      <MultiRoomModal 
        isOpen={isMultiBookOpen}
        onClose={() => setIsMultiBookOpen(false)}
        rooms={rooms}
        currentBuilding={currentBuilding}
        onSaveMultiBookings={handleSaveMultiBookings}
      />

      {/* Quick Search Vacancy Modal */}
      <SearchModal 
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        rooms={rooms}
        currentBuilding={currentBuilding}
        onSelectRoomToBook={handleOpenBookingModal}
      />

      {/* 14-Day Timeline Gantt Modal */}
      <TimelineView 
        isOpen={isTimelineOpen}
        onClose={() => setIsTimelineOpen(false)}
        rooms={rooms}
        currentBuilding={currentBuilding}
      />

      {/* Smart Auto-Allotment Engine Modal */}
      <AllotmentAssistant 
        isOpen={isAllotmentOpen}
        onClose={() => setIsAllotmentOpen(false)}
        rooms={rooms}
        roomConfigs={roomConfigs}
        onSaveRoomConfigs={handleSaveRoomConfigs}
        onCommitPlan={persistRooms}
        currentBuilding={currentBuilding}
      />

      {/* Bilingual Reports Modal */}
      <ReportsModal 
        isOpen={isReportsOpen}
        onClose={() => setIsReportsOpen(false)}
        rooms={rooms}
        currentBuilding={currentBuilding}
      />

      {/* Settings & CSV Backup Modal */}
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        rooms={rooms}
        onRestoreRooms={persistRooms}
      />

      {/* Individual Allotment Slip / Gate Pass Modal */}
      <AllotmentSlipModal 
        isOpen={slipModalState.isOpen}
        onClose={() => setSlipModalState({ isOpen: false, booking: null, room: null })}
        booking={slipModalState.booking}
        room={slipModalState.room}
      />
    </div>
  );
}
