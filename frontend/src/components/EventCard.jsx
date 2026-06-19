import { useNavigate } from 'react-router-dom';
import { money } from '../utils/format.js';

export default function EventCard({ event }) {
  const navigate = useNavigate();
  const go = () => navigate(`/events/${event.id}`);

  const soldOut = event.availableSeats === 0;
  const pct = event.totalSeats ? Math.round((event.availableSeats / event.totalSeats) * 100) : 0;

  const d = new Date(event.startsAt);
  const month = d.toLocaleString('en-IN', { month: 'short' }).toUpperCase();
  const day = d.getDate();
  const time = d.toLocaleString('en-IN', { hour: 'numeric', minute: '2-digit' });

  return (
    <article
      className="card event-card"
      onClick={go}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && go()}
    >
      <div className="event-card__top">
        <div className="event-card__date">
          <span className="m">{month}</span>
          <span className="d">{day}</span>
        </div>
        <div className="event-card__head">
          <h3 className="event-card__title">{event.name}</h3>
          <p className="event-card__meta"><span>📍</span>{event.venue}</p>
          <p className="event-card__meta"><span>🕑</span>{time}</p>
        </div>
      </div>

      {event.description && <p className="event-card__desc">{event.description}</p>}

      <div className="event-card__avail">
        <div className="event-card__bar">
          <span style={{ width: `${pct}%` }} data-soldout={soldOut} />
        </div>
        <span className="event-card__availlabel">
          {soldOut ? 'Sold out' : `${event.availableSeats} of ${event.totalSeats} seats left`}
        </span>
      </div>

      <div className="event-card__footer">
        <span className="event-card__price">
          {event.priceFrom > 0 ? (
            <>from <strong>{money(event.priceFrom, event.currency)}</strong></>
          ) : (
            <strong>Free</strong>
          )}
        </span>
        <span className="event-card__cta">Select seats →</span>
      </div>
    </article>
  );
}
