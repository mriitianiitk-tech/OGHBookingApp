// Initial Room definitions for OGH & ORH - BLW Varanasi
export const INITIAL_ROOMS = [
  // OGH - 29 Rooms
  { id: '01', type: 'Standard', restricted: false, building: 'OGH', floor: 'Ground', beds: 2 },
  { id: '02', type: 'Standard', restricted: false, building: 'OGH', floor: 'Ground', beds: 2 },
  { id: '03', type: 'Standard', restricted: false, building: 'OGH', floor: 'Ground', beds: 2 },
  { id: '04', type: '4-Bedded', restricted: false, building: 'OGH', floor: 'Ground', beds: 4 },
  { id: '05', type: 'Standard', restricted: false, building: 'OGH', floor: 'Ground', beds: 2 },
  { id: '06', type: 'Standard', restricted: false, building: 'OGH', floor: 'Ground', beds: 2 },
  { id: '07', type: 'Standard', restricted: false, building: 'OGH', floor: 'Ground', beds: 2 },
  { id: '08', type: 'Standard', restricted: true, building: 'OGH', floor: 'Ground', beds: 2 },
  { id: '09', type: 'VIP', restricted: true, building: 'OGH', floor: 'Ground', beds: 2 },
  { id: '10', type: 'Standard', restricted: true, building: 'OGH', floor: 'Ground', beds: 2 },
  { id: '11', type: 'Standard', restricted: true, building: 'OGH', floor: 'Ground', beds: 2 },
  { id: '12', type: 'VIP', restricted: true, building: 'OGH', floor: 'Ground', beds: 2 },
  { id: '13', type: 'VVIP', restricted: true, building: 'OGH', floor: 'Ground', beds: 2, note: 'GM / Member / Minister' },
  { id: '14A', type: 'Semi-VIP', restricted: false, building: 'OGH', floor: 'First', beds: 2 },
  { id: '14B', type: '4-Bedded', restricted: false, building: 'OGH', floor: 'First', beds: 4 },
  { id: '15', type: '4-Bedded', restricted: false, building: 'OGH', floor: 'First', beds: 4 },
  { id: '16', type: 'Normal', restricted: false, building: 'OGH', floor: 'First', beds: 2 },
  { id: '17', type: 'Normal', restricted: false, building: 'OGH', floor: 'First', beds: 2 },
  { id: '18', type: 'Normal', restricted: false, building: 'OGH', floor: 'First', beds: 2 },
  { id: '19', type: '4-Bedded', restricted: false, building: 'OGH', floor: 'First', beds: 4 },
  { id: '20', type: 'Normal', restricted: false, building: 'OGH', floor: 'First', beds: 2 },
  { id: '21', type: 'Normal', restricted: false, building: 'OGH', floor: 'First', beds: 2 },
  { id: '22', type: 'Normal', restricted: false, building: 'OGH', floor: 'First', beds: 2 },
  { id: '23', type: '4-Bedded', restricted: false, building: 'OGH', floor: 'First', beds: 4 },
  { id: '24', type: '4-Bedded', restricted: false, building: 'OGH', floor: 'First', beds: 4 },
  { id: '25', type: 'VIP 4-Bedded', restricted: false, building: 'OGH', floor: 'First', beds: 4 },
  { id: '26', type: '4-Bedded', restricted: false, building: 'OGH', floor: 'First', beds: 4 },
  { id: '27', type: 'Standard', restricted: false, building: 'OGH', floor: 'First', beds: 2 },
  { id: '28', type: '4-Bedded', restricted: false, building: 'OGH', floor: 'First', beds: 4 },

  // ORH - 14 Rooms total
  { id: '101', type: '2-Bedded', restricted: false, building: 'ORH', floor: 'First', beds: 2, note: 'Buffer' },
  { id: '107', type: '4-Bedded', restricted: false, building: 'ORH', floor: 'First', beds: 4, note: 'Offline Transit' },
  { id: '108', type: '4-Bedded', restricted: false, building: 'ORH', floor: 'First', beds: 4, note: 'Offline Transit' },
  { id: '109', type: '4-Bedded', restricted: false, building: 'ORH', floor: 'First', beds: 4, note: 'Offline Transit' },
  { id: '110', type: '4-Bedded', restricted: false, building: 'ORH', floor: 'First', beds: 4, note: 'Offline Transit' },
  { id: '203', type: '4-Bedded', restricted: false, building: 'ORH', floor: 'Second', beds: 4, note: 'Buffer' },
  { id: 'T1', type: '2-Bedded', restricted: false, building: 'ORH', floor: 'Transit', beds: 2, note: 'Offline Transit' },
  { id: 'T2', type: '2-Bedded', restricted: false, building: 'ORH', floor: 'Transit', beds: 2, note: 'Offline Transit' },
  { id: 'T3', type: '2-Bedded', restricted: false, building: 'ORH', floor: 'Transit', beds: 2, note: 'Offline Transit' },
  { id: 'T4', type: '2-Bedded', restricted: false, building: 'ORH', floor: 'Transit', beds: 2, note: 'Offline Transit' },
  { id: 'T5', type: '2-Bedded', restricted: false, building: 'ORH', floor: 'Transit', beds: 2, note: 'Offline Transit' },
  { id: 'T6', type: '2-Bedded', restricted: false, building: 'ORH', floor: 'Transit', beds: 2, note: 'Offline Transit' },
  { id: 'T7', type: '2-Bedded', restricted: false, building: 'ORH', floor: 'Transit', beds: 2, note: 'Offline Transit' },
  { id: 'T8', type: '2-Bedded', restricted: false, building: 'ORH', floor: 'Transit', beds: 2, note: 'Offline Transit' }
];

// Generate default pay-level entitlement thresholds
export const DEFAULT_ROOM_CONFIGS = {};
INITIAL_ROOMS.forEach(r => {
  let level = 11; // Base default for ORH
  if (r.building === 'OGH') {
    level = 13; // Base default for OGH
    if (r.id === '13') level = 17; // VVIP
    else if (r.type.includes('VIP') && !r.type.includes('Semi')) level = 15;
    else if (r.type.includes('Semi-VIP')) level = 14;
  }
  DEFAULT_ROOM_CONFIGS[`${r.building}_${r.id}`] = level.toString();
});

export const STORAGE_KEYS = {
  DATA: 'blw_accomm_data_v5',
  CONFIG: 'blw_room_config',
  LOGIN: 'blw_logged_in',
  CRED: 'blw_credentials',
  THEME: 'blw_theme'
};

export const CATEGORIES = [
  { value: 'On Duty', label: 'On Duty (Official / सरकारी)', color: 'var(--cat-duty)' },
  { value: 'Private', label: 'Private (प्राइवेट)', color: 'var(--cat-private)' },
  { value: 'Guest', label: 'Guest (अतिथि)', color: 'var(--cat-guest)' },
  { value: 'Maintenance', label: 'Blocked for Maintenance', color: 'var(--blocked)' }
];
