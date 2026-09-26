import React from 'react';
import { X, Printer, CheckCircle } from 'lucide-react';
import { formatDateDDMMYYYY, formatDateTimeDDMMYYYY } from '../utils/dateUtils';

export default function AllotmentSlipModal({
  isOpen,
  onClose,
  booking,
  room
}) {
  if (!isOpen || !booking || !room) return null;

  const handlePrint = () => {
    window.print();
  };

  const bIn = new Date(booking.checkIn);
  const bOut = new Date(booking.checkOut);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Allotment Slip / Confirmation</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={handlePrint}>
              <Printer size={14} />
              <span>Print Slip</span>
            </button>
            <button className="btn-close" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="printable-area" style={{ 
          background: 'var(--bg-surface)', 
          border: '2px solid var(--card-border)', 
          borderRadius: 'var(--radius-sm)', 
          padding: 24,
          fontFamily: 'serif'
        }}>
          <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: 10, marginBottom: 16 }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>BANARAS LOCOMOTIVE WORKS</h3>
            <h4 style={{ fontSize: '1rem', fontWeight: 600, margin: '4px 0' }}>बनारस रेल इंजन कारखाना, वाराणसी</h4>
            <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>
              {room.building === 'OGH' ? "OFFICERS' GUEST HOUSE (OGH)" : "OFFICERS' REST HOUSE (ORH)"} ALLOTMENT SLIP
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: '0.9rem', marginBottom: 20 }}>
            <div><strong>Slip Ref No:</strong> BLW/OGH/{booking.id.slice(-6)}</div>
            <div><strong>Date of Issue:</strong> {formatDateDDMMYYYY(new Date())}</div>
            <div><strong>Guest Name:</strong> {booking.name}</div>
            <div><strong>Designation:</strong> {booking.place || 'Railway Officer'}</div>
            <div><strong>Category:</strong> {booking.category}</div>
            <div><strong>Arrival From:</strong> {booking.arrivalFrom || 'N/A'}</div>
            <div><strong>Mobile No:</strong> {booking.mobile || 'N/A'}</div>
            <div><strong>Guest of (Ref):</strong> {booking.reference || 'N/A'}</div>
          </div>

          <div style={{ 
            background: 'var(--bg-subtle)', 
            border: '1px solid var(--card-border)', 
            padding: 14, 
            borderRadius: 'var(--radius-sm)', 
            marginBottom: 20,
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)' }}>
              ALLOTTED ROOM: {room.building} - {room.id} ({room.type})
            </div>
            <div style={{ fontSize: '0.88rem', marginTop: 4 }}>
              <strong>From:</strong> {formatDateTimeDDMMYYYY(bIn)} &nbsp; | &nbsp; <strong>To:</strong> {formatDateTimeDDMMYYYY(bOut)}
            </div>
          </div>

          <div style={{ fontSize: '0.78rem', lineHeight: 1.6, borderTop: '1px solid #ccc', paddingTop: 10 }}>
            <strong>Terms & Conditions:</strong><br />
            1. Allotment is provisional and subject to cancellation as per administrative requirements.<br />
            2. Tariff charges must be settled prior to departure at the reception counter.<br />
            3. Check-out time must be strictly adhered to for sanitization protocols.
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 36, fontSize: '0.85rem' }}>
            <div>Guest Signature</div>
            <div>Authorized Caretaker / In-Charge</div>
          </div>
        </div>
      </div>
    </div>
  );
}
