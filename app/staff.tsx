import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '@/components/common/ThemeProvider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiGet } from '@/services/api';
import { LinearGradient } from 'expo-linear-gradient';
import { Users, FileText } from 'lucide-react-native';

interface StaffStat {
  staffId: string;
  name: string;
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
}

interface ReportItem {
  id: string;
  title: string;
  status: 'pending' | 'in-progress' | 'completed' | 'resolved';
}

export default function StaffScreen() {
  const { theme, isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [staffStats, setStaffStats] = useState<StaffStat[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<StaffStat | null>(null);
  const [staffReports, setStaffReports] = useState<ReportItem[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const statsResp = await apiGet('/users/staff-stats', token || undefined);
        setStaffStats(Array.isArray(statsResp?.stats) ? statsResp.stats : []);
      } catch (e) {
        setStaffStats([]);
        console.error('Load staff stats error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const loadReportsForStaff = async (staffId: string) => {
    setReportsLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const resp = await apiGet(`/reports?assignedTo=${encodeURIComponent(staffId)}`, token || undefined);
      const list = Array.isArray(resp?.reports) ? resp.reports : [];
      const normalized = list.map((r: any) => ({ id: r.id, title: r.title, status: r.status })) as ReportItem[];
      setStaffReports(normalized);
    } catch (e) {
      console.error('Load staff reports error:', e);
      setStaffReports([]);
    } finally {
      setReportsLoading(false);
    }
  };

  const selectStaff = (s: StaffStat) => {
    // Toggle: if clicking the same staff, collapse it
    if (selectedStaff?.staffId === s.staffId) {
      setSelectedStaff(null);
      setStaffReports([]);
    } else {
      setSelectedStaff(s);
      loadReportsForStaff(s.staffId);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: '#000000' }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading staff…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: '#000000' }]}
                contentContainerStyle={{ paddingBottom: 24 }}>
      {isDark ? (
        <LinearGradient
          colors={['#450A0A', '#7F1D1D']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { borderColor: 'rgba(255,100,100,0.2)', borderWidth: 1.5 }]}
        >
          <Text style={[styles.title, { color: '#FFFFFF' }]}>Staff</Text>
          <Text style={[styles.subtitle, { color: '#FECACA' }]}>Overview of staff and their assigned tasks</Text>
        </LinearGradient>
      ) : (
        <View style={[styles.header, { backgroundColor: '#27445D', borderWidth: 1, borderColor: '#27445D' }] }>
          <Text style={[styles.title, { color: '#FFFFFF' }]}>Staff</Text>
          <Text style={[styles.subtitle, { color: '#EAF2FF' }]}>Overview of staff and their assigned tasks</Text>
        </View>
      )}

      <View style={styles.listSection}>
        {staffStats.length === 0 ? (
          <View style={styles.centered}> 
            <Users size={40} color={isDark ? '#FFFFFF' : '#27445D'} />
            <Text style={{ marginTop: 8, color: theme.colors.textSecondary }}>No staff found.</Text>
          </View>
        ) : (
          staffStats.map((s) => (
            <TouchableOpacity key={s.staffId} style={[styles.staffCard, { borderColor: theme.colors.border, backgroundColor: isDark ? theme.colors.surface : theme.colors.surface }]}
                              onPress={() => selectStaff(s)}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={[styles.staffName, { color: theme.colors.text }]}>{s.name}</Text>
                <Text style={{ color: theme.colors.textSecondary }}>ID: {s.staffId}</Text>
              </View>
              <View style={styles.kpis}>
                <Text style={[styles.kpi, { color: theme.colors.textSecondary }]}>Total: {s.total}</Text>
                <Text style={[styles.kpi, { color: theme.colors.textSecondary }]}>Pending: {s.pending}</Text>
                <Text style={[styles.kpi, { color: theme.colors.textSecondary }]}>In-Progress: {s.inProgress}</Text>
                <Text style={[styles.kpi, { color: theme.colors.textSecondary }]}>Completed: {s.completed}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      {selectedStaff && (
        <View style={styles.reportsSection}>
          <View style={styles.reportsHeader}> 
            <FileText size={18} color={theme.colors.primary} />
            <Text style={[styles.reportsTitle, { color: theme.colors.text }]}>Assigned to {selectedStaff.name} ({selectedStaff.staffId})</Text>
          </View>
          {reportsLoading ? (
            <ActivityIndicator color={theme.colors.primary} />
          ) : staffReports.length === 0 ? (
            <Text style={{ color: theme.colors.textSecondary }}>No assigned reports.</Text>
          ) : staffReports.map(r => (
            <View key={r.id} style={[styles.reportRow, { borderColor: theme.colors.border }]}>
              <Text style={[styles.reportTitle, { color: theme.colors.text }]}>{r.title}</Text>
              <Text style={{ color: theme.colors.textSecondary }}>{(r.status === 'resolved' ? 'completed' : r.status).replace('-', ' ')}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { margin: 16, marginTop: 60, borderRadius: 16, padding: 16 },
  title: { fontSize: 24, fontWeight: '800' },
  subtitle: { marginTop: 6, fontSize: 14 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 40 },
  loadingText: { marginTop: 8, fontSize: 16 },
  listSection: { padding: 16, paddingTop: 0 },
  staffCard: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12 },
  staffName: { fontSize: 16, fontWeight: '700' },
  kpis: { flexDirection: 'row', gap: 12, marginTop: 6, flexWrap: 'wrap' },
  kpi: { fontSize: 12 },
  reportsSection: { paddingHorizontal: 16, paddingBottom: 16 },
  reportsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, marginBottom: 8 },
  reportsTitle: { fontSize: 16, fontWeight: '700' },
  reportRow: { borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 8 },
  reportTitle: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
});
