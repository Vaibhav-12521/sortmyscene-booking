import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, RefreshControl,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { bookingApi, apiError, WEB_BASE } from '../api/client';
import { colors } from '../theme';

const dateFmt = (iso) => new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

export default function MyBookingsScreen() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ticket, setTicket] = useState(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const { bookings: data } = await bookingApi.mine();
      setBookings(data);
    } catch (e) {
      setError(apiError(e).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={colors.accent} size="large" /></View>;
  }

  return (
    <View style={styles.wrap}>
      {!!error && <Text style={styles.error}>{error}</Text>}
      <FlatList
        data={bookings}
        keyExtractor={(b) => b.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.accent} />}
        ListEmptyComponent={<Text style={styles.empty}>No bookings yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.head}>
              <Text style={styles.title} numberOfLines={1}>{item.event?.name || 'Event'}</Text>
              <Text style={[styles.badge, item.checkedInAt ? styles.badgeMuted : styles.badgeOk]}>
                {item.checkedInAt ? 'Checked in' : `${item.seatNumbers.length} seat${item.seatNumbers.length === 1 ? '' : 's'}`}
              </Text>
            </View>
            {item.event && <Text style={styles.meta}>📍 {item.event.venue} · {dateFmt(item.event.startsAt)}</Text>}
            <Text style={styles.seats}>{item.seatNumbers.join('  ')}</Text>
            <TouchableOpacity style={styles.btn} onPress={() => setTicket(item)}>
              <Text style={styles.btnText}>🎟  Show ticket</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <Modal visible={!!ticket} transparent animationType="fade" onRequestClose={() => setTicket(null)}>
        <View style={styles.modal}>
          <View style={styles.modalCard}>
            <TouchableOpacity style={styles.close} onPress={() => setTicket(null)}>
              <Text style={styles.closeText}>×</Text>
            </TouchableOpacity>
            {ticket && (
              <>
                <Text style={styles.tTitle}>{ticket.event?.name}</Text>
                {ticket.event && <Text style={styles.tMeta}>📍 {ticket.event.venue}</Text>}
                <View style={[styles.qrBox, ticket.checkedInAt && { opacity: 0.45 }]}>
                  <QRCode value={`${WEB_BASE}/checkin/${ticket.id}`} size={188} />
                </View>
                <Text style={styles.tSeats}>{ticket.seatNumbers.join('  ')}</Text>
                <Text style={styles.tRef}>Ref {ticket.id.slice(-8).toUpperCase()}</Text>
                <Text style={styles.tHint}>
                  {ticket.checkedInAt ? `Checked in ${dateFmt(ticket.checkedInAt)}` : 'Show this QR at the gate.'}
                </Text>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  card: { backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 14 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  title: { fontSize: 16, fontWeight: '700', color: colors.ink, flex: 1 },
  badge: { fontSize: 12, fontWeight: '700', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, overflow: 'hidden' },
  badgeOk: { backgroundColor: '#e6f1ea', color: colors.success },
  badgeMuted: { backgroundColor: colors.bg2, color: colors.textSoft },
  meta: { color: colors.textSoft, fontSize: 13, marginTop: 8 },
  seats: { color: colors.ink, fontWeight: '700', marginTop: 10, letterSpacing: 1 },
  btn: { backgroundColor: colors.accent, borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginTop: 14 },
  btnText: { color: '#fff', fontWeight: '700' },
  error: { backgroundColor: '#fbe9e7', color: colors.danger, padding: 12, margin: 16, borderRadius: 8 },
  empty: { textAlign: 'center', color: colors.textDim, marginTop: 40 },
  modal: { flex: 1, backgroundColor: 'rgba(24,18,14,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 24, width: '100%', maxWidth: 340, alignItems: 'center' },
  close: { position: 'absolute', top: 8, right: 14, padding: 6 },
  closeText: { fontSize: 26, color: colors.textDim },
  tTitle: { fontSize: 19, fontWeight: '800', color: colors.ink, textAlign: 'center', marginTop: 6 },
  tMeta: { color: colors.textSoft, marginTop: 4, marginBottom: 16, textAlign: 'center' },
  qrBox: { padding: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 12 },
  tSeats: { color: colors.ink, fontWeight: '700', marginTop: 16, letterSpacing: 1 },
  tRef: { color: colors.textDim, marginTop: 6, fontSize: 12 },
  tHint: { color: colors.textSoft, marginTop: 6, fontSize: 13, textAlign: 'center' },
});
