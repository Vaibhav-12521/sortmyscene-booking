import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { bookingApi } from '../api/endpoints.js';
import { toApiError } from '../api/client.js';
import Alert from '../components/Alert.jsx';
import Spinner from '../components/Spinner.jsx';
import TicketModal from '../components/TicketModal.jsx';

const dateFmt = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ticket, setTicket] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { bookings: data } = await bookingApi.mine();
        if (active) setBookings(data);
      } catch (err) {
        if (active) setError(toApiError(err).message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="page fade-in">
      <div className="page__header">
        <div>
          <span className="eyebrow">Your tickets</span>
          <h1 className="page__title">My bookings</h1>
          <p className="page__subtitle">Every seat you've confirmed.</p>
        </div>
        <Link to="/" className="backlink" style={{ marginBottom: 0 }}>
          <span className="backlink__icon" aria-hidden>←</span>
          Browse events
        </Link>
      </div>

      <Alert variant="error" onClose={() => setError('')}>{error}</Alert>

      {loading ? (
        <Spinner label="Loading your bookings…" />
      ) : bookings.length === 0 ? (
        <div className="empty">
          <p>You haven't booked any seats yet.</p>
          <Link to="/" className="btn btn--primary">Find an event</Link>
        </div>
      ) : (
        <div className="bookings">
          {bookings.map((b) => (
            <div key={b.id} className="card booking-item">
              <div className="booking-item__head">
                <h3>{b.event?.name || 'Event removed'}</h3>
                <span className={`pill ${b.checkedInAt ? 'pill--muted' : 'pill--success'}`}>
                  {b.checkedInAt ? 'Checked in' : `${b.seatNumbers.length} seat${b.seatNumbers.length === 1 ? '' : 's'}`}
                </span>
              </div>
              {b.event && (
                <p className="booking-item__meta">
                  📍 {b.event.venue} &nbsp;•&nbsp; 🗓 {dateFmt.format(new Date(b.event.startsAt))}
                </p>
              )}
              <div className="booking-item__seats">
                {b.seatNumbers.map((sn) => (
                  <span key={sn} className="chip">{sn}</span>
                ))}
              </div>
              <p className="booking-item__foot">
                Booked {dateFmt.format(new Date(b.createdAt))} · Ref {b.id.slice(-8)}
              </p>
              <button className="btn btn--primary btn--block" onClick={() => setTicket(b)}>
                🎟 Show ticket
              </button>
            </div>
          ))}
        </div>
      )}

      {ticket && <TicketModal booking={ticket} onClose={() => setTicket(null)} />}
    </div>
  );
}
