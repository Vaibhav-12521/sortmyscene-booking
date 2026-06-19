import { QRCodeSVG } from 'qrcode.react';

const dateFmt = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

export default function TicketModal({ booking, onClose }) {
  if (!booking) return null;

  // Scanning this QR opens the check-in page for gate staff.
  const verifyUrl = `${window.location.origin}/checkin/${booking.id}`;
  const used = Boolean(booking.checkedInAt);

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal__card ticket" onClick={(e) => e.stopPropagation()}>
        <button className="modal__close" onClick={onClose} aria-label="Close">×</button>

        <span className="eyebrow">E-ticket</span>
        <h2 className="ticket__title">{booking.event?.name || 'Event'}</h2>
        {booking.event && (
          <p className="ticket__meta">
            📍 {booking.event.venue}<br />
            🗓 {dateFmt.format(new Date(booking.event.startsAt))}
          </p>
        )}

        <div className={`ticket__qr ${used ? 'is-used' : ''}`}>
          <QRCodeSVG value={verifyUrl} size={188} level="M" includeMargin />
          {used && <span className="ticket__usedstamp">CHECKED IN</span>}
        </div>

        <div className="ticket__seats">
          {booking.seatNumbers.map((sn) => (
            <span key={sn} className="chip chip--solid">{sn}</span>
          ))}
        </div>

        <p className="ticket__ref">Ref {booking.id.slice(-8).toUpperCase()}</p>
        <p className="ticket__hint">
          {used
            ? `Checked in ${dateFmt.format(new Date(booking.checkedInAt))}`
            : 'Show this QR at the gate for entry.'}
        </p>
      </div>
    </div>
  );
}
