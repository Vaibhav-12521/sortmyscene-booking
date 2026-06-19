import { useEffect, useState, useCallback } from 'react';
import { eventApi } from '../api/endpoints.js';
import { toApiError } from '../api/client.js';
import EventCard from '../components/EventCard.jsx';
import Alert from '../components/Alert.jsx';

function SkeletonCard() {
  return (
    <div className="card skel-card">
      <div className="skel-card__row">
        <div className="skel" style={{ width: 58, height: 58, flex: '0 0 auto' }} />
        <div style={{ flex: 1 }}>
          <div className="skel skel-line" style={{ width: '80%' }} />
          <div className="skel skel-line" style={{ width: '55%' }} />
          <div className="skel skel-line" style={{ width: '40%' }} />
        </div>
      </div>
      <div className="skel skel-line" style={{ width: '100%', marginTop: 18 }} />
      <div className="skel skel-line" style={{ width: '30%', marginTop: 18, height: 16 }} />
    </div>
  );
}

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { events: data } = await eventApi.list();
      setEvents(data);
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="page fade-in">
      <div className="page__header">
        <div>
          <span className="eyebrow">Now booking</span>
          <h1 className="page__title">
            Find your <span className="gradient-text">next night out</span>
          </h1>
          <p className="page__subtitle">Pick an event and choose your seats in seconds.</p>
        </div>
        <button className="btn btn--ghost" onClick={load} disabled={loading}>
          ↻ Refresh
        </button>
      </div>

      <Alert variant="error" onClose={() => setError('')}>{error}</Alert>

      {loading ? (
        <div className="grid grid--cards">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : events.length === 0 ? (
        <p className="empty">No events available right now.</p>
      ) : (
        <div className="grid grid--cards">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
