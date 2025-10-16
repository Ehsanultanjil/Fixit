import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, TextInput, ActivityIndicator, Alert, Modal, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/components/common/ThemeProvider';
import { useRouter } from 'expo-router';
import { User, MapPin, Clock, CheckCircle, Play, AlertTriangle, RefreshCw, ChevronDown } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Card } from '@/components/common/Card';
import { apiGet, apiPatch } from '@/services/api';

interface Report {
  id: string;
  title: string;
  description: string;
  location: { building: string; room: string };
  createdAt: any;
  updatedAt?: any;
  studentId: string;
  photo?: string;
  adminNotes?: string;
  assignedTo?: string;
  status: 'pending' | 'in-progress' | 'completed' | 'rejected';
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

interface StaffMember {
  staffId: string;
  name: string;
  profileImage?: string;
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
}

export function AdminReports() {
  const router = useRouter();
  const [allReports, setAllReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in-progress' | 'completed' | 'rejected'>('all');
  const { theme, isDark } = useTheme();
  const [assignIds, setAssignIds] = useState<Record<string, string>>({});
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState<Record<string, boolean>>({});
  const [dropdownPosition, setDropdownPosition] = useState<{ reportId: string; x: number; y: number; width: number } | null>(null);

  // Prompt for note when updating status
  const [noteVisible, setNoteVisible] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [pendingUpdate, setPendingUpdate] = useState<{
    id: string;
    status: 'pending' | 'in-progress' | 'completed' | 'rejected';
  } | null>(null);

  // Assignment with note
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [assignNote, setAssignNote] = useState('');
  const [pendingAssignment, setPendingAssignment] = useState<{ id: string; staffId: string } | null>(null);

  const reloadAllReports = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const resp = await apiGet('/reports', token || undefined);
      const items = ((resp.reports || []) as any[]).map((r: any) => ({
        ...r,
        status: r.status === 'resolved' ? 'completed' : (r.status || 'pending'),
      }));
      setAllReports(items as Report[]);
    } catch (e) {
      console.error('Error loading reports:', e);
      setAllReports([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await reloadAllReports();
    setRefreshing(false);
  };

  const loadStaffMembers = async () => {
    try {
      setStaffLoading(true);
      const token = await AsyncStorage.getItem('token');
      const resp = await apiGet('/users/staff-stats', token || undefined);
      setStaffMembers(resp.stats || []);
    } catch (e) {
      console.error('Error loading staff:', e);
      setStaffMembers([]);
    } finally {
      setStaffLoading(false);
    }
  };

  useEffect(() => {
    reloadAllReports();
    loadStaffMembers();
  }, []);

  const updateReportStatus = async (
    reportId: string,
    newStatus: 'pending' | 'in-progress' | 'completed' | 'rejected',
    note?: string
  ) => {
    try {
      const token = await AsyncStorage.getItem('token');
      await apiPatch(`/reports/${reportId}`, { status: newStatus, adminNotes: note || undefined }, token || undefined);
      setAllReports((prev) => prev.map((r) => (r.id === reportId ? { ...r, status: newStatus, adminNotes: note || r.adminNotes } : r)));
      Alert.alert('Success', `Report marked as ${newStatus}`);
    } catch (error) {
      console.error('Error updating report status:', error);
      Alert.alert('Error', 'Failed to update report status');
    }
  };

  const requestAssignment = (reportId: string) => {
    const staffId = (assignIds[reportId] || '').trim();
    if (!staffId) {
      Alert.alert('Assign', 'Please enter a Staff ID');
      return;
    }
    setPendingAssignment({ id: reportId, staffId });
    setAssignNote('');
    setAssignModalVisible(true);
  };

  const assignReportToStaff = async () => {
    if (!pendingAssignment) return;
    
    try {
      const { id, staffId } = pendingAssignment;
      const token = await AsyncStorage.getItem('token');
      await apiPatch(`/reports/${id}`, { 
        assignedTo: staffId, 
        adminNotes: assignNote.trim() || undefined 
      }, token || undefined);
      setAllReports(prev => prev.map(r => r.id === id ? { ...r, assignedTo: staffId } as any : r));
      // Clear input for this report to reflect applied change
      setAssignIds(prev => ({ ...prev, [id]: '' }));
      Alert.alert('Assigned', `Report assigned to Staff ID ${staffId}`);
      setAssignModalVisible(false);
      setPendingAssignment(null);
      setAssignNote('');
      // Ensure UI is in sync with server (and filters)
      await reloadAllReports();
    } catch (e) {
      console.error('Assign report error:', e);
      Alert.alert('Error', 'Failed to assign report');
    }
  };

  const renderStatusIcon = (status: 'pending' | 'in-progress' | 'completed' | 'rejected') => {
    switch (status) {
      case 'pending':
        return <Clock size={18} color="#FFFFFF" />;
      case 'in-progress':
        return <Play size={18} color="#FFFFFF" />;
      case 'completed':
        return <CheckCircle size={18} color="#FFFFFF" />;
      case 'rejected':
        return <AlertTriangle size={18} color="#FFFFFF" />;
      default:
        return <Clock size={18} color="#FFFFFF" />;
    }
  };

  const requestStatusChange = (reportId: string, newStatus: 'pending' | 'in-progress' | 'completed' | 'rejected') => {
    setPendingUpdate({ id: reportId, status: newStatus });
    setNoteText('');
    setNoteVisible(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return theme.colors.warning;
      case 'in-progress': return theme.colors.primary;
      case 'completed': return theme.colors.success;
      case 'rejected': return theme.colors.error;
      default: return theme.colors.textSecondary;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return theme.colors.success;
      case 'medium': return theme.colors.warning;
      case 'high': return theme.colors.error;
      case 'urgent': return theme.colors.error;
      default: return theme.colors.textSecondary;
    }
  };

  // Match campus-reports gradient shades for consistency
  const getCardGradient = (status?: string): [string, string] => {
    const v = (status || 'pending').toLowerCase();
    if (isDark) {
      switch (v) {
        case 'in-progress': return ['#7F1D1D', '#991B1B'];
        case 'completed': return ['#064E3B', '#065F46'];
        case 'rejected': return ['#7F1D1D', '#991B1B'];
        case 'pending':
        default:
          return ['#450A0A', '#7F1D1D'];
      }
    } else {
      switch (v) {
        case 'in-progress': return ['#DC2626', '#EF4444'];
        case 'completed': return ['#1F8F5A', '#065F46'];
        case 'rejected': return ['#DC2626', '#EF4444'];
        case 'pending':
        default:
          return ['#DC2626', '#EF4444'];
      }
    }
  };
  // Filter reports based on search query and status
  const filteredReports = allReports.filter(report => {
    // Status filter
    if (statusFilter !== 'all' && report.status !== statusFilter) {
      return false;
    }
    
    // Search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      return (
        report.title.toLowerCase().includes(searchLower) ||
        report.description.toLowerCase().includes(searchLower) ||
        report.location.building.toLowerCase().includes(searchLower) ||
        report.location.room.toLowerCase().includes(searchLower) ||
        report.studentId.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const formatDate = (val: any) => {
    const jsDate = val?.toDate ? val.toDate() : (typeof val === 'string' ? new Date(val) : new Date());
    return jsDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: '#000000' }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading reports...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: '#000000' }]}> 
      <LinearGradient
        colors={isDark ? ['#450A0A', '#7F1D1D'] : ['#27445D', '#27445D']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { borderBottomColor: isDark ? 'rgba(255,100,100,0.2)' : theme.colors.border, borderBottomWidth: 1.5 }]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={[styles.title, { color: '#FFFFFF' }]}>All Reports ({filteredReports.length})</Text>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TouchableOpacity onPress={() => router.push({ pathname: '/staff' })} style={[styles.staffOverviewBtn, { backgroundColor: '#10B981' }]}>
              <Text style={styles.addStaffText}>Staff Overview</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={onRefresh} 
              disabled={refreshing}
              style={{ padding: 8, backgroundColor: '#DC2626', borderRadius: 8 }}
            >
              <RefreshCw size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.filtersContainer}>
          <View style={styles.statusFilters}>
            {(['all', 'pending', 'in-progress', 'completed', 'rejected'] as const).map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.filterButton,
                  isDark
                    ? { backgroundColor: theme.colors.card, borderColor: theme.colors.border }
                    : { backgroundColor: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.25)' },
                  statusFilter === status && (isDark
                    ? { backgroundColor: '#DC2626', borderColor: '#DC2626' }
                    : { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary })
                ]}
                onPress={() => setStatusFilter(status)}
              >
                <Text style={[
                  styles.filterButtonText,
                  { color: isDark ? theme.colors.textSecondary : '#E0ECFF' },
                  statusFilter === status && { color: '#FFFFFF' }
                ]}>
                  {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <View style={styles.searchContainer}>
            <TextInput
              style={[
                styles.searchInput,
                isDark
                  ? { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }
                  : { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }
              ]}
              placeholder="Search reports..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={isDark ? theme.colors.textSecondary : theme.colors.textSecondary}
            />
          </View>
        </View>
      </LinearGradient>

      {filteredReports.length === 0 ? (
        <View style={styles.centered}>
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No reports found.</Text>
        </View>
        ) : (
          <ScrollView 
            style={[styles.reportsList]}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#DC2626" />
            }
          >
            {filteredReports.map((report) => (
              <TouchableOpacity
                key={report.id}
                activeOpacity={0.7}
                onPress={() => router.push({ pathname: '/reports/[id]', params: { id: report.id } })}
              >
                <LinearGradient
                  colors={getCardGradient(report.status)}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    styles.gradientCard, 
                    { 
                      borderColor: isDark ? 'rgba(255,255,255,0.15)' : theme.colors.border,
                      zIndex: dropdownOpen[report.id] ? 10000 : 1
                    }
                  ]}
                >
                  <View style={styles.titleRow}>
                    {renderStatusIcon(report.status)}
                    <Text style={[styles.reportTitle, { color: '#FFFFFF' }]}>{report.title}</Text>
                  </View>
                  <Text style={[styles.metaText, { marginTop: 4, color: 'rgba(255,255,255,0.9)' }]}>Student ID: {report.studentId || 'N/A'}</Text>

                  {/* Assign to staff (admin only), hidden for completed, rejected, or when already assigned */}
                  {report.status !== 'completed' && report.status !== 'rejected' && !report.assignedTo && (
                    <View style={[styles.assignRow, { borderColor: 'rgba(255,255,255,0.25)' }]}> 
                      <Text style={[styles.assignLabel, { color: 'rgba(255,255,255,0.95)' }]}>Assign to Staff</Text>
                      <View style={styles.assignControls}>
                        <View style={[styles.dropdownContainer, { borderColor: 'rgba(255,255,255,0.35)' }]}>
                          <TouchableOpacity 
                            style={styles.dropdownButton}
                            onPress={(event) => {
                              // Measure button position for modal dropdown
                              event.currentTarget.measure((x, y, width, height, pageX, pageY) => {
                                setDropdownPosition({
                                  reportId: report.id,
                                  x: pageX,
                                  y: pageY + height,
                                  width: width
                                });
                              });
                            }}
                          >
                            <Text style={[styles.dropdownText, { color: '#FFFFFF' }]}>
                              {assignIds[report.id] 
                                ? (() => {
                                    const staff = staffMembers.find(s => s.staffId === assignIds[report.id]);
                                    if (staff) {
                                      const runningTasks = staff.pending + staff.inProgress;
                                      return `${staff.name} (${staff.staffId}) - ${runningTasks} running`;
                                    }
                                    return assignIds[report.id];
                                  })()
                                : 'Select Staff Member'
                              }
                            </Text>
                            <ChevronDown 
                              size={16} 
                              color="rgba(255,255,255,0.7)" 
                              style={{ 
                                transform: [{ rotate: dropdownPosition?.reportId === report.id ? '180deg' : '0deg' }] 
                              }} 
                            />
                          </TouchableOpacity>
                        </View>
                        
                        <TouchableOpacity 
                          style={[
                            styles.assignBtn, 
                            { backgroundColor: assignIds[report.id] ? '#10B981' : '#6B7280' }
                          ]} 
                          onPress={() => requestAssignment(report.id)}
                          disabled={!assignIds[report.id]}
                        >
                          <Text style={styles.assignBtnText}>Assign</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                  {report.assignedTo ? (
                    <Text style={{ marginTop: 6, color: 'rgba(255,255,255,0.9)', fontSize: 12 }}>Currently assigned: {report.assignedTo}</Text>
                  ) : null}
                  
                  {/* Reject button for pending reports - only show if not assigned */}
                  {report.status === 'pending' && !report.assignedTo && (
                    <TouchableOpacity 
                      style={[styles.rejectBtn, { backgroundColor: '#DC2626', marginTop: 12 }]} 
                      onPress={() => requestStatusChange(report.id, 'rejected')}
                    >
                      <AlertTriangle size={16} color="#FFFFFF" />
                      <Text style={styles.rejectBtnText}>Reject Report</Text>
                    </TouchableOpacity>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

      {/* Note Prompt Modal */}
      <Modal
        visible={noteVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNoteVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}> 
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Add a note</Text>
            <Text style={[styles.modalMessage, { color: theme.colors.textSecondary }]}>Please provide a short note for this status change.</Text>
            <TextInput
              style={[
                styles.modalInput,
                { borderColor: theme.colors.border, color: theme.colors.text, backgroundColor: isDark ? theme.colors.card : 'rgba(0,0,0,0.03)' },
              ]}
              placeholder="Enter note (required)"
              placeholderTextColor={theme.colors.textSecondary}
              value={noteText}
              onChangeText={setNoteText}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => { setNoteVisible(false); setPendingUpdate(null); setNoteText(''); }}
                style={[styles.modalButton, { backgroundColor: isDark ? '#2A2A2E' : '#F1F5F9', borderColor: theme.colors.border }]}
              >
                <Text style={[styles.modalButtonText, { color: theme.colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={!noteText.trim() || !pendingUpdate}
                onPress={async () => {
                  if (pendingUpdate && noteText.trim()) {
                    const { id, status } = pendingUpdate;
                    await updateReportStatus(id, status, noteText.trim());
                    setNoteVisible(false);
                    setPendingUpdate(null);
                    setNoteText('');
                  }
                }}
                style={[styles.modalButton, { backgroundColor: '#DBEAFE', borderColor: '#93C5FD' }]}
              >
                <Text style={[styles.modalButtonText, { color: theme.colors.primary }]}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Assignment Note Modal */}
      <Modal
        visible={assignModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAssignModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}> 
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Add a note for staff</Text>
            <Text style={[styles.modalMessage, { color: theme.colors.textSecondary }]}>
              Provide instructions or details for the assigned staff member (optional).
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                { borderColor: theme.colors.border, color: theme.colors.text, backgroundColor: isDark ? theme.colors.card : 'rgba(0,0,0,0.03)' },
              ]}
              placeholder="Enter note (optional)"
              placeholderTextColor={theme.colors.textSecondary}
              value={assignNote}
              onChangeText={setAssignNote}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => { setAssignModalVisible(false); setPendingAssignment(null); setAssignNote(''); }}
                style={[styles.modalButton, { backgroundColor: isDark ? '#2A2A2E' : '#F1F5F9', borderColor: theme.colors.border }]}
              >
                <Text style={[styles.modalButtonText, { color: theme.colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={!pendingAssignment}
                onPress={assignReportToStaff}
                style={[styles.modalButton, { backgroundColor: '#10B981', borderColor: '#10B981' }]}
              >
                <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>Assign</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Staff Selection Modal Dropdown */}
      <Modal
        visible={dropdownPosition !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDropdownPosition(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setDropdownPosition(null)}
        >
          {dropdownPosition && (
            <View
              style={[
                styles.modalDropdown,
                {
                  position: 'absolute',
                  top: dropdownPosition.y,
                  left: dropdownPosition.x,
                  width: dropdownPosition.width,
                  backgroundColor: 'rgba(0,0,0,0.95)',
                }
              ]}
            >
              <ScrollView 
                style={styles.modalDropdownScroll}
                showsVerticalScrollIndicator={false}
              >
                {staffMembers.map((staff) => (
                  <TouchableOpacity
                    key={staff.staffId}
                    style={[styles.dropdownOption, { backgroundColor: 'rgba(255,255,255,0.1)' }]}
                    onPress={() => {
                      setAssignIds(prev => ({ ...prev, [dropdownPosition.reportId]: staff.staffId }));
                      setDropdownPosition(null);
                    }}
                  >
                    <View style={styles.staffOptionContainer}>
                      <View style={styles.staffImageContainer}>
                        {staff.profileImage ? (
                          <Image 
                            source={{ uri: staff.profileImage }} 
                            style={styles.staffImage}
                          />
                        ) : (
                          <View style={[styles.staffImagePlaceholder, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                            <User size={20} color="rgba(255,255,255,0.7)" />
                          </View>
                        )}
                      </View>
                      <View style={styles.staffInfo}>
                        <Text style={[styles.dropdownOptionText, { color: '#FFFFFF' }]}>
                          {staff.name} ({staff.staffId})
                        </Text>
                        <Text style={[styles.taskCountText, { color: 'rgba(255,255,255,0.8)' }]}>
                          {staff.pending + staff.inProgress} running ({staff.pending} pending, {staff.inProgress} active)
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </TouchableOpacity>
      </Modal>

      {noteVisible && (
        <TouchableOpacity
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          onPress={() => setNoteVisible(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    marginBottom: 12,
  },
  modalInput: {
    minHeight: 80,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  modalButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  filtersContainer: {
    gap: 16,
  },
  statusFilters: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    // Colors applied inline
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    // Color applied inline
  },
  searchContainer: {
    marginBottom: 16,
  },
  addStaffBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  staffOverviewBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addStaffText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  assignRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  assignLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  assignControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  assignInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  assignBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  assignBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  rejectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  rejectBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  addNoteBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  addNoteBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    // Colors applied inline
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 80,
    // Background applied inline when needed
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    // Color applied inline
  },
  emptyText: {
    fontSize: 18,
    textAlign: 'center',
    // Color applied inline
  },
  reportsList: {
    flex: 1,
    padding: 16,
  },
  reportCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    // Colors applied inline
  },
  gradientCard: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'visible',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  reportHeader: {
    marginBottom: 12,
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    // Color applied inline
  },
  reportMeta: {
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 14,
    // Color applied inline
  },
  reportContent: {
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
    // Color applied inline
  },
  reportImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  statusBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    // Background applied inline
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    // Background applied inline
  },
  priorityBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  reportFooter: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'transparent',
    paddingTop: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    // Background applied inline
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  adminNotesContainer: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    // Colors applied inline
  },
  adminNotesLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    // Color applied inline
  },
  adminNotes: {
    fontSize: 14,
    // Color applied inline
  },
  dropdownContainer: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    marginRight: 8,
    position: 'relative',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  dropdownText: {
    flex: 1,
    fontSize: 13,
  },
  dropdownOptions: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    maxHeight: 200,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 9999,
    marginTop: 2,
  },
  dropdownOption: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  dropdownOptionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  taskCountText: {
    fontSize: 11,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  modalDropdown: {
    maxHeight: 200,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  modalDropdownScroll: {
    maxHeight: 200,
  },
  staffOptionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  staffImageContainer: {
    marginRight: 12,
  },
  staffImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  staffImagePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  staffInfo: {
    flex: 1,
  },
});