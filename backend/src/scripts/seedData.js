import { User } from '../models/User.js';
import { Event } from '../models/Event.js';
import { Seat, SEAT_STATUS, SEAT_TIER } from '../models/Seat.js';
import { Reservation } from '../models/Reservation.js';
import { Booking } from '../models/Booking.js';

const ROW_LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export const DEMO_USER = {
  name: 'Demo User',
  email: 'demo@sortmyscene.test',
  password: 'password123',
};

const EVENTS = [
  {
    name: 'Coldplay - Music of the Spheres',
    description: 'A dazzling live night under a sky of lights and lasers.',
    venue: 'DY Patil Stadium, Mumbai',
    daysFromNow: 14,
    rows: 6,
    columns: 10,
    prices: { vip: 12000, premium: 8000, standard: 4500 },
  },
  {
    name: 'Zakir Hussain - Tabla Ensemble',
    description: 'An intimate evening of classical percussion mastery.',
    venue: 'NCPA, Mumbai',
    daysFromNow: 21,
    rows: 5,
    columns: 8,
    prices: { vip: 5000, premium: 3000, standard: 1800 },
  },
  {
    name: 'Stand-Up Night with Zakir Khan',
    description: 'Sakht launda is back with all-new material.',
    venue: 'Phoenix Marketcity, Pune',
    daysFromNow: 7,
    rows: 4,
    columns: 9,
    prices: { vip: 3500, premium: 2200, standard: 1200 },
  },
];

function tierForRow(row, totalRows) {
  const vipCut = Math.max(1, Math.ceil(totalRows * 0.25));
  const premiumCut = Math.ceil(totalRows * 0.6);
  if (row <= vipCut) return SEAT_TIER.VIP;
  if (row <= premiumCut) return SEAT_TIER.PREMIUM;
  return SEAT_TIER.STANDARD;
}

function buildSeats(eventId, rows, columns, prices) {
  const seats = [];
  for (let r = 0; r < rows; r += 1) {
    const tier = tierForRow(r + 1, rows);
    for (let c = 1; c <= columns; c += 1) {
      seats.push({
        eventId,
        seatNumber: `${ROW_LABELS[r]}${c}`,
        row: r + 1,
        column: c,
        tier,
        price: prices[tier],
        status: SEAT_STATUS.AVAILABLE,
      });
    }
  }
  return seats;
}

export async function seedDatabase(log = () => {}) {
  log('Clearing existing data…');
  await Promise.all([
    Booking.deleteMany({}),
    Reservation.deleteMany({}),
    Seat.deleteMany({}),
    Event.deleteMany({}),
  ]);

  await User.deleteOne({ email: DEMO_USER.email });
  await User.create({
    name: DEMO_USER.name,
    email: DEMO_USER.email,
    passwordHash: await User.hashPassword(DEMO_USER.password),
  });
  log(`Created demo user: ${DEMO_USER.email} / ${DEMO_USER.password}`);

  const now = Date.now();
  const created = [];
  for (const def of EVENTS) {
    const totalSeats = def.rows * def.columns;

    const event = await Event.create({
      name: def.name,
      description: def.description,
      venue: def.venue,
      startsAt: new Date(now + def.daysFromNow * 24 * 60 * 60 * 1000),
      totalSeats,
      rows: def.rows,
      columns: def.columns,
      currency: 'INR',
    });

    await Seat.insertMany(buildSeats(event._id, def.rows, def.columns, def.prices));
    log(`Created event "${event.name}" with ${totalSeats} seats.`);
    created.push(event);
  }

  return created;
}
