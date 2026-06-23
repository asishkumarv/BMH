import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { Colors } from '../../../constants/Colors';
import axios from 'axios';
import { Bell, Check, CheckCircle2 } from 'lucide-react-native';

export default function SubAdminNotificationsScreen() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const subAdminUser = typeof window !== 'undefined' && localStorage.getItem('subAdminUser') 
    ? JSON.parse(localStorage.getItem('subAdminUser') || '{}') 
    : { id: 1 };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/notifications?user_type=department_admin&user_id=${subAdminUser.id}`);
      if (res.data.success) {
        setNotifications(res.data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await axios.put(`http://localhost:5000/notifications/${id}/read`);
      fetchNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.put(`http://localhost:5000/notifications/mark-all-read`, {
        user_type: 'department_admin',
        user_id: subAdminUser.id
      });
      fetchNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.subtitle}>Stay updated on your department tasks</Text>
        </View>
        {notifications.some(n => !n.is_read) && (
          <Pressable style={styles.markAllBtn} onPress={markAllAsRead}>
            <CheckCircle2 color={Colors.light.primary} size={18} />
            <Text style={styles.markAllText}>Mark all as read</Text>
          </Pressable>
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.light.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 32 }}>
          {notifications.length === 0 ? (
            <View style={styles.emptyState}>
              <Bell color={Colors.light.icon} size={48} />
              <Text style={styles.emptyText}>No notifications right now.</Text>
            </View>
          ) : (
            notifications.map(notif => (
              <View key={notif.id} style={[styles.card, !notif.is_read && styles.unreadCard]}>
                <View style={styles.cardContent}>
                  <Text style={[styles.message, !notif.is_read && styles.unreadMessage]}>{notif.message}</Text>
                  <Text style={styles.time}>{new Date(notif.created_at).toLocaleString()}</Text>
                </View>
                {!notif.is_read && (
                  <Pressable style={styles.readBtn} onPress={() => markAsRead(notif.id)}>
                    <Check color="#10B981" size={20} />
                  </Pressable>
                )}
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: { padding: 32, backgroundColor: Colors.light.card, borderBottomWidth: 1, borderBottomColor: Colors.light.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: Colors.light.text },
  subtitle: { fontSize: 14, color: Colors.light.icon, marginTop: 4 },
  markAllBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.light.secondary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, gap: 8 },
  markAllText: { color: Colors.light.primary, fontWeight: '700', fontSize: 14 },
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 80 },
  emptyText: { color: Colors.light.icon, fontSize: 16, marginTop: 16 },
  card: { flexDirection: 'row', backgroundColor: Colors.light.card, borderRadius: 16, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: Colors.light.border, alignItems: 'center' },
  unreadCard: { backgroundColor: Colors.light.secondary, borderColor: Colors.light.primary + '40' },
  cardContent: { flex: 1, paddingRight: 16 },
  message: { fontSize: 15, color: Colors.light.icon, lineHeight: 22, marginBottom: 8 },
  unreadMessage: { color: Colors.light.text, fontWeight: '600' },
  time: { fontSize: 13, color: Colors.light.icon },
  readBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#10B98120', alignItems: 'center', justifyContent: 'center' }
});
