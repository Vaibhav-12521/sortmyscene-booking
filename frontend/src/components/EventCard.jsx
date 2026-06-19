import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { fadeUpItem } from '../animations/variants.js';
import { money } from '../utils/format.js';

const dateFmt = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export default function EventCard({ event }) {
  const navigate = useNavigate();
  const soldOut = event.availableSeats === 0;

  // Track the cursor to position the card's radial glow.
  const handleMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty('--my', `${e.clientY - rect.top}px`);
  };

  return (
    <motion.article
      variants={fadeUpItem}
      whileHover={{ y: -6 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className="card event-card"
      onMouseMove={handleMove}
      onClick={() => navigate(`/events/${event.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/events/${event.id}`)}
    >
      <div>
        <div className="event-card__accent" />
        <h3 className="event-card__title">{event.name}</h3>
        <p className="event-card__meta"><span>📍</span>{event.venue}</p>
        <p className="event-card__meta"><span>🗓</span>{dateFmt.format(new Date(event.startsAt))}</p>
        {event.description && <p className="event-card__desc">{event.description}</p>}
      </div>
      <div className="event-card__footer">
        <span className={`pill ${soldOut ? 'pill--danger' : 'pill--success'}`}>
          {soldOut ? 'Sold out' : `${event.availableSeats} / ${event.totalSeats} left`}
        </span>
        {event.priceFrom > 0 && (
          <span className="event-card__price">
            from <strong>{money(event.priceFrom, event.currency)}</strong>
          </span>
        )}
      </div>
      <span className="event-card__cta">Select seats →</span>
    </motion.article>
  );
}
