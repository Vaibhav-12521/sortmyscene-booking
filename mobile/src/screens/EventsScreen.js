import { useEffect, useState, useCallback, useLayoutEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { eventApi, apiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { colors, money } from '../theme';

const dateFmt = (iso) =>
  new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

function EventRow({ event, onPress }) {
  const soldOut = event.availableSeats === 0;
  const d = new Date(event.startsAt);
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.cardTop}>
        <View style={styles.date}>
          <Text style={styles.dateM}>{d.toLocaleString('en-IN', { month: 'short' }).toUpperCase()}</Text>
          <Text style={styles.dateD}>{d.getDate()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={2}>{event.name}</Text>
          <Text style={styles.meta} numberOfLines={1}>📍 {event.venue}</Text>
          <Text style={styles.meta}>🕑 {d.toLocaleString('en-IN', { hour: 'numeric', minute: '2-digit' })}</Text>
        </View>
      </View>
      <View style={styles.cardFoot}>
        <Text style={[styles.pill, soldOut ? styles.pillBad : styles.pillOk]}>
          {soldOut ? 'Sold out' : `${event.availableSeats}/${event.totalSeats} left`}
        </Text>
        <Text style={styles.price}>
          {event.priceFrom > 0 ? `from ${money(event.priceFrom, event.currency)}` : 'Free'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function EventsScreen({ navigation }) {
  const { logout } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const { events: data } = await eventApi.list();
      setEvents(data);
    } catch (e) {
      setError(apiError(e).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={() => navigation.navigate('Bookings')} style={{ paddingHorizontal: 6 }}>
          <Text style={styles.headerLink}>Tickets</Text>
        </TouchableOpacity>
      ),
      headerLeft: () => (
        <TouchableOpacity onPress={logout} style={{ paddingHorizontal: 6 }}>
          <Text style={styles.headerLink}>Logout</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, logout]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={colors.accent} size="large" /></View>;
  }

  return (
    <View style={styles.wrap}>
      {!!error && <Text style={styles.error}>{error}</Text>}
      <FlatList
        data={events}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.accent} />}
        ListEmptyComponent={<Text style={styles.empty}>No events available.</Text>}
        renderItem={({ item }) => (
          <EventRow event={item} onPress={() => navigation.navigate('EventDetail', { id: item.id, name: item.name })} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  card: {
    backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 14,
  },
  cardTop: { flexDirection: 'row', gap: 14, padding: 16 },
  date: {
    width: 56, minHeight: 56, borderRadius: 10, backgroundColor: colors.accentSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  dateM: { fontSize: 11, fontWeight: '800', color: colors.accent, letterSpacing: 1 },
  dateD: { fontSize: 24, fontWeight: '800', color: colors.accentDark, lineHeight: 26 },
  title: { fontSize: 17, fontWeight: '700', color: colors.ink, marginBottom: 6 },
  meta: { color: colors.textSoft, fontSize: 13, marginTop: 2 },
  cardFoot: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 13, borderTopWidth: 1, borderTopColor: colors.border,
  },
  pill: { fontSize: 12, fontWeight: '700', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, overflow: 'hidden' },
  pillOk: { backgroundColor: '#e6f1ea', color: colors.success },
  pillBad: { backgroundColor: '#fbe9e7', color: colors.danger },
  price: { color: colors.ink, fontWeight: '700', fontSize: 14 },
  headerLink: { color: colors.accent, fontWeight: '700', fontSize: 15 },
  error: { backgroundColor: '#fbe9e7', color: colors.danger, padding: 12, margin: 16, borderRadius: 8 },
  empty: { textAlign: 'center', color: colors.textDim, marginTop: 40 },
});
