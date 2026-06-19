import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { eventApi, bookingApi } from '../api/endpoints.js';
import { toApiError } from '../api/client.js';
import { socket } from '../api/socket.js';
import { money } from '../utils/format.js';
import SeatGrid from '../components/SeatGrid.jsx';
import SeatLegend from '../components/SeatLegend.jsx';
import CountdownTimer from '../components/CountdownTimer.jsx';
import Confetti from '../components/Confetti.jsx';
import Alert from '../components/Alert.jsx';
import Spinner from '../components/Spinner.jsx';
import { pageTransition, scaleIn } from '../animations/variants.js';

const PHASE = { SELECTING: 'selecting', RESERVED: 'reserved', BOOKED: 'booked' };
const POLL_MS = 15000; // realtime is primary; polling is a backstop

const dateFmt = new Intl.DateTimeFormat('en-IN', { dateStyle: 'full', timeStyle: 'short' });

export default function EventDetailPage() {
  const { id } = useParams();

  const [event, setEvent] = useState(null);
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState(PHASE.SELECTING);
  const [selected, setSelected] = useState(() => new Set());
  const [reservation, setReservation] = useState(null);
  const [booking, setBooking] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [live, setLive] = useState(false);

  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const currency = event?.currency || 'INR';
  const priceBySeat = useMemo(() => new Map(seats.map((s) => [s.seatNumber, s.price])), [seats]);
  const availableCount = useMemo(
    () => seats.filter((s) => s.status === 'available').length,
    [seats]
  );

  // Drop selected seats that are no longer available (taken by someone else).
  const pruneSelection = useCallback((available) => {
    setSelected((prev) => {
      const next = new Set([...prev].filter((sn) => available.has(sn)));
      if (next.size !== prev.size) {
        setInfo('Some of your selected seats were just taken by someone else.');
      }
      return next;
    });
  }, []);

  const fetchEvent = useCallback(
    async ({ prune = false } = {}) => {
      const data = await eventApi.get(id);
      setEvent(data.event);
      setSeats(data.seats);
      if (prune) {
        pruneSelection(
          new Set(data.seats.filter((s) => s.status === 'available').map((s) => s.seatNumber))
        );
      }
      return data;
    },
    [id, pruneSelection]
  );

  // Initial load.
  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        await fetchEvent();
      } catch (err) {
        if (active) setError(toApiError(err).message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [fetchEvent]);

  // Realtime seat updates via Socket.IO.
  useEffect(() => {
    socket.connect();
    const onConnect = () => {
      setLive(true);
      socket.emit('event:join', id);
    };
    const onDisconnect = () => setLive(false);
    const onSeatsChanged = (payload) => {
      if (payload.eventId !== id) return;
      const changes = new Map(payload.seats.map((s) => [s.seatNumber, s.status]));
      setSeats((prev) =>
        prev.map((s) => (changes.has(s.seatNumber) ? { ...s, status: changes.get(s.seatNumber) } : s))
      );
      // Only prune the user's picks while they're still choosing.
      if (phaseRef.current === PHASE.SELECTING) {
        setSelected((prev) => {
          const next = new Set(
            [...prev].filter((sn) => !(changes.has(sn) && changes.get(sn) !== 'available'))
          );
          if (next.size !== prev.size) {
            setInfo('Some of your selected seats were just taken by someone else.');
          }
          return next;
        });
      }
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('seats:changed', onSeatsChanged);
    if (socket.connected) onConnect();

    return () => {
      socket.emit('event:leave', id);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('seats:changed', onSeatsChanged);
    };
  }, [id]);

  // Backstop polling in case the socket drops.
  useEffect(() => {
    const interval = setInterval(() => {
      if (phaseRef.current === PHASE.SELECTING) fetchEvent({ prune: true }).catch(() => {});
    }, POLL_MS);
    return () => clearInterval(interval);
  }, [fetchEvent]);

  const toggleSeat = (seatNumber) => {
    setInfo('');
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(seatNumber)) next.delete(seatNumber);
      else next.add(seatNumber);
      return next;
    });
  };

  const handleReserve = async () => {
    setError('');
    setInfo('');
    setBusy(true);
    try {
      const data = await bookingApi.reserve(id, [...selected]);
      setReservation(data.reservation);
      setPhase(PHASE.RESERVED);
    } catch (err) {
      const apiErr = toApiError(err);
      const taken = apiErr.details?.seats;
      setError(
        taken?.length
          ? `${apiErr.message}: ${taken.join(', ')}. Please choose different seats.`
          : apiErr.message
      );
      await fetchEvent({ prune: true }).catch(() => {});
    } finally {
      setBusy(false);
    }
  };

  const handleBook = async () => {
    setError('');
    setBusy(true);
    try {
      const data = await bookingApi.confirm(reservation.id);
      setBooking(data.booking);
      setPhase(PHASE.BOOKED);
      await fetchEvent().catch(() => {});
    } catch (err) {
      setError(toApiError(err).message);
      setReservation(null);
      setSelected(new Set());
      setPhase(PHASE.SELECTING);
      await fetchEvent({ prune: true }).catch(() => {});
    } finally {
      setBusy(false);
    }
  };

  const handleExpire = useCallback(() => {
    setReservation(null);
    setSelected(new Set());
    setPhase(PHASE.SELECTING);
    setInfo('Your reservation hold expired. The seats have been released — please select again.');
    fetchEvent({ prune: true }).catch(() => {});
  }, [fetchEvent]);

  const resetForNewBooking = () => {
    setBooking(null);
    setReservation(null);
    setSelected(new Set());
    setError('');
    setInfo('');
    setPhase(PHASE.SELECTING);
    fetchEvent().catch(() => {});
  };

  if (loading) return <Spinner label="Loading event…" />;
  if (!event) {
    return (
      <motion.div className="page" {...pageTransition}>
        <Alert variant="error">{error || 'Event not found.'}</Alert>
        <Link to="/" className="btn btn--ghost">← Back to events</Link>
      </motion.div>
    );
  }

  const selectedList = [...selected].sort();
  const totalPrice = selectedList.reduce((sum, sn) => sum + (priceBySeat.get(sn) || 0), 0);
  const bookingTotal = booking
    ? booking.seatNumbers.reduce((sum, sn) => sum + (priceBySeat.get(sn) || 0), 0)
    : 0;

  return (
    <motion.div className="page" {...pageTransition}>
      <Link to="/" className="backlink">← All events</Link>

      <div className="event-detail__header">
        <h1 className="page__title">{event.name}</h1>
        <p className="page__subtitle">
          📍 {event.venue} &nbsp;•&nbsp; 🗓 {dateFmt.format(new Date(event.startsAt))}
        </p>
        <p className="event-detail__avail">
          <span className="dot-live" data-on={live} />
          {availableCount} of {event.totalSeats} seats available
          <span className="event-detail__livetag">{live ? 'Live' : 'Reconnecting…'}</span>
        </p>
      </div>

      <Alert variant="error" onClose={() => setError('')}>{error}</Alert>
      <Alert variant="warning" onClose={() => setInfo('')}>{info}</Alert>

      <AnimatePresence mode="wait">
        {phase === PHASE.BOOKED ? (
          <motion.div key="confirm" variants={scaleIn} initial="hidden" animate="show" exit={{ opacity: 0 }}>
            <BookingConfirmation booking={booking} event={event} total={bookingTotal} currency={currency} onAgain={resetForNewBooking} />
          </motion.div>
        ) : (
          <motion.div key="booking" className="booking-layout" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <section className="booking-layout__seats card">
              <SeatLegend />
              <SeatGrid
                seats={seats}
                selected={selected}
                onToggle={toggleSeat}
                interactive={phase === PHASE.SELECTING}
                currency={currency}
              />
            </section>

            <aside className="booking-layout__panel card">
              <h2 className="panel__title">Your selection</h2>

              {selectedList.length === 0 ? (
                <p className="panel__empty">No seats selected yet. Tap available seats on the map.</p>
              ) : (
                <motion.ul className="chips" layout>
                  <AnimatePresence>
                    {selectedList.map((sn) => (
                      <motion.li
                        key={sn}
                        layout
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.6 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        className="chip"
                      >
                        {sn}
                        <span className="chip__price">{money(priceBySeat.get(sn), currency)}</span>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </motion.ul>
              )}

              <div className="panel__row">
                <span>Seats selected</span>
                <strong>{selectedList.length}</strong>
              </div>
              <div className="panel__row panel__row--total">
                <span>Total</span>
                <strong>{money(totalPrice, currency)}</strong>
              </div>

              <AnimatePresence>
                {phase === PHASE.RESERVED && reservation && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                    <CountdownTimer expiresAt={reservation.expiresAt} onExpire={handleExpire} />
                  </motion.div>
                )}
              </AnimatePresence>

              {phase === PHASE.SELECTING && (
                <button className="btn btn--primary btn--block" disabled={selectedList.length === 0 || busy} onClick={handleReserve}>
                  {busy ? 'Reserving…' : `Reserve ${selectedList.length || ''} seat${selectedList.length === 1 ? '' : 's'}`.trim()}
                </button>
              )}

              {phase === PHASE.RESERVED && (
                <>
                  <button className="btn btn--success btn--block" disabled={busy} onClick={handleBook}>
                    {busy ? 'Confirming…' : `✓ Pay ${money(totalPrice, currency)} & confirm`}
                  </button>
                  <button className="btn btn--ghost btn--block" disabled={busy} onClick={handleExpire}>
                    Cancel & release
                  </button>
                </>
              )}
            </aside>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function BookingConfirmation({ booking, event, total, currency, onAgain }) {
  const seatNumbers = booking?.seatNumbers ?? [];
  return (
    <div className="card confirmation">
      <Confetti />
      <div className="confirmation__check">✓</div>
      <h2>Booking confirmed!</h2>
      <p className="confirmation__sub">
        You're all set for <strong>{event?.name}</strong>.
      </p>
      <div className="confirmation__seats">
        {seatNumbers.map((sn, i) => (
          <motion.span key={sn} className="chip chip--solid" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.07 }}>
            {sn}
          </motion.span>
        ))}
      </div>
      <p className="confirmation__total">Total paid: <strong>{money(total, currency)}</strong></p>
      <p className="confirmation__ref">Booking reference: {booking.id}</p>
      <div className="confirmation__actions">
        <Link to="/bookings" className="btn btn--primary">View my bookings</Link>
        <button className="btn btn--ghost" onClick={onAgain}>Book more seats</button>
      </div>
    </div>
  );
}
