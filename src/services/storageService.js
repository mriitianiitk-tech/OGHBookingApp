import { STORAGE_KEYS, INITIAL_ROOMS, DEFAULT_ROOM_CONFIGS } from '../constants/initialRooms';

/**
 * Load initial rooms state from localStorage or defaults
 */
export function getInitialLocalRooms() {
  const baseRooms = INITIAL_ROOMS.map(r => ({ ...r, bookings: [] }));
  const savedData = localStorage.getItem(STORAGE_KEYS.DATA);
  if (savedData) {
    try {
      const parsed = JSON.parse(savedData);
      baseRooms.forEach(r => {
        const match = parsed.find(p => p.id === r.id && p.building === r.building);
        if (match && Array.isArray(match.bookings)) {
          r.bookings = match.bookings;
        }
      });
    } catch (e) {
      console.error('Error parsing local storage room data', e);
    }
  }
  return baseRooms;
}

/**
 * Save rooms state to localStorage
 */
export function saveLocalRooms(rooms) {
  try {
    localStorage.setItem(STORAGE_KEYS.DATA, JSON.stringify(rooms));
  } catch (e) {
    console.error('Error saving rooms to local storage', e);
  }
}

/**
 * Load room configuration (minimum pay levels)
 */
export function getStoredRoomConfigs() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (saved) {
      return { ...DEFAULT_ROOM_CONFIGS, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Error reading room configs', e);
  }
  return { ...DEFAULT_ROOM_CONFIGS };
}

/**
 * Save room configurations to local storage
 */
export function saveRoomConfigs(configs) {
  localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(configs));
}

/**
 * Export full CSV backup
 */
export function exportToCSV(rooms) {
  let csv = 'BookingID,Building,RoomID,Category,Name,Reference,Mobile,Place,FromWhere,CheckIn,CheckOut\n';
  rooms.forEach(r => {
    (r.bookings || []).forEach(b => {
      const clean = (val) => (val || '').toString().replace(/"/g, '""');
      csv += `"${b.id}","${r.building}","${r.id}","${b.category || ''}","${clean(b.name)}","${clean(b.reference)}","${clean(b.mobile)}","${clean(b.place)}","${clean(b.arrivalFrom)}","${b.checkIn}","${b.checkOut}"\n`;
    });
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `BLW_Accommodation_Backup_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Parse CSV Backup text into structured booking objects
 */
export function parseCSVBackup(csvText, currentRooms) {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length <= 1) return { success: false, message: 'CSV file is empty or missing data.' };

  // Skip header line
  const dataRows = lines.slice(1);
  const updatedRooms = currentRooms.map(r => ({ ...r, bookings: [] }));
  let importedCount = 0;

  dataRows.forEach(row => {
    // CSV parser handling quoted strings
    const cols = [];
    let inQuote = false;
    let val = '';
    for (let c of row) {
      if (c === '"') {
        inQuote = !inQuote;
      } else if (c === ',' && !inQuote) {
        cols.push(val.trim());
        val = '';
      } else {
        val += c;
      }
    }
    cols.push(val.trim());

    if (cols.length >= 9) {
      const id = cols[0].replace(/"/g, '');
      const building = cols[1].replace(/"/g, '');
      const roomId = cols[2].replace(/"/g, '');
      const category = cols[3].replace(/"/g, '');
      const name = cols[4].replace(/"/g, '');
      const reference = cols[5].replace(/"/g, '');
      const mobile = cols[6].replace(/"/g, '');
      const place = cols[7].replace(/"/g, '');

      let arrivalFrom = '';
      let checkIn = '';
      let checkOut = '';

      if (cols.length >= 11) {
        // New 11-column format
        arrivalFrom = cols[8].replace(/"/g, '');
        checkIn = cols[9].replace(/"/g, '');
        checkOut = cols[10].replace(/"/g, '');
      } else {
        // Legacy 10-column format
        arrivalFrom = '';
        checkIn = cols[8].replace(/"/g, '');
        checkOut = cols[9].replace(/"/g, '');
      }

      const room = updatedRooms.find(r => r.id === roomId && r.building === building);
      if (room && name) {
        room.bookings.push({
          id: id || `${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          roomId,
          building,
          category: category || 'On Duty',
          name,
          reference,
          mobile,
          place,
          arrivalFrom,
          checkIn,
          checkOut
        });
        importedCount++;
      }
    }
  });

  return { success: true, count: importedCount, rooms: updatedRooms };
}
