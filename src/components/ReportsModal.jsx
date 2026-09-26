import React, { useState } from 'react';
import { X, Printer, FileSpreadsheet, Calendar, Download, FileText } from 'lucide-react';
import { formatDateTimeDDMMYYYY, formatDateDDMMYYYY } from '../utils/dateUtils';

export default function ReportsModal({
  isOpen,
  onClose,
  rooms = [],
  currentBuilding = 'OGH'
}) {
  const [reportFrom, setReportFrom] = useState(() => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });

  const [reportTo, setReportTo] = useState(() => {
    const tmrw = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return new Date(tmrw.getTime() - tmrw.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });

  const [generatedData, setGeneratedData] = useState(null);

  if (!isOpen) return null;

  const handleGenerate = (e) => {
    e.preventDefault();
    const f = new Date(reportFrom);
    const t = new Date(reportTo);

    if (isNaN(f.getTime()) || isNaN(t.getTime()) || f >= t) {
      alert('Please select a valid From and To date/time interval.');
      return;
    }

    const reportRooms = rooms.filter(r => r.building === currentBuilding);
    const matchedRows = [];

    const catMap = {
      'On Duty': 'Official (सरकारी)',
      'Private': 'Private (प्राइवेट)',
      'Guest': 'Guest (अतिथि)',
      'Maintenance': 'Maintenance'
    };

    reportRooms.forEach(r => {
      (r.bookings || []).forEach(b => {
        const bIn = new Date(b.checkIn);
        const bOut = new Date(b.checkOut);

        if (bIn <= t && bOut >= f && b.category !== 'Maintenance') {
          let nameDesig = b.name;
          if (b.place) nameDesig += ` / ${b.place}`;

          matchedRows.push({
            roomId: `${r.building}-${r.id}`,
            roomType: r.type,
            nameDesig,
            reference: b.reference || '-',
            arrivalFrom: b.arrivalFrom || '-',
            mobile: b.mobile || '-',
            categoryStr: catMap[b.category] || b.category,
            checkInStr: formatDateTimeDDMMYYYY(bIn),
            checkOutStr: formatDateTimeDDMMYYYY(bOut)
          });
        }
      });
    });

    setGeneratedData({
      fromStr: formatDateTimeDDMMYYYY(f),
      toStr: formatDateTimeDDMMYYYY(t),
      building: currentBuilding,
      rows: matchedRows
    });
  };

  // Clean, official PDF Document Print Handler (no screenshot/modal overlay artifacts)
  const handlePrint = () => {
    if (!generatedData) return;

    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    document.body.appendChild(printFrame);

    const doc = printFrame.contentWindow.document;
    const rowsHtml = generatedData.rows.map((row, idx) => `
      <tr>
        <td style="text-align: center;">${idx + 1}</td>
        <td style="font-weight: bold; text-align: center;">${row.roomId}</td>
        <td>${row.roomType}</td>
        <td style="font-weight: bold;">${row.nameDesig}</td>
        <td>${row.reference}</td>
        <td>${row.arrivalFrom}</td>
        <td style="text-align: center;">${row.mobile}</td>
        <td>${row.categoryStr}</td>
        <td style="white-space: nowrap;">${row.checkInStr}</td>
        <td style="white-space: nowrap;">${row.checkOutStr}</td>
      </tr>
    `).join('');

    const emptyHtml = `
      <tr>
        <td colspan="10" style="text-align: center; padding: 24px; color: #666;">
          No bookings found for the selected time period.
        </td>
      </tr>
    `;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>BLW Accommodation Register - ${generatedData.building}</title>
          <style>
            @page {
              size: A4 landscape;
              margin: 12mm 10mm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              color: #111;
              margin: 0;
              padding: 0;
              font-size: 11px;
              line-height: 1.35;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #000;
              padding-bottom: 8px;
              margin-bottom: 12px;
            }
            .header h1 {
              margin: 0 0 4px;
              font-size: 16px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .header h2 {
              margin: 0 0 4px;
              font-size: 13px;
              color: #333;
            }
            .header .meta {
              font-size: 11px;
              font-weight: bold;
              margin-top: 4px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 16px;
            }
            th, td {
              border: 1px solid #333;
              padding: 6px 7px;
              font-size: 10px;
              vertical-align: top;
            }
            th {
              background-color: #f1f5f9;
              font-weight: bold;
              text-align: left;
            }
            tr:nth-child(even) td {
              background-color: #fafafa;
            }
            .footer-notes {
              font-size: 10px;
              color: #444;
              margin-top: 12px;
              border-top: 1px dashed #777;
              padding-top: 6px;
            }
            .signature-block {
              display: flex;
              justify-content: space-between;
              margin-top: 45px;
              font-size: 11px;
              font-weight: bold;
              padding: 0 20px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>बनारस रेल इंजन कारखाना / Banaras Locomotive Works</h1>
            <h2>${generatedData.building === 'OGH' ? "Officers' Guest House (अधिकारी अतिथि गृह)" : "Officers' Rest House (अधिकारी विश्राम गृह)"} Occupancy & Allotment Register</h2>
            <div class="meta">
              Report Period: ${generatedData.fromStr} to ${generatedData.toStr} &nbsp; | &nbsp; Generated: ${formatDateDDMMYYYY(new Date())} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 25px; text-align: center;">S.N.</th>
                <th style="width: 60px; text-align: center;">Room</th>
                <th style="width: 70px;">Type</th>
                <th>Name & Designation (नाम/पदनाम)</th>
                <th>Guest of / Ref</th>
                <th>From (कहॉं से)</th>
                <th style="width: 80px; text-align: center;">Mobile No.</th>
                <th style="width: 80px;">Category</th>
                <th style="width: 110px;">Check-In (कब से)</th>
                <th style="width: 110px;">Check-Out (कब तक)</th>
              </tr>
            </thead>
            <tbody>
              ${generatedData.rows.length === 0 ? emptyHtml : rowsHtml}
            </tbody>
          </table>

          <div class="footer-notes">
            <strong>टिप्‍पणी:-</strong> (1) निजी खाते से आरक्षण की राशि अग्रिम रूप से नगद जमा करें । &nbsp; (2) प्रशासनिक आवश्‍यकतानुसार आरक्षण निरस्‍त किया जा सकता है ।
          </div>

          <div class="signature-block">
            <div>हस्ताक्षर केयरटेकर / पर्यवेक्षक (Caretaker)</div>
            <div>हस्ताक्षर प्रभारी अधिकारी (In-Charge Officer / Allotment Authority)</div>
          </div>
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      printFrame.contentWindow.focus();
      printFrame.contentWindow.print();
      setTimeout(() => {
        document.body.removeChild(printFrame);
      }, 1500);
    }, 250);
  };

  // Export to Excel / CSV
  const handleExportCsv = () => {
    if (!generatedData || generatedData.rows.length === 0) {
      alert('No data rows to export.');
      return;
    }

    const headers = ['S.No', 'Room No', 'Room Type', 'Name & Designation', 'Guest of (Ref)', 'From (City)', 'Mobile', 'Category', 'Check In', 'Check Out'];
    const csvRows = [headers.join(',')];

    generatedData.rows.forEach((r, idx) => {
      const escape = (val) => `"${String(val || '').replace(/"/g, '""')}"`;
      csvRows.push([
        idx + 1,
        escape(r.roomId),
        escape(r.roomType),
        escape(r.nameDesig),
        escape(r.reference),
        escape(r.arrivalFrom),
        escape(r.mobile),
        escape(r.categoryStr),
        escape(r.checkInStr),
        escape(r.checkOutStr)
      ].join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `BLW_${generatedData.building}_Occupancy_Register_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            <FileSpreadsheet size={20} />
            <span>Generate Official Occupancy Register ({currentBuilding})</span>
          </h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {generatedData && (
              <>
                <button 
                  className="btn btn-primary btn-sm" 
                  onClick={handlePrint}
                  title="Print official document / Save as PDF"
                >
                  <Printer size={14} />
                  <span>Print / Save PDF</span>
                </button>
                <button 
                  className="btn btn-secondary btn-sm" 
                  onClick={handleExportCsv}
                  title="Export to Excel CSV"
                >
                  <Download size={14} />
                  <span>Export Excel</span>
                </button>
              </>
            )}
            <button className="btn-close" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Date Filter */}
        <form onSubmit={handleGenerate} style={{ background: 'var(--bg-subtle)', padding: 16, borderRadius: 'var(--radius-sm)', marginBottom: 20 }}>
          <div className="form-row" style={{ alignItems: 'flex-end' }}>
            <div className="form-group">
              <label>From Date & Time (कब से)</label>
              <input 
                type="datetime-local" 
                className="form-input" 
                required
                value={reportFrom}
                onChange={(e) => setReportFrom(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>To Date & Time (कब तक)</label>
              <input 
                type="datetime-local" 
                className="form-input" 
                required
                value={reportTo}
                onChange={(e) => setReportTo(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ flex: '0 0 auto' }}>
              <button type="submit" className="btn btn-primary" style={{ height: 42 }}>
                Generate Register
              </button>
            </div>
          </div>
        </form>

        {/* Report Preview */}
        {generatedData && (
          <div className="printable-report-wrapper" style={{ background: 'var(--bg-surface)', border: '1px solid var(--card-border)', borderRadius: 'var(--radius-sm)', padding: 18 }}>
            <div style={{ textAlign: 'center', marginBottom: 14 }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>बनारस रेल इंजन कारखाना / Banaras Locomotive Works</h3>
              <h4 style={{ fontSize: '0.95rem', color: 'var(--text-muted)' }}>
                {generatedData.building === 'OGH' ? "Officers' Guest House (अधिकारी अतिथि गृह)" : "Officers' Rest House (अधिकारी विश्राम गृह)"} Booking Register
              </h4>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Period: {generatedData.fromStr} to {generatedData.toStr} &nbsp;•&nbsp; Total Records: {generatedData.rows.length}
              </div>
            </div>

            <div style={{ overflowX: 'auto', marginBottom: 16 }}>
              <table className="report-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-subtle)' }}>
                    <th style={{ padding: 8, border: '1px solid var(--card-border)', width: 35, textAlign: 'center' }}>S.N.</th>
                    <th style={{ padding: 8, border: '1px solid var(--card-border)', width: 75, textAlign: 'center' }}>Room No.</th>
                    <th style={{ padding: 8, border: '1px solid var(--card-border)' }}>नाम/पदनाम (Name & Desig)</th>
                    <th style={{ padding: 8, border: '1px solid var(--card-border)' }}>Guest of (Ref)</th>
                    <th style={{ padding: 8, border: '1px solid var(--card-border)' }}>कहॉं से (From)</th>
                    <th style={{ padding: 8, border: '1px solid var(--card-border)' }}>Mobile No.</th>
                    <th style={{ padding: 8, border: '1px solid var(--card-border)' }}>श्रेणी (Category)</th>
                    <th style={{ padding: 8, border: '1px solid var(--card-border)' }}>कब से (Check In)</th>
                    <th style={{ padding: 8, border: '1px solid var(--card-border)' }}>कब तक (Check Out)</th>
                  </tr>
                </thead>
                <tbody>
                  {generatedData.rows.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ padding: 18, textAlign: 'center', color: 'var(--text-muted)' }}>
                        No bookings found for the selected time period.
                      </td>
                    </tr>
                  ) : (
                    generatedData.rows.map((row, idx) => (
                      <tr key={idx}>
                        <td style={{ padding: 8, border: '1px solid var(--card-border)', textAlign: 'center' }}>{idx + 1}</td>
                        <td style={{ padding: 8, border: '1px solid var(--card-border)', fontWeight: 700, textAlign: 'center' }}>{row.roomId}</td>
                        <td style={{ padding: 8, border: '1px solid var(--card-border)', fontWeight: 600 }}>{row.nameDesig}</td>
                        <td style={{ padding: 8, border: '1px solid var(--card-border)' }}>{row.reference}</td>
                        <td style={{ padding: 8, border: '1px solid var(--card-border)' }}>{row.arrivalFrom}</td>
                        <td style={{ padding: 8, border: '1px solid var(--card-border)' }}>{row.mobile}</td>
                        <td style={{ padding: 8, border: '1px solid var(--card-border)' }}>{row.categoryStr}</td>
                        <td style={{ padding: 8, border: '1px solid var(--card-border)', whiteSpace: 'nowrap' }}>{row.checkInStr}</td>
                        <td style={{ padding: 8, border: '1px solid var(--card-border)', whiteSpace: 'nowrap' }}>{row.checkOutStr}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Official Notice Notes */}
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', borderTop: '1px dashed var(--card-border)', paddingTop: 10 }}>
              <strong>टिप्‍पणी:-</strong><br />
              (1) निजी खाते से आरक्षण की राशि अग्रिम रूप से नगद जमा करें ।<br />
              (2) प्रशासनिक आवश्‍यकतानुसार आरक्षण निरस्‍त किया जा सकता है ।
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
