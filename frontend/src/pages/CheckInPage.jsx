import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { bookingApi } from '../api/endpoints.js';
import { toApiError } from '../api/client.js';
import Spinner from '../components/Spinner.jsx';

const dateFmt = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

export default function CheckInPage() {
  const { id } = useParams();
  const [state, setState] = useState({ status: 'loading' });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await bookingApi.checkin(id);
        if (active) setState({ status: data.result, booking: data.booking });
      } catch (err) {
        if (active) setState({ status: 'error', message: toApiError(err).message });
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  if (state.status === 'loading') return <Spinner label="Verifying ticket…" />;

  const { booking } = state;
  const valid = state.status === 'valid';
  const already = state.status === 'already';
  const variant = valid ? 'ok' : already ? 'warn' : 'bad';

  return (
    <div className="page fade-in">
      <div className={`card checkin checkin--${variant}`}>
        <div className="checkin__icon">{valid ? '✓' : already ? '!' : '✕'}</div>
        <h1 className="checkin__title">
          {valid ? 'Valid ticket' : already ? 'Already checked in' : 'Invalid ticket'}
        </h1>

        {booking ? (
          <>
            <p className="checkin__event">{booking.event?.name}</p>
            {booking.event && (
              <p className="checkin__meta">
                📍 {booking.event.venue} · 🗓 {dateFmt.format(new Date(booking.event.startsAt))}
              </p>
            )}
            <div className="checkin__seats">
              {booking.seatNumbers.map((sn) => (
                <span key={sn} className="chip">{sn}</span>
              ))}
            </div>
            {already && booking.checkedInAt && (
              <p className="checkin__note">First checked in {dateFmt.format(new Date(booking.checkedInAt))}</p>
            )}
            <p className="checkin__ref">Ref {booking.id.slice(-8).toUpperCase()}</p>
          </>
        ) : (
          <p className="checkin__meta">{state.message || 'This ticket could not be found.'}</p>
        )}

        <Link to="/" className="btn btn--ghost btn--block">Back to events</Link>
      </div>
    </div>
  );
}
