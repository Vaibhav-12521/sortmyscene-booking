import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Spinner from './components/Spinner.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import EventsPage from './pages/EventsPage.jsx';

// Heavy, interactive pages are code-split so the initial bundle (login + events)
// stays small and loads fast. framer-motion only downloads with these chunks.
const EventDetailPage = lazy(() => import('./pages/EventDetailPage.jsx'));
const MyBookingsPage = lazy(() => import('./pages/MyBookingsPage.jsx'));
const CheckInPage = lazy(() => import('./pages/CheckInPage.jsx'));

export default function App() {
  return (
    <>
      <Navbar />
      <main className="main">
        <Suspense fallback={<Spinner label="Loading…" />}>
          <Routes>
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <EventsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/events/:id"
              element={
                <ProtectedRoute>
                  <EventDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/bookings"
              element={
                <ProtectedRoute>
                  <MyBookingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/checkin/:id"
              element={
                <ProtectedRoute>
                  <CheckInPage />
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
    </>
  );
}
