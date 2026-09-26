/**
 * Standard Indian Railways Date Formatter (DD/MM/YYYY)
 * Banaras Locomotive Works (BLW) Accommodation Management
 */

export function formatDateDDMMYYYY(dateInput, includeTime = false) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const dateStr = `${day}/${month}/${year}`;

  if (!includeTime) return dateStr;

  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${dateStr} ${hours}:${mins}`;
}

export function formatDateTimeDDMMYYYY(dateInput) {
  return formatDateDDMMYYYY(dateInput, true);
}

export function formatRangeDDMMYYYY(startInput, endInput, includeTime = true) {
  const startStr = formatDateDDMMYYYY(startInput, includeTime);
  const endStr = formatDateDDMMYYYY(endInput, includeTime);
  return `${startStr} → ${endStr}`;
}
