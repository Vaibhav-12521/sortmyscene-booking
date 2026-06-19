import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { money, TIER_LABELS } from '../utils/format.js';

export default function SeatGrid({ seats, selected, onToggle, interactive, currency = 'INR' }) {
  const { rows, aisleAfter } = useMemo(() => {
    const grouped = new Map();
    let maxCol = 0;
    for (const seat of seats) {
      if (!grouped.has(seat.row)) grouped.set(seat.row, []);
      grouped.get(seat.row).push(seat);
      maxCol = Math.max(maxCol, seat.column);
    }
    const ordered = [...grouped.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([row, rowSeats]) => [row, rowSeats.sort((a, b) => a.column - b.column)]);
    return { rows: ordered, aisleAfter: Math.ceil(maxCol / 2) };
  }, [seats]);

  let lastTier = null;

  return (
    <div className="seatmap" role="group" aria-label="Seat selection">
      <div className="seatmap__stage">
        <span>STAGE</span>
      </div>

      <motion.div
        className="seatmap__grid"
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.006 } } }}
      >
        {rows.map(([rowNum, rowSeats]) => {
          const tier = rowSeats[0]?.tier || 'standard';
          const showHeader = tier !== lastTier;
          lastTier = tier;
          const rowLabel = rowSeats[0]?.seatNumber?.replace(/\d+$/, '') || rowNum;

          return (
            <div key={rowNum}>
              {showHeader && (
                <div className={`seatmap__tier seatmap__tier--${tier}`}>
                  <span className="seatmap__tier-dot" />
                  {TIER_LABELS[tier]}
                  <span className="seatmap__tier-price">
                    {money(rowSeats[0]?.price, currency)}
                  </span>
                </div>
              )}
              <div className="seatmap__row">
                <span className="seatmap__rowlabel">{rowLabel}</span>
                {rowSeats.map((seat) => {
                  const isSelected = selected.has(seat.seatNumber);
                  const isAvailable = seat.status === 'available';
                  const canClick = interactive && (isAvailable || isSelected);
                  const visualState = isSelected ? 'selected' : seat.status;
                  return (
                    <span key={seat.seatNumber} className="seatmap__cell">
                      <motion.button
                        type="button"
                        variants={{ hidden: { opacity: 0, scale: 0.4 }, show: { opacity: 1, scale: 1 } }}
                        whileTap={canClick ? { scale: 0.85 } : undefined}
                        className={`seat seat--${visualState} seat--tier-${seat.tier}`}
                        disabled={!canClick}
                        aria-pressed={isSelected}
                        aria-label={`Seat ${seat.seatNumber}, ${TIER_LABELS[seat.tier]} ${money(
                          seat.price,
                          currency
                        )} - ${isSelected ? 'selected' : seat.status}`}
                        title={`${seat.seatNumber} · ${TIER_LABELS[seat.tier]} · ${money(seat.price, currency)} (${seat.status})`}
                        onClick={() => canClick && onToggle(seat.seatNumber)}
                      >
                        {seat.column}
                      </motion.button>
                      {seat.column === aisleAfter && <span className="seatmap__aisle" />}
                    </span>
                  );
                })}
                <span className="seatmap__rowlabel">{rowLabel}</span>
              </div>
            </div>
          );
        })}
      </motion.div>
      <p className="seatmap__hint">Tap an available seat to select · prices per seat</p>
    </div>
  );
}
