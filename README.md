# SortMyScene - Event Ticket Booking

[![CI](https://github.com/Vaibhav-12521/sortmyscene-booking/actions/workflows/ci.yml/badge.svg)](https://github.com/Vaibhav-12521/sortmyscene-booking/actions/workflows/ci.yml)

A simplified event ticket booking flow focused on **seat reservation** and **booking
confirmation**, built for the SortMyScene Full Stack Developer hiring task.

- **Backend:** Node.js + Express + MongoDB (Mongoose) + **Socket.IO** (real-time)
- **Frontend:** React (Vite) + React Router + Axios
- **Auth:** JWT (register / login)

The flow: browse events → pick seats on a modern, **tiered & priced** seat map →
**Reserve** (held for 10 minutes with a live countdown) → **Confirm booking** → success.
Double booking is prevented with atomic, conditional MongoDB updates, and the seat map
updates **live across all viewers** over WebSockets.

### Beyond the brief
On top of every requirement, this build adds: **real-time seat updates** (Socket.IO),
a **tiered, priced seat map** (VIP / Premium / Standard with a centre aisle), **QR-code
e-tickets with a gate check-in flow**, a **"My Bookings"** history page, a **concurrency
test suite** proving no double-booking, **GitHub Actions CI**, zero-setup **in-memory
MongoDB**, one-command **Docker Compose**, and an **Expo React Native companion app**.

---

## Live demo

**App:** https://sortmyscene-booking-three.vercel.app
**Login:** `demo@sortmyscene.test` / `password123`

> Tip: open it on two devices at once and reserve a seat on one - it updates live on the other.
> The backend is on Render's free tier, so the first request after it's been idle may take ~30-50s to wake.

Hosted as **Vercel** (frontend) + **Render** (backend) + **MongoDB Atlas** (DB), which keeps
real-time seats and the sweeper working. The repo ships a `render.yaml` blueprint and a
`frontend/vercel.json`. Full step-by-step: **[DEPLOYMENT.md](DEPLOYMENT.md)**.

---

## Quick start (Docker - one command)

```bash
docker compose up --build
# open http://localhost:8080   ·   demo@sortmyscene.test / password123
```

This starts MongoDB, the API (with realtime), and the web app, and seeds demo data on
first boot.

## Quick start (local, zero setup)

You do **not** need to install or run MongoDB to try this. If `MONGODB_URI` is not set,
the backend boots an **in-memory MongoDB** and **auto-seeds demo events** on startup.
(Data is ephemeral and resets on restart - see [Persistent DB](#using-a-persistent-database).)

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env      # optional - sensible defaults work out of the box
npm run dev               # http://localhost:4000
```

On boot you'll see it seed three demo events and a demo user:

```
demo@sortmyscene.test  /  password123
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev               # http://localhost:5173
```

Open **http://localhost:5173**, log in with the demo account (the login form is
pre-filled), pick an event, select seats, reserve, and confirm.

> The Vite dev server proxies `/api` → `http://localhost:4000`, so no CORS or extra
> config is needed locally.

---

## API

All booking actions require a `Authorization: Bearer <token>` header.

| Method | Endpoint            | Auth | Description                                            |
| ------ | ------------------- | ---- | ------------------------------------------------------ |
| POST   | `/api/auth/register`| -    | Create an account, returns `{ user, token }`           |
| POST   | `/api/auth/login`   | -    | Log in, returns `{ user, token }`                      |
| GET    | `/api/auth/me`      | ✓    | Current user                                           |
| GET    | `/api/events`       | -    | List events with live available-seat counts           |
| GET    | `/api/events/:id`   | -    | Single event + full seat map (expiry-aware statuses)   |
| POST   | `/api/reserve`      | ✓    | Hold seats for 10 min - `{ eventId, seatNumbers }`     |
| POST   | `/api/bookings`     | ✓    | Confirm a reservation - `{ reservationId }`            |
| GET    | `/api/bookings/me`  | ✓    | The current user's booking history                     |
| GET    | `/api/bookings/:id` | ✓    | Fetch a single booking (e-ticket)                      |
| POST   | `/api/bookings/:id/checkin` | ✓ | Validate / check in a ticket at the gate (QR scan) |

Error responses are consistent: `{ "error": { "message", "details?" } }`.
Conflicts (`409`) on reserve include the offending seats in `details.seats`.

**Realtime (Socket.IO):** clients `emit('event:join', eventId)` to join an event room
and receive `seats:changed` `{ eventId, seats: [{ seatNumber, status }] }` whenever seats
are reserved, booked, released, or expire - so every open seat map stays in sync without
polling.

---

## Data model (MongoDB)

- **Event** - `name`, `description`, `venue`, `startsAt`, `totalSeats`, `rows`, `columns`, `currency`
- **Seat** - `eventId`, `seatNumber`, `row`, `column`, `tier` (`vip`/`premium`/`standard`), `price`, `status` (`available` | `reserved` |
  `booked`), `reservedUntil`, `reservationId`
- **Reservation** - `userId`, `eventId`, `seatNumbers`, `expiresAt`, `status`
- **Booking** - `userId`, `eventId`, `seatNumbers`, `reservationId` (confirmation record)
- **User** - `name`, `email`, `passwordHash`

Each seat is its own document with a unique `(eventId, seatNumber)` index.

---

## Design decisions

### How double booking is prevented

Every seat is a separate document, and MongoDB guarantees that a **single-document
update is atomic**. We claim a seat with a *conditional* `findOneAndUpdate` that only
matches if the seat is still claimable:

```js
Seat.findOneAndUpdate(
  { eventId, seatNumber, $or: [
      { status: 'available' },
      { status: 'reserved', reservedUntil: { $lte: now } }, // expired hold
  ]},
  { $set: { status: 'reserved', reservedUntil, reservationId } },
  { new: true }
);
```

If two requests race for the same seat, **exactly one** update matches the predicate;
the other matches nothing. There is no read-then-write gap to exploit.

A reservation can span several seats, so we claim them one at a time and, if we don't
win them **all**, we **compensate** by releasing the ones we did win and return `409`
with the seats that were taken. This gives all-or-nothing semantics **without requiring
multi-document transactions**, so it runs on standalone MongoDB (and Atlas) alike.

Booking confirmation is guarded the same way: a seat is flipped `reserved → booked`
only if it still belongs to that reservation **and** the hold hasn't expired
(`reservedUntil > now`), so an expired reservation can never be booked.

### Real-time seat updates

The same service functions that mutate seats (reserve / book / release / sweep) emit a
`seats:changed` event to the event's Socket.IO room. The frontend merges those deltas
into its seat map instantly, so a seat another user grabs turns amber for everyone
without a refresh - and if it was in your selection while you were still choosing, it's
removed with a heads-up message. A 15s poll remains as a backstop if the socket drops.
The emitter no-ops when realtime isn't initialised, so the unit tests run unchanged.

### Seat tiers & pricing

Seats carry a `tier` and `price`, assigned at seed time by proximity to the stage
(front ~25% VIP, next ~35% Premium, rest Standard). The seat map renders tier section
headers, a centre aisle, and a live running total; bookings show the amount paid. This
is purely additive to the brief's data model.

### Reservation expiry (three layers)

1. **Lazy** - a `reserved` seat whose `reservedUntil` has passed is treated as available
   in availability reads and is re-claimable by the conditional update above.
2. **Sweeper** - a background job (every 30s) frees lapsed seats and marks lapsed
   reservations `expired`, covering downtime gaps.
3. **TTL index** - MongoDB auto-removes stale reservation documents as a backstop.

The frontend countdown calls the same release path when it hits `00:00`, and the API
still rejects an expired confirmation regardless of client behaviour.

### Other choices

- **Zod** for request validation (clear, structured `400`s) and a central error handler
  that translates Mongoose/duplicate-key errors into clean JSON.
- **JWT** stored client-side; an Axios interceptor attaches it and normalizes errors so
  UI code can rely on `{ status, message, details }`.
- **Component-based React** with hooks (`useState`/`useEffect`/`useCallback` + a custom
  `useCountdown`), an `AuthContext`, and `ProtectedRoute` for gated pages.
- **Live availability** - the seat map polls every 7s while selecting and prunes picks
  that someone else grabbed, plus surfaces `409` conflicts at reserve/book time
  (the "seat became unavailable between selection and booking" requirement).
- **`mongodb-memory-server`** so reviewers can run the whole stack with zero setup.

---

## Tests

The backend ships with an integration test suite (Jest + an in-memory MongoDB) that
proves the concurrency guarantees:

```bash
cd backend
npm test
```

Covered:

- reserve → confirm happy path,
- **12 concurrent reservations for one seat → exactly one wins**, eleven get `409`,
- multi-seat request is all-or-nothing (partial conflict reserves nothing),
- expired reservations cannot be booked and their seats are freed,
- the sweeper frees lapsed holds.

---

## Using a persistent database

Set `MONGODB_URI` in `backend/.env` to any MongoDB (local, Docker, or Atlas):

```env
MONGODB_URI=mongodb://localhost:27017/sortmyscene
```

Then seed it once:

```bash
cd backend
npm run seed
```

When `MONGODB_URI` is set, auto-seeding on boot is disabled and your data persists.
(Set `SEED_ON_START=true` to auto-seed a real DB on first boot only if it's empty - this
is what Docker Compose uses.)

---

## Configuration

**Backend** (`backend/.env`, see `.env.example`):

| Variable                  | Default                      | Purpose                                  |
| ------------------------- | ---------------------------- | ---------------------------------------- |
| `PORT`                    | `4000`                       | API port                                 |
| `MONGODB_URI`             | _(empty → in-memory)_        | MongoDB connection string                |
| `JWT_SECRET`              | `super-secret-change-me…`    | JWT signing secret (**change in prod**)  |
| `JWT_EXPIRES_IN`          | `7d`                         | Token lifetime                           |
| `RESERVATION_TTL_MINUTES` | `10`                         | How long a reservation is held           |
| `SEED_ON_START`           | `false`                      | Seed a real DB on boot if it's empty     |
| `CLIENT_ORIGIN`           | `http://localhost:5173`      | Allowed CORS / Socket.IO origin(s)       |

**Frontend** (`frontend/.env`, see `.env.example`):

| Variable            | Default  | Purpose                                              |
| ------------------- | -------- | ---------------------------------------------------- |
| `VITE_API_BASE_URL` | `/api`   | API base; `/api` uses the dev proxy to the backend   |
| `VITE_SOCKET_URL`   | _(empty)_| Socket.IO origin; blank = same-origin via dev proxy  |

---

## Assumptions

- A "user" is identified by a JWT; a reservation can only be confirmed by its owner.
- Seat layout (`rows × columns`, labels like `A1`, `B7`) is generated at seed time;
  `totalSeats = rows × columns`.
- Up to 10 seats may be reserved in a single request (configurable in the validator).
- The 10-minute hold is configurable via `RESERVATION_TTL_MINUTES`.
- Seat **tiers and prices** are assigned at seed time by row; payment is simulated (no
  real gateway) - confirming a booking is the "pay" step.
- The in-memory database is for local/demo/test convenience only; production should set
  `MONGODB_URI`.

---

## Project structure

```
SortMyScene/
├── docker-compose.yml     # mongo + api + web, one command
├── .github/workflows/     # CI: backend tests + frontend build on push
├── mobile/                # Expo React Native companion app (see mobile/README.md)
├── backend/
│   ├── Dockerfile
│   ├── src/
│   │   ├── config/        # env + DB connection (with in-memory fallback)
│   │   ├── models/        # User, Event, Seat, Reservation, Booking
│   │   ├── services/      # booking.service.js - atomic reserve/book/sweep + emits
│   │   ├── realtime/      # io.js - Socket.IO server + seat broadcasts
│   │   ├── controllers/   # thin HTTP handlers
│   │   ├── routes/        # /auth, /events, /reserve, /bookings
│   │   ├── middleware/    # auth, validation, error handling
│   │   ├── validators/    # Zod schemas
│   │   ├── scripts/       # seed CLI + shared seed data (tiers & pricing)
│   │   ├── app.js         # Express app wiring
│   │   └── server.js      # bootstrap + realtime + sweeper + graceful shutdown
│   └── tests/             # concurrency / expiry integration tests
└── frontend/
    ├── Dockerfile         # multi-stage build → nginx (proxies /api + /socket.io)
    └── src/
        ├── api/           # axios client, endpoints, socket.io client
        ├── context/       # AuthContext
        ├── hooks/         # useCountdown
        ├── utils/         # currency formatting
        ├── animations/    # framer-motion variants
        ├── components/    # SeatGrid (tiered), CountdownTimer, Confetti, Navbar, …
        ├── pages/         # Events, EventDetail (the flow), MyBookings, Login, Register
        └── styles/        # responsive stylesheet
```
