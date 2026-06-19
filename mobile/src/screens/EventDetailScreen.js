import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { eventApi, bookingApi, apiError } from '../api/client';
import { colors, money } from '../theme';

const PHASE = { SELECTING: 'selecting', RESERVED: 'reserved' };

function groupRows(seats) {
  const map = new Map();
  let maxCol = 0;
  for (const s of seats) {
    if (!map.has(s.row)) map.set(s.row, []);
    map.get(s.row).push(s);
    maxCol = Math.max(maxCol, s.column);
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([row, rs]) => [row, rs.sort((a, b) => a.column - b.column)]);
}

export default function EventDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const [event, setEvent] = useState(null);
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState(PHASE.SELECTING);
  const [selected, setSelected] = useState([]);
  const [reservation, setReservation] = useState(null);
  const [remaining, setRemaining] = useState(0);
  const [busy, setBusy] = useState(false);
  const timer = useRef(null);

  const currency = event?.currency || 'INR';
  const priceOf = (sn) => seats.find((s) => s.seatNumber === sn)?.price || 0;
  const total = selected.reduce((sum, sn) => sum + priceOf(sn), 0);

  const fetchEvent = useCallback(async () => {
    const data = await eventApi.get(id);
    setEvent(data.event);
    setSeats(data.seats);
    return data;
  }, [id]);

  useEffect(() => {
    (async () => {
      try {
        await fetchEvent();
      } catch (e) {
        Alert.alert('Error', apiError(e).message);
      } finally {
        setLoading(false);
      }
    })();
    return () => clearInterval(timer.current);
  }, [fetchEvent]);

  // Countdown while a reservation is held.
  useEffect(() => {
    clearInterval(timer.current);
    if (phase !== PHASE.RESERVED || !reservation) return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((new Date(reservation.expiresAt).getTime() - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) {
        clearInterval(timer.current);
        resetSelecting('Your hold expired - the seats were released.');
      }
    };
    tick();
    timer.current = setInterval(tick, 1000);
    return () => clearInterval(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, reservation]);

  const resetSelecting = (msg) => {
    setReservation(null);
    setSelected([]);
    setPhase(PHASE.SELECTING);
    if (msg) Alert.alert('Heads up', msg);
    fetchEvent().catch(() => {});
  };

  const toggle = (sn) => {
    setSelected((prev) => (prev.includes(sn) ? prev.filter((x) => x !== sn) : [...prev, sn]));
  };

  const reserve = async () => {
    setBusy(true);
    try {
      const data = await bookingApi.reserve(id, selected);
      setReservation(data.reservation);
      setPhase(PHASE.RESERVED);
    } catch (e) {
      const err = apiError(e);
      const taken = err.details?.seats;
      Alert.alert('Could not reserve', taken?.length ? `${err.message}: ${taken.join(', ')}` : err.message);
      fetchEvent().catch(() => {});
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    setBusy(true);
    try {
      await bookingApi.confirm(reservation.id);
      clearInterval(timer.current);
      Alert.alert('Booking confirmed', 'Your seats are booked. View the QR ticket under Tickets.', [
        { text: 'View tickets', onPress: () => navigation.navigate('Bookings') },
      ]);
      setReservation(null);
      setSelected([]);
      setPhase(PHASE.SELECTING);
      fetchEvent().catch(() => {});
    } catch (e) {
      Alert.alert('Could not confirm', apiError(e).message);
      resetSelecting();
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={colors.accent} size="large" /></View>;
  }
  if (!event) {
    return <View style={styles.center}><Text style={{ color: colors.textSoft }}>Event not found.</Text></View>;
  }

  const rows = groupRows(seats);
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');
  const interactive = phase === PHASE.SELECTING;

  return (
    <View style={styles.wrap}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
        <Text style={styles.venue}>📍 {event.venue}</Text>

        <View style={styles.legend}>
          {[['available', 'Available'], ['selected', 'Selected'], ['reserved', 'Reserved'], ['booked', 'Booked']].map(
            ([k, label]) => (
              <View key={k} style={styles.legendItem}>
                <View style={[styles.seat, styles.legendSwatch, seatStyle(k)]} />
                <Text style={styles.legendText}>{label}</Text>
              </View>
            )
          )}
        </View>

        <Text style={styles.stage}>STAGE</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View>
            {rows.map(([rowNum, rowSeats]) => (
              <View key={rowNum} style={styles.row}>
                <Text style={styles.rowLabel}>{rowSeats[0]?.seatNumber?.replace(/\d+$/, '')}</Text>
                {rowSeats.map((s) => {
                  const isSel = selected.includes(s.seatNumber);
                  const state = isSel ? 'selected' : s.status;
                  const canTap = interactive && (s.status === 'available' || isSel);
                  return (
                    <TouchableOpacity
                      key={s.seatNumber}
                      disabled={!canTap}
                      onPress={() => toggle(s.seatNumber)}
                      style={[styles.seat, seatStyle(state)]}
                    >
                      <Text style={[styles.seatText, (isSel || s.status === 'reserved') && { color: '#fff' }]}>
                        {s.column}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      </ScrollView>

      <View style={styles.panel}>
        {selected.length > 0 && (
          <Text style={styles.chips}>{[...selected].sort().join('  ')}</Text>
        )}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>{selected.length} seat{selected.length === 1 ? '' : 's'}</Text>
          <Text style={styles.totalVal}>{money(total, currency)}</Text>
        </View>

        {phase === PHASE.RESERVED && (
          <View style={styles.countdown}>
            <Text style={styles.countdownLabel}>HOLD EXPIRES IN</Text>
            <Text style={[styles.countdownClock, remaining < 60 && { color: colors.danger }]}>{mm}:{ss}</Text>
          </View>
        )}

        {interactive ? (
          <TouchableOpacity
            style={[styles.btn, (selected.length === 0 || busy) && styles.btnDisabled]}
            disabled={selected.length === 0 || busy}
            onPress={reserve}
          >
            <Text style={styles.btnText}>{busy ? 'Reserving…' : `Reserve ${selected.length || ''}`.trim()}</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity style={[styles.btn, styles.btnSuccess, busy && styles.btnDisabled]} disabled={busy} onPress={confirm}>
              <Text style={styles.btnText}>{busy ? 'Confirming…' : `Pay ${money(total, currency)} & confirm`}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnGhost} disabled={busy} onPress={() => resetSelecting()}>
              <Text style={styles.btnGhostText}>Cancel & release</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

function seatStyle(state) {
  switch (state) {
    case 'selected': return { backgroundColor: colors.accent, borderColor: colors.accent };
    case 'reserved': return { backgroundColor: colors.reserved, borderColor: colors.reserved };
    case 'booked': return { backgroundColor: colors.booked, borderColor: colors.border };
    default: return { backgroundColor: colors.surface, borderColor: colors.borderStrong };
  }
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  venue: { color: colors.textSoft, marginBottom: 14 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 18, height: 18, margin: 0 },
  legendText: { fontSize: 12, color: colors.textSoft },
  stage: {
    textAlign: 'center', color: colors.textDim, fontSize: 11, letterSpacing: 4,
    borderBottomWidth: 2, borderBottomColor: colors.borderStrong, paddingBottom: 8, marginBottom: 18,
    alignSelf: 'center', paddingHorizontal: 50,
  },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 7 },
  rowLabel: { width: 16, fontSize: 11, color: colors.textDim, fontWeight: '700', textAlign: 'center' },
  seat: {
    width: 30, height: 30, borderRadius: 7, borderWidth: 1.5, marginHorizontal: 3.5,
    alignItems: 'center', justifyContent: 'center',
  },
  seatText: { fontSize: 11, color: colors.textDim },
  panel: {
    backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border,
    padding: 16, paddingBottom: 24,
  },
  chips: { color: colors.ink, fontWeight: '700', marginBottom: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  totalLabel: { color: colors.textSoft },
  totalVal: { color: colors.accent, fontWeight: '800', fontSize: 18 },
  countdown: {
    backgroundColor: colors.reservedSoft, borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginBottom: 10,
  },
  countdownLabel: { fontSize: 11, color: colors.reserved, fontWeight: '700', letterSpacing: 1 },
  countdownClock: { fontSize: 26, fontWeight: '800', color: colors.reserved },
  btn: { backgroundColor: colors.accent, borderRadius: 10, paddingVertical: 15, alignItems: 'center' },
  btnSuccess: { backgroundColor: colors.success },
  btnDisabled: { opacity: 0.45 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  btnGhost: { paddingVertical: 13, alignItems: 'center', marginTop: 8 },
  btnGhostText: { color: colors.textSoft, fontWeight: '600' },
});
