import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { eventApi } from '../api/endpoints.js';
import { toApiError } from '../api/client.js';
import EventCard from '../components/EventCard.jsx';
import Alert from '../components/Alert.jsx';
import Spinner from '../components/Spinner.jsx';
import { pageTransition, staggerContainer } from '../animations/variants.js';

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
    <motion.div className="page" {...pageTransition}>
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
        <Spinner label="Loading events…" />
      ) : events.length === 0 ? (
        <p className="empty">No events available right now.</p>
      ) : (
        <motion.div
          className="grid grid--cards"
          variants={staggerContainer}
          initial="hidden"
          animate="show"
        >
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
