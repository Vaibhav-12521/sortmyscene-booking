# SortMyScene - Mobile (Expo / React Native)

A React Native companion app for SortMyScene, built with **Expo**. It reuses the same
backend API as the web app, so the JD's "MERN + React Native" stack is covered end to end.

## Features
- Email/password **auth** (JWT stored in AsyncStorage)
- Browse **events** with date, venue, availability and price
- **Seat selection** grid -> reserve (10-min hold with live countdown) -> confirm booking
- **My tickets** with a scannable **QR e-ticket** (opens the web check-in page at the gate)

## Run it

```bash
cd mobile
npm install
npx expo start
```

Then either:
- Press `a` / `i` for an Android emulator / iOS simulator, or
- Install **Expo Go** on your phone and scan the QR shown in the terminal.

By default the app talks to the **deployed backend**
(`https://sortmyscene-api.onrender.com/api`), so it works with zero local setup.
Log in with the demo account: `demo@sortmyscene.test` / `password123`.

## Point it at a local backend
Edit `API_BASE` in `src/api/client.js` to your machine's LAN IP (not `localhost`,
since the phone needs to reach your computer), e.g.:

```js
export const API_BASE = 'http://192.168.1.5:4000/api';
```

## Project structure
```
mobile/
├── App.js                 # navigation + auth gating
└── src/
    ├── api/client.js      # axios + endpoints (token via AsyncStorage)
    ├── context/AuthContext.js
    ├── screens/           # Login, Events, EventDetail, MyBookings
    └── theme.js           # shared palette + currency helper
```
