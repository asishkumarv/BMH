import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform, TextInput, Pressable, Alert, Modal } from 'react-native';
import axios from 'axios';
import { ArrowUpDown, Calendar, Award, MapPin, TrendingUp, Clock, ShieldCheck, DollarSign, Star, AlertCircle, RefreshCw, User, Info } from 'lucide-react-native';
import { Colors } from '../../../constants/Colors';

const API_URL = 'https://napi.bharatmedicalhallplus.com';

// Color threshold helpers according to specifications
const getStatusColor = (val: number, type: 'success' | 'on_time' | 'rating') => {
  if (type === 'success') {
    if (val >= 98) return '#10B981'; // Green
    if (val >= 95) return '#F59E0B'; // Yellow
    return '#EF4444'; // Red
  }
  if (type === 'on_time') {
    if (val >= 95) return '#10B981';
    if (val >= 90) return '#F59E0B';
    return '#EF4444';
  }
  if (type === 'rating') {
    if (val >= 4.8) return '#10B981';
    if (val >= 4.5) return '#F59E0B';
    return '#EF4444';
  }
  return '#6B7280';
};

const getTrendLabel = (label: string, period: string) => {
  if (!label) return '';
  if (label.startsWith('Day ')) return label;
  if (isNaN(Number(label))) return label;
  if (period === 'monthly') {
    return `Day ${parseInt(label)}`;
  } else if (period === 'yearly') {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const idx = parseInt(label) - 1;
    return months[idx] || label;
  } else {
    return label;
  }
};

export default function AdminPerformance() {
  const [dashboardType, setDashboardType] = useState<'delivery' | 'doctor' | 'employee'>('delivery');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [riders, setRiders] = useState<any[]>([]);
  const [filterRiderId, setFilterRiderId] = useState('');
  const [filterPeriod, setFilterPeriod] = useState<'daily' | 'monthly' | 'yearly'>('monthly');
  const [filterValue, setFilterValue] = useState(''); // E.g., '2026-07'
  const [filterArea, setFilterArea] = useState('');
  const [filterShift, setFilterShift] = useState('');
  const [filterPaymentMode, setFilterPaymentMode] = useState('');
  const [areasList, setAreasList] = useState<string[]>([]);
  const [shiftsList, setShiftsList] = useState<string[]>([]);
  const [paymentModesList, setPaymentModesList] = useState<string[]>([]);
  const [tableSearch, setTableSearch] = useState('');
  const [tableType, setTableType] = useState('');
  const [tableStatus, setTableStatus] = useState('');
  const [areaExpanded, setAreaExpanded] = useState(false);
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [infoModalTitle, setInfoModalTitle] = useState('');
  const [infoModalMessage, setInfoModalMessage] = useState('');
  
  useEffect(() => {
    // Set initial filter value based on current month/date
    const today = new Date();
    const currentMonth = today.toISOString().substring(0, 7); // 'YYYY-MM'
    setFilterValue(currentMonth);
  }, []);

  const handleDashboardTypeChange = (type: 'delivery' | 'doctor' | 'employee') => {
    setDashboardType(type);
    setFilterRiderId('');
    setFilterArea('');
    setFilterShift('');
    setFilterPaymentMode('');
  };

  useEffect(() => {
    if (filterValue !== '') {
      fetchPerformanceData();
    }
  }, [dashboardType, filterRiderId, filterPeriod, filterValue, filterArea, filterShift, filterPaymentMode]);

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      let queryParams = [];
      
      if (dashboardType === 'doctor') {
        queryParams.push('type=doctor');
        if (filterRiderId) queryParams.push(`doctor_id=${filterRiderId}`);
        if (filterArea) queryParams.push(`department=${encodeURIComponent(filterArea)}`);
      } else if (dashboardType === 'employee') {
        queryParams.push('type=employee');
        if (filterRiderId) queryParams.push(`employee_id=${filterRiderId}`);
        if (filterArea) queryParams.push(`department=${encodeURIComponent(filterArea)}`);
      } else {
        if (filterRiderId) queryParams.push(`delivery_boy_id=${filterRiderId}`);
        if (filterArea) queryParams.push(`area=${encodeURIComponent(filterArea)}`);
        if (filterShift) queryParams.push(`shift=${encodeURIComponent(filterShift)}`);
      }
      if (filterPaymentMode) queryParams.push(`payment_mode=${encodeURIComponent(filterPaymentMode)}`);
      
      if (filterPeriod === 'daily') {
        queryParams.push(`date=${filterValue}`);
      } else if (filterPeriod === 'monthly') {
        queryParams.push(`month=${filterValue}`);
      } else if (filterPeriod === 'yearly') {
        queryParams.push(`year=${filterValue}`);
      }

      const url = `${API_URL}/performance/admin-stats?${queryParams.join('&')}`;
      const res = await axios.get(url);
      if (res.data && res.data.success) {
        if (dashboardType === 'doctor') {
          setStats(res.data.data);
          setRiders(res.data.data.doctorsList || []);
          if (res.data.data.filters) {
            if (res.data.data.filters.departments) setAreasList(res.data.data.filters.departments);
            setShiftsList([]);
            if (res.data.data.filters.paymentModes) setPaymentModesList(res.data.data.filters.paymentModes);
          }
        } else if (dashboardType === 'employee') {
          setStats(res.data);
          setRiders(res.data.employees || []);
          if (res.data.employees) {
            const depts = [...new Set(res.data.employees.map((e: any) => e.department).filter(Boolean))] as string[];
            setAreasList(depts);
          }
          setShiftsList([]);
          setPaymentModesList([]);
        } else {
          setStats(res.data.executiveDashboard);
          setRiders(res.data.riders || []);
          if (res.data.executiveDashboard) {
            if (res.data.executiveDashboard.uniqueAreas) setAreasList(res.data.executiveDashboard.uniqueAreas);
            if (res.data.executiveDashboard.uniqueShifts) setShiftsList(res.data.executiveDashboard.uniqueShifts);
            if (res.data.executiveDashboard.uniquePaymentModes) setPaymentModesList(res.data.executiveDashboard.uniquePaymentModes);
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setFilterRiderId('');
    setFilterPeriod('monthly');
    const currentMonth = new Date().toISOString().substring(0, 7);
    setFilterValue(currentMonth);
    setFilterArea('');
    setFilterShift('');
    setFilterPaymentMode('');
    setTableSearch('');
    setTableType('');
    setTableStatus('');
  };

  const showInfoAlert = (type: string) => {
    let title = '';
    let message = '';
    
    if (dashboardType === 'doctor') {
      if (type === 'kpis') {
        title = 'Doctor KPIs Calculation';
        message = '• Consultations Completed %:\nCalculated as (Completed Consultations / Total Bookings) × 100\n\n' +
                  '• Total Bookings:\nTotal patient tokens booked in slots (excluding cancelled)\n\n' +
                  '• Completed Consultations:\nTokens marked as Consulted or Completed\n\n' +
                  '• Cancelled Bookings:\nCancelled patient tokens\n\n' +
                  '• Total Revenue:\nTotal slot consultation fees collected (excluding cancelled tokens)\n\n' +
                  '• Doctors Share:\nTotal commission payout earned by doctors (Fee × Fee Share %)\n\n' +
                  '• BMH Net Share:\nTotal commission kept by BMH (Fee × (1 - Fee Share %))';
      } else if (type === 'financial') {
        title = 'Doctor Payout Definitions';
        message = '• Total Billing Value:\nTotal consultation billing value of active slots\n\n' +
                  '• Cash Collected (Counter):\nConsultation fees collected in cash at the counter\n\n' +
                  '• Online Received:\nConsultation fees received online/pre-paid';
      } else if (type === 'area' || type === 'dept') {
        title = 'Department Performance Breakdown';
        message = '• Specialization Department:\nStatistics summarized by medical departments (e.g. Cardiology, Pediatrics)\n\n' +
                  '• Total Bookings:\nTotal token booking load per department\n\n' +
                  '• Revenue:\nSum of consultation fee revenue per department\n\n' +
                  '• Pending Tokens:\nActive patient tokens awaiting consultation';
      } else if (type === 'trends') {
        title = 'Doctor Trends & Peak Hours';
        message = '• Bookings & Revenue Trend:\nShows daily, monthly, or yearly distribution of token bookings and consultation revenue\n\n' +
                  '• Peak Booking Hours:\nHour of day distribution (0-23) based on slot start times. Helps track peak consulting hours';
      }
    } else if (dashboardType === 'employee') {
      if (type === 'kpis') {
        title = 'Employee KPIs Calculation';
        message = '• Task Completion Rate:\nCalculated as (Completed Tasks / Total Assigned Tasks) × 100\n\n' +
                  '• Total Tasks:\nTotal normal and recurring tasks assigned to the employee\n\n' +
                  '• Completed Tasks:\nTasks successfully completed by the employee\n\n' +
                  '• Hours Worked:\nAccumulated check-in to check-out session hours from attendance logs\n\n' +
                  '• Patient Bookings:\nTokens booked by the employee (if they perform booking operations)\n\n' +
                  '• Booking Revenue:\nTotal booking fee payments collected by the employee';
      }
    } else {
      if (type === 'kpis') {
        title = 'Overview KPIs Calculation';
        message = '• Deliveries Success %:\nCalculated as (Delivered Orders / Total Assigned Orders) × 100\n\n' +
                  '• On-Time Delivery %:\nCalculated as (Delivered orders completed ≤ 45 mins / Total Delivered Orders) × 100\n\n' +
                  '• Average Delivery Cycle:\nAverage duration in minutes from rider "Picked Up" to "Delivered" timestamp\n\n' +
                  '• Distance Covered:\nTotal Haversine straight-line aerial distance from the department store coordinates to customer destinations\n\n' +
                  '• Total Revenue:\nTotal payments collected (COD Cash + Online payments combined) from successfully delivered orders\n\n' +
                  '• Total Delivery Charges:\nBilled delivery charges for manual/custom deliveries';
      } else if (type === 'financial') {
        title = 'Financial Breakdown Definitions';
        message = '• Total Order Value:\nSum of all assigned orders (COD + Online + Pending Collection)\n\n' +
                  '• COD Collected:\nCash payment collections brought back by delivery boys\n\n' +
                  '• Online Payments:\nPre-paid or digital payments received for orders\n\n' +
                  '• Pending Cash:\nCash collections expected for orders currently in transit (not yet delivered)\n\n' +
                  '• Bus Parcel Shipments:\nCount and value of parcels dispatched via third-party Bus carriers\n\n' +
                  '• Scheduled Deliveries:\nScheduled local orders set to be processed later';
      } else if (type === 'area') {
        title = 'Area Performance Breakdown';
        message = '• Area Names:\nNeighborhood parsing heuristics from customer delivery addresses\n\n' +
                  '• Orders Billed:\nTotal orders dispatched to each neighborhood area\n\n' +
                  '• Revenue Generated:\nSum of completed/delivered sales in the area\n\n' +
                  '• Pending Orders:\nActive transit orders in the area';
      } else if (type === 'trends') {
        title = 'Operations Trends & Peak Hours';
        message = '• Orders & Revenue Trend:\nShows chronological transaction volume distribution (daily, monthly, or yearly) and revenue to evaluate system throughput\n\n' +
                  '• Peak Delivery Hours:\nHour of day distribution (0-23) based on order assignment times. Helps identify high-traffic intervals and adjust shift timings';
      }
    }
    
    setInfoModalTitle(title);
    setInfoModalMessage(message);
    setInfoModalVisible(true);
  };

  if (loading && !stats) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <Text style={styles.loadingText}>Compiling Performance Analytics...</Text>
      </View>
    );
  }

  const executive = stats || {};

  const isDoctorMode = dashboardType === 'doctor';

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24 }} showsVerticalScrollIndicator={false}>
      {/* Dashboard Toggle Segment */}
      <View style={styles.toggleTabContainer}>
        <TouchableOpacity
          style={[styles.toggleTabButton, dashboardType === 'delivery' && styles.toggleTabButtonActive]}
          onPress={() => handleDashboardTypeChange('delivery')}
        >
          <Text style={[styles.toggleTabButtonText, dashboardType === 'delivery' && styles.toggleTabButtonActiveText]}>
            Delivery Boys
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleTabButton, dashboardType === 'doctor' && styles.toggleTabButtonActive]}
          onPress={() => handleDashboardTypeChange('doctor')}
        >
          <Text style={[styles.toggleTabButtonText, dashboardType === 'doctor' && styles.toggleTabButtonActiveText]}>
            Doctors
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleTabButton, dashboardType === 'employee' && styles.toggleTabButtonActive]}
          onPress={() => handleDashboardTypeChange('employee')}
        >
          <Text style={[styles.toggleTabButtonText, dashboardType === 'employee' && styles.toggleTabButtonActiveText]}>
            Employees
          </Text>
        </TouchableOpacity>
      </View>

      {/* Page Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>
            {dashboardType === 'doctor' ? 'Doctors Performance KPI & KRI Dashboard' :
             dashboardType === 'employee' ? 'Employees Performance KPI & KRI Dashboard' : 'Delivery Performance KPI & KRI  Dashboard'}
          </Text>
          <Text style={styles.subtitle}>
            {dashboardType === 'doctor' ? 'Measure booking loads, consultant payouts, and department statistics' :
             dashboardType === 'employee' ? 'Measure task completion times, attendance hours, and patient bookings' :
             'Measure productivity, quality, and service levels of delivery executives'}
          </Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchPerformanceData}>
          <RefreshCw size={18} color="#fff" />
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Section */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Reporting Filters</Text>
        <View style={styles.filtersRow}>
          <View style={[styles.filterGroup, { minWidth: 140, maxWidth: 170 }]}>
            <Text style={styles.filterLabel}>
              {dashboardType === 'doctor' ? 'Doctor ID (Optional)' :
               dashboardType === 'employee' ? 'Employee ID (Optional)' : 'Rider ID (Optional)'}
            </Text>
            {Platform.OS === 'web' ? (
              <select
                value={filterRiderId}
                onChange={(e) => setFilterRiderId(e.target.value)}
                style={StyleSheet.flatten([styles.webSelect, { height: 36, fontSize: 13 }]) as any}
              >
                {dashboardType === 'doctor' ? (
                  <>
                    <option value="">All Doctors</option>
                    {riders.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </>
                ) : dashboardType === 'employee' ? (
                  <>
                    <option value="">All Employees</option>
                    {riders.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </>
                ) : (
                  <>
                    <option value="">All Executives</option>
                    {riders.map(r => <option key={r.riderId} value={r.riderId}>{r.name}</option>)}
                  </>
                )}
              </select>
            ) : (
              <TextInput
                style={[styles.input, { height: 36, fontSize: 13 }]}
                placeholder={
                  dashboardType === 'doctor' ? 'Doctor ID' :
                  dashboardType === 'employee' ? 'Employee ID' : 'Rider ID'
                }
                value={filterRiderId}
                onChangeText={setFilterRiderId}
              />
            )}
          </View>

          <View style={[styles.filterGroup, { minWidth: 170, maxWidth: 200 }]}>
            <Text style={styles.filterLabel}>Period Selection</Text>
            <View style={[styles.periodTabs, { height: 36, padding: 3 }]}>
              {(['daily', 'monthly', 'yearly'] as const).map((tab) => (
                <TouchableOpacity
                  key={tab}
                  style={[styles.periodTab, { paddingVertical: 4 }, filterPeriod === tab && styles.periodTabActive]}
                  onPress={() => {
                    setFilterPeriod(tab);
                    const today = new Date().toISOString();
                    setFilterValue(
                      tab === 'daily' ? today.substring(0, 10) :
                      tab === 'monthly' ? today.substring(0, 7) :
                      today.substring(0, 4)
                    );
                  }}
                >
                  <Text style={[styles.periodTabText, filterPeriod === tab && styles.periodTabActiveText]}>
                    {tab.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={[styles.filterGroup, { minWidth: 130, maxWidth: 160 }]}>
            <Text style={styles.filterLabel}>
              {filterPeriod === 'daily' ? 'Date' :
               filterPeriod === 'monthly' ? 'Month' : 'Year'}
            </Text>
            <TextInput
              style={[styles.input, { height: 36, fontSize: 13 }]}
              value={filterValue}
              onChangeText={setFilterValue}
              placeholder={filterPeriod === 'daily' ? 'e.g. 2026-07-09' : 'e.g. 2026-07'}
            />
          </View>

          {Platform.OS === 'web' && (
            <View style={[styles.filterGroup, { minWidth: 140, maxWidth: 170 }]}>
              <Text style={styles.filterLabel}>
                {dashboardType === 'doctor' ? 'Department' :
                 dashboardType === 'employee' ? 'Department' : 'Area'}
              </Text>
              <select
                value={filterArea}
                onChange={(e) => setFilterArea(e.target.value)}
                style={StyleSheet.flatten([styles.webSelect, { height: 36, fontSize: 13 }]) as any}
              >
                <option value="">
                  {dashboardType === 'doctor' ? 'All Specializations' :
                   dashboardType === 'employee' ? 'All Departments' : 'All Areas'}
                </option>
                {areasList.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </View>
          )}

          {dashboardType === 'delivery' && Platform.OS === 'web' && (
            <View style={[styles.filterGroup, { minWidth: 140, maxWidth: 170 }]}>
              <Text style={styles.filterLabel}>Shift</Text>
              <select
                value={filterShift}
                onChange={(e) => setFilterShift(e.target.value)}
                style={StyleSheet.flatten([styles.webSelect, { height: 36, fontSize: 13 }]) as any}
              >
                <option value="">All Shifts</option>
                <option value="Morning">Morning Shift (09:00)</option>
                <option value="Evening">Evening Shift (18:00)</option>
                {shiftsList.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </View>
          )}

          {dashboardType !== 'employee' && Platform.OS === 'web' && (
            <View style={[styles.filterGroup, { minWidth: 140, maxWidth: 170 }]}>
              <Text style={styles.filterLabel}>Payment Mode</Text>
              <select
                value={filterPaymentMode}
                onChange={(e) => setFilterPaymentMode(e.target.value)}
                style={StyleSheet.flatten([styles.webSelect, { height: 36, fontSize: 13 }]) as any}
              >
                <option value="">All Payments</option>
                {paymentModesList.map(pm => <option key={pm} value={pm}>{pm}</option>)}
              </select>
            </View>
          )}

          <TouchableOpacity style={[styles.resetBtn, { height: 36, paddingVertical: 0, justifyContent: 'center', minWidth: 70 }]} onPress={resetFilters}>
            <Text style={styles.resetBtnText}>Reset</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Overview KPIs Section Title */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24, marginBottom: 12 }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#1e293b' }}>Overview KPIs</Text>
        <TouchableOpacity onPress={() => showInfoAlert('kpis')} style={{ padding: 4 }}>
          <Info size={15} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      {/* KPI Cards Grid */}
      {dashboardType === 'doctor' ? (
        <View style={styles.grid}>
          <View style={styles.kpiCard}>
            <View style={[styles.iconContainer, { backgroundColor: '#EEF2FF' }]}>
              <Award size={20} color="#4F46E5" />
            </View>
            <View>
              <Text style={styles.kpiLabel}>Consultations Completed %</Text>
              <Text style={[styles.kpiValue, { color: getStatusColor(executive.overview?.completedRate || 0, 'success') }]}>
                {executive.overview?.completedRate || 0}%
              </Text>
              <Text style={styles.kpiSub}>Target: High completed rate</Text>
            </View>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.iconContainer, { backgroundColor: '#E0F2FE' }]}>
              <User size={20} color="#0284C7" />
            </View>
            <View>
              <Text style={styles.kpiLabel}>Total Bookings</Text>
              <Text style={styles.kpiValue}>{executive.overview?.totalBookings || 0}</Text>
              <Text style={styles.kpiSub}>Allocated slots load</Text>
            </View>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.iconContainer, { backgroundColor: '#ECFDF5' }]}>
              <ShieldCheck size={20} color="#10B981" />
            </View>
            <View>
              <Text style={styles.kpiLabel}>Completed Consultations</Text>
              <Text style={styles.kpiValue}>{executive.overview?.completedBookings || 0}</Text>
              <Text style={styles.kpiSub}>Consulted successfully</Text>
            </View>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.iconContainer, { backgroundColor: '#FEE2E2' }]}>
              <AlertCircle size={20} color="#EF4444" />
            </View>
            <View>
              <Text style={styles.kpiLabel}>Cancelled Bookings</Text>
              <Text style={styles.kpiValue}>{executive.overview?.cancelledBookings || 0}</Text>
              <Text style={styles.kpiSub}>Refunded tokens</Text>
            </View>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.iconContainer, { backgroundColor: '#ECFDF5' }]}>
              <DollarSign size={20} color="#059669" />
            </View>
            <View>
              <Text style={styles.kpiLabel}>Total Revenue</Text>
              <Text style={[styles.kpiValue, { color: '#059669' }]}>₹{(executive.overview?.totalRevenue || 0).toLocaleString('en-IN')}</Text>
              <Text style={styles.kpiSub}>Fee from active bookings</Text>
            </View>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.iconContainer, { backgroundColor: '#E0F2FE' }]}>
              <DollarSign size={20} color="#0284C7" />
            </View>
            <View>
              <Text style={styles.kpiLabel}>Doctors Share</Text>
              <Text style={[styles.kpiValue, { color: '#0284C7' }]}>₹{(executive.overview?.totalDoctorShare || 0).toLocaleString('en-IN')}</Text>
              <Text style={styles.kpiSub}>Commission payout</Text>
            </View>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.iconContainer, { backgroundColor: '#EEF2FF' }]}>
              <DollarSign size={20} color="#4F46E5" />
            </View>
            <View>
              <Text style={styles.kpiLabel}>BMH Net Share</Text>
              <Text style={[styles.kpiValue, { color: '#4F46E5' }]}>₹{(executive.overview?.totalBMHShare || 0).toLocaleString('en-IN')}</Text>
              <Text style={styles.kpiSub}>Hospital revenue share</Text>
            </View>
          </View>
        </View>
      ) : dashboardType === 'employee' ? (
        <View style={styles.grid}>
          <View style={styles.kpiCard}>
            <View style={[styles.iconContainer, { backgroundColor: '#EEF2FF' }]}>
              <Award size={20} color="#4F46E5" />
            </View>
            <View>
              <Text style={styles.kpiLabel}>Task Completion Rate</Text>
              <Text style={[styles.kpiValue, { color: getStatusColor(executive.overview?.overallTaskCompletionRate || 0, 'success') }]}>
                {executive.overview?.overallTaskCompletionRate || 0}%
              </Text>
              <Text style={styles.kpiSub}>Target: High completion rate</Text>
            </View>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.iconContainer, { backgroundColor: '#E0F2FE' }]}>
              <Clock size={20} color="#0284C7" />
            </View>
            <View>
              <Text style={styles.kpiLabel}>Total Tasks Assigned</Text>
              <Text style={styles.kpiValue}>{executive.overview?.totalTasksAssigned || 0}</Text>
              <Text style={styles.kpiSub}>Normal & recurring tasks</Text>
            </View>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.iconContainer, { backgroundColor: '#ECFDF5' }]}>
              <ShieldCheck size={20} color="#10B981" />
            </View>
            <View>
              <Text style={styles.kpiLabel}>Completed Tasks</Text>
              <Text style={styles.kpiValue}>{executive.overview?.totalTasksCompleted || 0}</Text>
              <Text style={styles.kpiSub}>Tasks finished successfully</Text>
            </View>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.iconContainer, { backgroundColor: '#ECFDF5' }]}>
              <Clock size={20} color="#10B981" />
            </View>
            <View>
              <Text style={styles.kpiLabel}>Hours Worked</Text>
              <Text style={styles.kpiValue}>{executive.overview?.totalHoursWorked || 0} hrs</Text>
              <Text style={styles.kpiSub}>Attendance shift hours</Text>
            </View>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.iconContainer, { backgroundColor: '#E0F2FE' }]}>
              <User size={20} color="#0284C7" />
            </View>
            <View>
              <Text style={styles.kpiLabel}>Patient Bookings</Text>
              <Text style={styles.kpiValue}>{executive.overview?.totalBookingsMade || 0}</Text>
              <Text style={styles.kpiSub}>Tokens booked by staff</Text>
            </View>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.iconContainer, { backgroundColor: '#ECFDF5' }]}>
              <DollarSign size={20} color="#059669" />
            </View>
            <View>
              <Text style={styles.kpiLabel}>Booking Revenue</Text>
              <Text style={[styles.kpiValue, { color: '#059669' }]}>₹{(executive.overview?.totalBookingRevenue || 0).toLocaleString('en-IN')}</Text>
              <Text style={styles.kpiSub}>Fees collected by staff</Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.grid}>
          <View style={styles.kpiCard}>
            <View style={[styles.iconContainer, { backgroundColor: '#EEF2FF' }]}>
              <Award size={20} color="#4F46E5" />
            </View>
            <View>
              <Text style={styles.kpiLabel}>Deliveries Success %</Text>
              <Text style={[styles.kpiValue, { color: getStatusColor(executive.deliverySuccessRate || 0, 'success') }]}>
                {executive.deliverySuccessRate || 0}%
              </Text>
              <Text style={styles.kpiSub}>Target: ≥98% Success</Text>
            </View>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.iconContainer, { backgroundColor: '#E0F2FE' }]}>
              <Clock size={20} color="#0284C7" />
            </View>
            <View>
              <Text style={styles.kpiLabel}>On-Time Delivery %</Text>
              <Text style={[styles.kpiValue, { color: getStatusColor(executive.onTimeDeliveryRate || 0, 'on_time') }]}>
                {executive.onTimeDeliveryRate || 0}%
              </Text>
              <Text style={styles.kpiSub}>Target: ≥95% On-Time</Text>
            </View>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.iconContainer, { backgroundColor: '#F1F5F9' }]}>
              <TrendingUp size={20} color="#475569" />
            </View>
            <View>
              <Text style={styles.kpiLabel}>Total Orders Assigned</Text>
              <Text style={styles.kpiValue}>{executive.totalOrdersAssigned || 0}</Text>
              <Text style={styles.kpiSub}>Total allocated load</Text>
            </View>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.iconContainer, { backgroundColor: '#ECFDF5' }]}>
              <ShieldCheck size={20} color="#10B981" />
            </View>
            <View>
              <Text style={styles.kpiLabel}>Total Orders Delivered</Text>
              <Text style={styles.kpiValue}>{executive.totalOrdersDelivered || 0}</Text>
              <Text style={styles.kpiSub}>Success count</Text>
            </View>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.iconContainer, { backgroundColor: '#FEF3C7' }]}>
              <Clock size={20} color="#D97706" />
            </View>
            <View>
              <Text style={styles.kpiLabel}>Pending Deliveries</Text>
              <Text style={styles.kpiValue}>{executive.pendingDeliveries || 0}</Text>
              <Text style={styles.kpiSub}>Currently in transit</Text>
            </View>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.iconContainer, { backgroundColor: '#FEE2E2' }]}>
              <AlertCircle size={20} color="#EF4444" />
            </View>
            <View>
              <Text style={styles.kpiLabel}>Failed & Returned</Text>
              <Text style={styles.kpiValue}>{(executive.failedDeliveries || 0) + (executive.returnedOrders || 0)}</Text>
              <Text style={styles.kpiSub}>Fail: {executive.failedDeliveries || 0} | Ret: {executive.returnedOrders || 0}</Text>
            </View>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.iconContainer, { backgroundColor: '#F3F4F6' }]}>
              <AlertCircle size={20} color="#6B7280" />
            </View>
            <View>
              <Text style={styles.kpiLabel}>Cancelled Orders</Text>
              <Text style={styles.kpiValue}>{executive.cancelledOrders || 0}</Text>
              <Text style={styles.kpiSub}>Void/Cancelled load</Text>
            </View>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.iconContainer, { backgroundColor: '#FEF3C7' }]}>
              <Clock size={20} color="#D97706" />
            </View>
            <View>
              <Text style={styles.kpiLabel}>Avg. Delivery Cycle</Text>
              <Text style={styles.kpiValue}>{executive.averageDeliveryTimeMin || 0}m</Text>
              <Text style={styles.kpiSub}>In-Transit Duration</Text>
            </View>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.iconContainer, { backgroundColor: '#FDF2F8' }]}>
              <MapPin size={20} color="#DB2777" />
            </View>
            <View>
              <Text style={styles.kpiLabel}>Distance Covered</Text>
              <Text style={styles.kpiValue}>{executive.totalDistanceKM || 0} KM</Text>
              <Text style={styles.kpiSub}>Calculated via coordinates</Text>
            </View>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.iconContainer, { backgroundColor: '#ECFDF5' }]}>
              <DollarSign size={20} color="#059669" />
            </View>
            <View>
              <Text style={styles.kpiLabel}>Total Revenue</Text>
              <Text style={[styles.kpiValue, { color: '#059669' }]}>₹{((executive.totalCashCollected || 0) + (executive.totalOnlinePayments || 0))?.toLocaleString('en-IN')}</Text>
              <Text style={styles.kpiSub}>From delivered orders</Text>
            </View>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.iconContainer, { backgroundColor: '#EEF2FF' }]}>
              <DollarSign size={20} color="#4F46E5" />
            </View>
            <View>
              <Text style={styles.kpiLabel}>Total Delivery Charges</Text>
              <Text style={styles.kpiValue}>₹{executive.totalDeliveryCharges?.toLocaleString('en-IN') || 0}</Text>
              <Text style={styles.kpiSub}>Dynamic charges billed</Text>
            </View>
          </View>
        </View>
      )}

      {/* Financial Summary Card */}
      {isDoctorMode ? (
        <View style={[styles.card, { marginTop: 24 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Financial Summary & Payout Breakdown</Text>
            <TouchableOpacity onPress={() => showInfoAlert('financial')} style={{ padding: 4 }}>
              <Info size={15} color="#4F46E5" />
            </TouchableOpacity>
          </View>
          <View style={styles.paymentsSummary}>
            <View style={styles.paymentCol}>
              <Text style={styles.paymentLabel}>Total Billing Value</Text>
              <Text style={[styles.paymentValue, { color: '#4F46E5' }]}>₹{(executive.financials?.totalRevenue || 0).toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.paymentDivider} />
            <View style={styles.paymentCol}>
              <Text style={styles.paymentLabel}>Cash Billed (Counter)</Text>
              <Text style={[styles.paymentValue, { color: '#059669' }]}>₹{(executive.financials?.cashCollected || 0).toLocaleString('en-IN')}</Text>
              <Text style={styles.paymentSub}>Doctor Share: ₹{(executive.financials?.cashDoctorShare || 0).toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.paymentDivider} />
            <View style={styles.paymentCol}>
              <Text style={styles.paymentLabel}>Online Received</Text>
              <Text style={[styles.paymentValue, { color: '#0284C7' }]}>₹{(executive.financials?.onlineCollected || 0).toLocaleString('en-IN')}</Text>
              <Text style={styles.paymentSub}>Doctor Share: ₹{(executive.financials?.onlineDoctorShare || 0).toLocaleString('en-IN')}</Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={[styles.card, { marginTop: 24 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Financial Summary & Operations Breakdown</Text>
            <TouchableOpacity onPress={() => showInfoAlert('financial')} style={{ padding: 4 }}>
              <Info size={15} color="#4F46E5" />
            </TouchableOpacity>
          </View>
          <View style={styles.paymentsSummary}>
            <View style={styles.paymentCol}>
              <Text style={styles.paymentLabel}>Total Order Value</Text>
              <Text style={[styles.paymentValue, { color: '#4F46E5' }]}>₹{executive.totalOrderValue?.toLocaleString('en-IN') || 0}</Text>
            </View>
            <View style={styles.paymentDivider} />
            <View style={styles.paymentCol}>
              <Text style={styles.paymentLabel}>COD Collected (Cash)</Text>
              <Text style={styles.paymentValue}>₹{executive.totalCashCollected?.toLocaleString('en-IN') || 0}</Text>
            </View>
            <View style={styles.paymentDivider} />
            <View style={styles.paymentCol}>
              <Text style={styles.paymentLabel}>Online Payments</Text>
              <Text style={styles.paymentValue}>₹{executive.totalOnlinePayments?.toLocaleString('en-IN') || 0}</Text>
            </View>
            <View style={styles.paymentDivider} />
            <View style={styles.paymentCol}>
              <Text style={styles.paymentLabel}>Pending Cash Collection</Text>
              <Text style={[styles.paymentValue, { color: '#D97706' }]}>₹{executive.pendingCashCollection?.toLocaleString('en-IN') || 0}</Text>
            </View>
          </View>

          {/* Bus and Scheduled orders subrow */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#E2E8F0' }}>
            <View style={{ flex: 1, minWidth: 200, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 8 }}>
              <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '600' }}>Bus Parcel Shipments</Text>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#1e293b', marginTop: 4 }}>
                {executive.busOrdersCount || 0} <Text style={{ fontSize: 13, fontWeight: '400', color: '#64748B' }}>orders</Text>
              </Text>
              <Text style={{ fontSize: 13, color: '#059669', fontWeight: '600', marginTop: 2 }}>Value: ₹{executive.busOrdersValue?.toLocaleString('en-IN') || 0}</Text>
            </View>
            
            <View style={{ flex: 1, minWidth: 200, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 8 }}>
              <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '600' }}>Scheduled Deliveries</Text>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#1e293b', marginTop: 4 }}>
                {executive.scheduledOrdersCount || 0} <Text style={{ fontSize: 13, fontWeight: '400', color: '#64748B' }}>orders</Text>
              </Text>
              <Text style={{ fontSize: 13, color: '#0284C7', fontWeight: '600', marginTop: 2 }}>Value: ₹{executive.scheduledOrdersValue?.toLocaleString('en-IN') || 0}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Delivery Executive Summary */}
      {!isDoctorMode && (
        <View style={[styles.card, { marginTop: 24 }]}>
          <Text style={styles.sectionTitle}>Delivery Executive Summary</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
            <View style={{ flex: 1, minWidth: 200, backgroundColor: '#F0F9FF', padding: 12, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ backgroundColor: '#0284C7', padding: 8, borderRadius: 6 }}>
                <User size={18} color="#fff" />
              </View>
              <View>
                <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '600' }}>Total Delivery Boys</Text>
                <Text style={{ fontSize: 20, fontWeight: '700', color: '#0f172a' }}>{executive.totalRidersCount || 0}</Text>
              </View>
            </View>
            <View style={{ flex: 1, minWidth: 200, backgroundColor: '#ECFDF5', padding: 12, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ backgroundColor: '#10B981', padding: 8, borderRadius: 6 }}>
                <ShieldCheck size={18} color="#fff" />
              </View>
              <View>
                <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '600' }}>Active Delivery Boys</Text>
                <Text style={{ fontSize: 20, fontWeight: '700', color: '#0f172a' }}>{executive.activeRidersCount || 0}</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Area / Department Performance */}
      <View style={[styles.card, { marginTop: 24 }]}>
        <TouchableOpacity
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
          onPress={() => setAreaExpanded(!areaExpanded)}
          activeOpacity={0.7}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>
              {isDoctorMode ? 'Specialization Department Breakdown' : 'Area Performance Breakdown'}
            </Text>
            <TouchableOpacity onPress={() => showInfoAlert(isDoctorMode ? 'dept' : 'area')} style={{ padding: 4 }}>
              <Info size={15} color="#4F46E5" />
            </TouchableOpacity>
          </View>
          <Text style={{ color: '#4F46E5', fontSize: 13, fontWeight: '600' }}>{areaExpanded ? 'Collapse' : 'Expand'}</Text>
        </TouchableOpacity>

        {areaExpanded && (
          <ScrollView horizontal showsHorizontalScrollIndicator={true} style={{ marginTop: 12 }}>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.th, { width: 180 }]}>{isDoctorMode ? 'Department Name' : 'Area Name'}</Text>
                <Text style={[styles.th, { width: 100 }]}>{isDoctorMode ? 'Total Bookings' : 'Total Orders'}</Text>
                <Text style={[styles.th, { width: 120 }]}>Revenue Generated</Text>
                <Text style={[styles.th, { width: 120 }]}>{isDoctorMode ? 'Pending Tokens' : 'Pending Orders'}</Text>
              </View>
              {(executive.areaPerformance || []).length === 0 ? (
                <View style={{ padding: 16, alignItems: 'center' }}>
                  <Text style={{ color: '#64748B', fontSize: 13 }}>
                    {isDoctorMode ? 'No department data found.' : 'No area data found for selected period.'}
                  </Text>
                </View>
              ) : (
                (executive.areaPerformance || []).map((area: any, index: number) => (
                  <View key={area.area || index} style={styles.tableRow}>
                    <Text style={[styles.td, { width: 180, fontWeight: '600' }]}>{area.area}</Text>
                    <Text style={[styles.td, { width: 100 }]}>{area.totalOrders}</Text>
                    <Text style={[styles.td, { width: 120, color: '#10B981', fontWeight: '600' }]}>₹{area.revenue?.toLocaleString('en-IN')}</Text>
                    <Text style={[styles.td, { width: 120, color: '#F59E0B', fontWeight: '600' }]}>
                      {isDoctorMode ? area.pending : area.pendingOrders}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        )}
      </View>

      {/* Performance Charts & Trends */}
      {dashboardType !== 'employee' && (
        <View style={[styles.card, { marginTop: 24 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Operations Trends & Peak Hours</Text>
            <TouchableOpacity onPress={() => showInfoAlert('trends')} style={{ padding: 4 }}>
              <Info size={15} color="#4F46E5" />
            </TouchableOpacity>
          </View>
          
          {/* Bookings / Orders & Revenue Trend */}
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#475569', marginBottom: 12 }}>
            {isDoctorMode ? 'Bookings & Revenue Trend' : 'Orders & Revenue Trend'}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={true} style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-end', height: 160, paddingBottom: 24, paddingHorizontal: 12 }}>
              {(executive.performanceTrend || []).map((t: any, idx: number) => {
                const maxVal = Math.max(...(executive.performanceTrend || []).map((x: any) => x.orders), 1);
                const barHeight = Math.max((t.orders / maxVal) * 100, 10);
                return (
                  <View key={t.label || idx} style={{ alignItems: 'center', width: 65 }}>
                    <View style={{ height: 100, justifyContent: 'flex-end', width: 28, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
                      <View style={{ height: `${barHeight}%`, backgroundColor: '#3B82F6', borderRadius: 4 }} />
                    </View>
                    <Text style={{ fontSize: 10, color: '#1e293b', fontWeight: '700', marginTop: 6 }}>{t.orders} Vol</Text>
                    <Text style={{ fontSize: 9, color: '#059669', fontWeight: '600', marginTop: 2 }}>₹{t.revenue >= 1000 ? `${(t.revenue / 1000).toFixed(1)}k` : t.revenue}</Text>
                    <Text style={{ fontSize: 9, color: '#64748B', marginTop: 4 }}>{getTrendLabel(t.label, filterPeriod)}</Text>
                  </View>
                );
              })}
            </View>
          </ScrollView>

          {/* Peak Hours distribution */}
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#475569', marginBottom: 12 }}>
            {isDoctorMode ? 'Peak Booking Hours (Distribution)' : 'Peak Delivery Hours (Distribution)'}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end', height: 150, paddingBottom: 20, paddingHorizontal: 12 }}>
              {(() => {
                const peakHoursArray = isDoctorMode ? executive.peakHours : executive.hourStats;
                return (peakHoursArray || []).filter((h: any) => h.orders > 0).map((h: any, idx: number) => {
                  const maxVal = Math.max(...(peakHoursArray || []).map((x: any) => x.orders), 1);
                  const barHeight = Math.max((h.orders / maxVal) * 100, 10);
                  return (
                    <View key={h.hour || idx} style={{ alignItems: 'center', width: 40 }}>
                      <View style={{ height: 90, justifyContent: 'flex-end', width: 16, backgroundColor: '#F1F5F9', borderRadius: 3, overflow: 'hidden' }}>
                        <View style={{ height: `${barHeight}%`, backgroundColor: '#10B981', borderRadius: 3 }} />
                      </View>
                      <Text style={{ fontSize: 9, color: '#475569', fontWeight: '700', marginTop: 4 }}>{h.orders}</Text>
                      <Text style={{ fontSize: 8, color: '#94A3B8', marginTop: 2 }}>{h.hour}</Text>
                    </View>
                  );
                });
              })()}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Leaderboard/Ranking */}
      {dashboardType === 'delivery' && (
        <View style={styles.rankingsRow}>
          <View style={[styles.card, { flex: 1 }]}>
            <Text style={styles.sectionTitle}>Top Performing Executives</Text>
            {(executive.topExecutives || []).map((exec: any, index: number) => (
              <View key={exec.riderId} style={styles.rankItem}>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>#{index + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rankName}>{exec.name}</Text>
                  <Text style={styles.rankDetails}>Delivered: {exec.delivered} orders | Rating: {exec.rating} ★</Text>
                </View>
                <Text style={[styles.rankScore, { color: '#10B981' }]}>{exec.successRate}%</Text>
              </View>
            ))}
          </View>

          <View style={[styles.card, { flex: 1 }]}>
            <Text style={styles.sectionTitle}>Needs Attention (Issues & Failures)</Text>
            {(executive.bottomExecutives || []).map((exec: any, index: number) => (
              <View key={exec.riderId} style={styles.rankItem}>
                <View style={[styles.rankBadge, { backgroundColor: '#FEE2E2' }]}>
                  <Text style={[styles.rankText, { color: '#EF4444' }]}>!</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rankName}>{exec.name}</Text>
                  <Text style={styles.rankDetails}>Failed/Returned: {exec.failed + exec.returned} | Rating: {exec.rating} ★</Text>
                </View>
                <Text style={[styles.rankScore, { color: '#EF4444' }]}>{exec.successRate}%</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Detail Table */}
      <View style={[styles.card, { marginTop: 24 }]}>
        <Text style={styles.sectionTitle}>
          {dashboardType === 'doctor' ? 'Doctor Bookings & Share Performance' :
           dashboardType === 'employee' ? 'Employee KPI & Attendance Statistics' : 'Rider Breakdown Statistics'}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={true}>
          <View style={styles.table}>
            {dashboardType === 'doctor' ? (
              <>
                <View style={styles.tableHeader}>
                  <Text style={[styles.th, { width: 60 }]}>ID</Text>
                  <Text style={[styles.th, { width: 150 }]}>Doctor Name</Text>
                  <Text style={[styles.th, { width: 120 }]}>Department</Text>
                  <Text style={[styles.th, { width: 140 }]}>Bookings (Total / Completed / Cancelled)</Text>
                  <Text style={[styles.th, { width: 80 }]}>Share %</Text>
                  <Text style={[styles.th, { width: 100 }]}>Total Fee</Text>
                  <Text style={[styles.th, { width: 100 }]}>Doctor Share</Text>
                  <Text style={[styles.th, { width: 100 }]}>BMH Share</Text>
                </View>

                {riders.map((d: any, index: number) => (
                  <View key={d.id || index} style={styles.tableRow}>
                    <Text style={[styles.td, { width: 60, fontWeight: 'bold' }]}>#{d.id}</Text>
                    <Text style={[styles.td, { width: 150, fontWeight: '600' }]}>{d.name}</Text>
                    <Text style={[styles.td, { width: 120 }]}>{d.department}</Text>
                    <Text style={[styles.td, { width: 140 }]}>
                      {d.totalBookings} ({d.completedConsultations} / {d.cancelledBookings})
                    </Text>
                    <Text style={[styles.td, { width: 80 }]}>{d.feePercent}%</Text>
                    <Text style={[styles.td, { width: 100, fontWeight: '600' }]}>₹{d.revenue?.toLocaleString('en-IN')}</Text>
                    <Text style={[styles.td, { width: 100, color: '#0284C7', fontWeight: '600' }]}>₹{d.doctorShare?.toLocaleString('en-IN')}</Text>
                    <Text style={[styles.td, { width: 100, color: '#4F46E5', fontWeight: '600' }]}>₹{d.bmhShare?.toLocaleString('en-IN')}</Text>
                  </View>
                ))}
              </>
            ) : dashboardType === 'employee' ? (
              <>
                <View style={styles.tableHeader}>
                  <Text style={[styles.th, { width: 60 }]}>ID</Text>
                  <Text style={[styles.th, { width: 150 }]}>Employee Name</Text>
                  <Text style={[styles.th, { width: 120 }]}>Department</Text>
                  <Text style={[styles.th, { width: 120 }]}>Role</Text>
                  <Text style={[styles.th, { width: 150 }]}>Tasks (Assigned / Completed)</Text>
                  <Text style={[styles.th, { width: 100 }]}>Task Comp. %</Text>
                  <Text style={[styles.th, { width: 100 }]}>Hours Worked</Text>
                  <Text style={[styles.th, { width: 100 }]}>Bookings Made</Text>
                  <Text style={[styles.th, { width: 100 }]}>Booking Rev.</Text>
                </View>

                {riders.map((e: any, index: number) => (
                  <View key={e.id || index} style={styles.tableRow}>
                    <Text style={[styles.td, { width: 60, fontWeight: 'bold' }]}>#{e.id}</Text>
                    <Text style={[styles.td, { width: 150, fontWeight: '600' }]}>{e.name}</Text>
                    <Text style={[styles.td, { width: 120 }]}>{e.department}</Text>
                    <Text style={[styles.td, { width: 120 }]}>{e.role}</Text>
                    <Text style={[styles.td, { width: 150 }]}>
                      {e.tasks?.assigned} / {e.tasks?.completed}
                    </Text>
                    <View style={[styles.td, { width: 100 }]}>
                      <Text style={[styles.badge, { backgroundColor: getStatusColor(e.tasks?.completionRate, 'success') + '15', color: getStatusColor(e.tasks?.completionRate, 'success') }]}>
                        {e.tasks?.completionRate}%
                      </Text>
                    </View>
                    <Text style={[styles.td, { width: 100 }]}>{e.attendance?.hoursWorked} hrs</Text>
                    <Text style={[styles.td, { width: 100 }]}>{e.bookings?.total > 0 ? e.bookings.total : 'N/A'}</Text>
                    <Text style={[styles.td, { width: 100, fontWeight: '600' }]}>{e.bookings?.total > 0 ? `₹${e.bookings.revenue}` : 'N/A'}</Text>
                  </View>
                ))}
              </>
            ) : (
              <>
                <View style={styles.tableHeader}>
                  <Text style={[styles.th, { width: 150 }]}>Executive</Text>
                  <Text style={[styles.th, { width: 100 }]}>Shift</Text>
                  <Text style={[styles.th, { width: 80 }]}>Assigned</Text>
                  <Text style={[styles.th, { width: 80 }]}>Delivered</Text>
                  <Text style={[styles.th, { width: 80 }]}>Success %</Text>
                  <Text style={[styles.th, { width: 100 }]}>Avg Time</Text>
                  <Text style={[styles.th, { width: 100 }]}>Distance</Text>
                  <Text style={[styles.th, { width: 100 }]}>Attendance</Text>
                  <Text style={[styles.th, { width: 80 }]}>Rating</Text>
                </View>

                {riders.map((r) => (
                  <View key={r.riderId} style={styles.tableRow}>
                    <View style={[{ width: 150 }]}>
                      <Text style={styles.riderName}>{r.name}</Text>
                      <Text style={styles.riderPhone}>{r.phone}</Text>
                    </View>
                    <Text style={[styles.td, { width: 100 }]}>{r.shift}</Text>
                    <Text style={[styles.td, { width: 80 }]}>{r.assigned}</Text>
                    <Text style={[styles.td, { width: 80 }]}>{r.delivered}</Text>
                    <View style={[styles.td, { width: 80 }]}>
                      <Text style={[styles.badge, { backgroundColor: getStatusColor(r.successRate, 'success') + '15', color: getStatusColor(r.successRate, 'success') }]}>
                        {r.successRate}%
                      </Text>
                    </View>
                    <Text style={[styles.td, { width: 100 }]}>{r.avgDeliveryTimeMin} min</Text>
                    <Text style={[styles.td, { width: 100 }]}>{r.totalDistanceKM} KM</Text>
                    <Text style={[styles.td, { width: 100 }]}>{r.workingDays} days</Text>
                    <Text style={[styles.td, { width: 80, fontWeight: '700', color: getStatusColor(r.rating, 'rating') }]}>{r.rating} ★</Text>
                  </View>
                ))}
              </>
            )}
          </View>
        </ScrollView>
      </View>

      {/* Filtered Rider's deliveries OR Filtered Doctor's Patient Bookings */}
      {filterRiderId && (() => {
        if (dashboardType === 'doctor') {
          const filteredBookings = (executive.bookingsList || []).filter((b: any) => {
            const searchStr = tableSearch.toLowerCase().trim();
            return searchStr === '' ||
              String(b.id || '').toLowerCase().includes(searchStr) ||
              String(b.patientName || '').toLowerCase().includes(searchStr) ||
              String(b.patientPhone || '').toLowerCase().includes(searchStr);
          });

          return (
            <View style={[styles.card, { marginTop: 24 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', marginBottom: 16, gap: 12 }}>
                <Text style={styles.sectionTitle}>Doctor's Patient Bookings ({riders.find(r => String(r.id) === String(filterRiderId))?.name || 'Filtered Doctor'})</Text>
                
                {Platform.OS === 'web' && (
                  <TextInput
                    style={[styles.input, { width: 250, height: 38, paddingVertical: 0 }]}
                    placeholder="Search by Patient, Phone, ID..."
                    value={tableSearch}
                    onChangeText={setTableSearch}
                  />
                )}
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                <View style={styles.table}>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.th, { width: 100 }]}>Booking ID</Text>
                    <Text style={[styles.th, { width: 120 }]}>Date</Text>
                    <Text style={[styles.th, { width: 180 }]}>Patient Name</Text>
                    <Text style={[styles.th, { width: 130 }]}>Patient Phone</Text>
                    <Text style={[styles.th, { width: 120 }]}>Status</Text>
                    <Text style={[styles.th, { width: 120 }]}>Payment Mode</Text>
                    <Text style={[styles.th, { width: 100 }]}>Booking Fee</Text>
                    <Text style={[styles.th, { width: 100 }]}>Doctor Share</Text>
                    <Text style={[styles.th, { width: 100 }]}>BMH Share</Text>
                  </View>

                  {filteredBookings.length === 0 ? (
                    <View style={{ padding: 24, alignItems: 'center' }}>
                      <Text style={{ color: '#64748B', fontSize: 13 }}>No patient bookings found for the selected filters.</Text>
                    </View>
                  ) : (
                    filteredBookings.map((b: any, idx: number) => (
                      <View key={b.id || idx} style={styles.tableRow}>
                        <Text style={[styles.td, { width: 100, fontWeight: '700' }]}>#{b.id}</Text>
                        <Text style={[styles.td, { width: 120 }]}>{new Date(b.date).toLocaleDateString('en-IN')}</Text>
                        <Text style={[styles.td, { width: 180, fontWeight: '600' }]}>{b.patientName}</Text>
                        <Text style={[styles.td, { width: 130 }]}>{b.patientPhone}</Text>
                        <View style={[styles.td, { width: 120 }]}>
                          <Text style={[styles.badge, { 
                            backgroundColor: b.status === 'Cancelled' ? '#fee2e2' : (b.status === 'Consulted' || b.status === 'Completed' ? '#dcfce7' : '#fef3c7'),
                            color: b.status === 'Cancelled' ? '#ef4444' : (b.status === 'Consulted' || b.status === 'Completed' ? '#10b981' : '#d97706')
                          }]}>
                            {b.status}
                          </Text>
                        </View>
                        <Text style={[styles.td, { width: 120, textTransform: 'capitalize' }]}>{b.paymentMode}</Text>
                        <Text style={[styles.td, { width: 100, fontWeight: '600' }]}>₹{b.fee}</Text>
                        <Text style={[styles.td, { width: 100, color: '#0284C7', fontWeight: '600' }]}>₹{b.doctorShare}</Text>
                        <Text style={[styles.td, { width: 100, color: '#4F46E5', fontWeight: '600' }]}>₹{b.bmhShare}</Text>
                      </View>
                    ))
                  )}
                </View>
              </ScrollView>
            </View>
          );
        } else if (dashboardType === 'employee') {
          const filteredTasks = (stats.tasksList || []).filter((t: any) => {
            const searchStr = tableSearch.toLowerCase().trim();
            return searchStr === '' ||
              String(t.id || '').toLowerCase().includes(searchStr) ||
              String(t.title || '').toLowerCase().includes(searchStr);
          });

          const filteredAtt = (stats.attendanceList || []).filter((a: any) => {
            const searchStr = tableSearch.toLowerCase().trim();
            return searchStr === '' ||
              String(a.date || '').toLowerCase().includes(searchStr) ||
              String(a.status || '').toLowerCase().includes(searchStr);
          });

          const filteredBookings = (stats.bookingsList || []).filter((b: any) => {
            const searchStr = tableSearch.toLowerCase().trim();
            return searchStr === '' ||
              String(b.id || '').toLowerCase().includes(searchStr) ||
              String(b.patientName || '').toLowerCase().includes(searchStr);
          });

          const selectedEmp = riders.find(r => String(r.id) === String(filterRiderId));

          return (
            <View style={{ gap: 24, marginTop: 24 }}>
              {/* Tasks list */}
              <View style={styles.card}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <Text style={styles.sectionTitle}>Employee Tasks List ({selectedEmp?.name})</Text>
                  {Platform.OS === 'web' && (
                    <TextInput
                      style={[styles.input, { width: 220, height: 38, paddingVertical: 0 }]}
                      placeholder="Search tasks..."
                      value={tableSearch}
                      onChangeText={setTableSearch}
                    />
                  )}
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                  <View style={styles.table}>
                    <View style={styles.tableHeader}>
                      <Text style={[styles.th, { width: 80 }]}>Task ID</Text>
                      <Text style={[styles.th, { width: 200 }]}>Title</Text>
                      <Text style={[styles.th, { width: 100 }]}>Priority</Text>
                      <Text style={[styles.th, { width: 120 }]}>Status</Text>
                      <Text style={[styles.th, { width: 120 }]}>Due Date</Text>
                      <Text style={[styles.th, { width: 120 }]}>Completed At</Text>
                      <Text style={[styles.th, { width: 100 }]}>Duration</Text>
                    </View>
                    {filteredTasks.length === 0 ? (
                      <View style={{ padding: 24, alignItems: 'center' }}>
                        <Text style={{ color: '#64748B', fontSize: 13 }}>No tasks found.</Text>
                      </View>
                    ) : (
                      filteredTasks.map((t: any) => (
                        <View key={t.id} style={styles.tableRow}>
                          <Text style={[styles.td, { width: 80, fontWeight: '700' }]}>#{t.id}</Text>
                          <Text style={[styles.td, { width: 200, fontWeight: '600' }]}>{t.title}</Text>
                          <Text style={[styles.td, { width: 100 }]}>{t.priority}</Text>
                          <View style={[styles.td, { width: 120 }]}>
                            <Text style={[styles.badge, { 
                              backgroundColor: t.status?.toLowerCase() === 'completed' ? '#dcfce7' : '#fee2e2',
                              color: t.status?.toLowerCase() === 'completed' ? '#10b981' : '#ef4444'
                            }]}>
                              {t.status}
                            </Text>
                          </View>
                          <Text style={[styles.td, { width: 120 }]}>{t.dueDate ? new Date(t.dueDate).toLocaleDateString('en-IN') : 'N/A'}</Text>
                          <Text style={[styles.td, { width: 120 }]}>{t.completedAt ? new Date(t.completedAt).toLocaleDateString('en-IN') : 'N/A'}</Text>
                          <Text style={[styles.td, { width: 100 }]}>{t.durationHours != null ? `${t.durationHours} hrs` : 'N/A'}</Text>
                        </View>
                      ))
                    )}
                  </View>
                </ScrollView>
              </View>

              {/* Attendance list */}
              <View style={styles.card}>
                <Text style={[styles.sectionTitle, { marginBottom: 16 }]}>Attendance History ({selectedEmp?.name})</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                  <View style={styles.table}>
                    <View style={styles.tableHeader}>
                      <Text style={[styles.th, { width: 120 }]}>Date</Text>
                      <Text style={[styles.th, { width: 150 }]}>Check In</Text>
                      <Text style={[styles.th, { width: 150 }]}>Check Out</Text>
                      <Text style={[styles.th, { width: 120 }]}>Working Hours</Text>
                      <Text style={[styles.th, { width: 100 }]}>Status</Text>
                    </View>
                    {filteredAtt.length === 0 ? (
                      <View style={{ padding: 24, alignItems: 'center' }}>
                        <Text style={{ color: '#64748B', fontSize: 13 }}>No attendance logs found.</Text>
                      </View>
                    ) : (
                      filteredAtt.map((a: any) => (
                        <View key={a.id} style={styles.tableRow}>
                          <Text style={[styles.td, { width: 120, fontWeight: '600' }]}>{new Date(a.date).toLocaleDateString('en-IN')}</Text>
                          <Text style={[styles.td, { width: 150 }]}>{a.checkin ? new Date(a.checkin).toLocaleTimeString('en-US', { hour12: true }) : 'N/A'}</Text>
                          <Text style={[styles.td, { width: 150 }]}>{a.checkout ? new Date(a.checkout).toLocaleTimeString('en-US', { hour12: true }) : 'N/A'}</Text>
                          <Text style={[styles.td, { width: 120 }]}>{a.sessionHours || 'N/A'}</Text>
                          <View style={[styles.td, { width: 100 }]}>
                            <Text style={[styles.badge, { 
                              backgroundColor: a.status?.toLowerCase() === 'present' || a.status?.toLowerCase() === 'regular' ? '#dcfce7' : '#fee2e2',
                              color: a.status?.toLowerCase() === 'present' || a.status?.toLowerCase() === 'regular' ? '#10b981' : '#ef4444'
                            }]}>
                              {a.status || 'Present'}
                            </Text>
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                </ScrollView>
              </View>

              {/* Patient Bookings list (Conditional) */}
              {(stats.bookingsList || []).length > 0 && (
                <View style={styles.card}>
                  <Text style={[styles.sectionTitle, { marginBottom: 16 }]}>Patient Bookings Log ({selectedEmp?.name})</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                    <View style={styles.table}>
                      <View style={styles.tableHeader}>
                        <Text style={[styles.th, { width: 100 }]}>Booking ID</Text>
                        <Text style={[styles.th, { width: 120 }]}>Date</Text>
                        <Text style={[styles.th, { width: 180 }]}>Patient Name</Text>
                        <Text style={[styles.th, { width: 150 }]}>Doctor</Text>
                        <Text style={[styles.th, { width: 100 }]}>Fee</Text>
                        <Text style={[styles.th, { width: 120 }]}>Status</Text>
                      </View>
                      {filteredBookings.map((b: any) => (
                        <View key={b.id} style={styles.tableRow}>
                          <Text style={[styles.td, { width: 100, fontWeight: '700' }]}>#{b.id}</Text>
                          <Text style={[styles.td, { width: 120 }]}>{new Date(b.createdAt).toLocaleDateString('en-IN')}</Text>
                          <Text style={[styles.td, { width: 180, fontWeight: '600' }]}>{b.patientName}</Text>
                          <Text style={[styles.td, { width: 150 }]}>{b.doctorName}</Text>
                          <Text style={[styles.td, { width: 100, fontWeight: '600' }]}>₹{b.fee}</Text>
                          <View style={[styles.td, { width: 120 }]}>
                            <Text style={[styles.badge, { 
                              backgroundColor: b.status === 'Cancelled' ? '#fee2e2' : (b.status === 'Consulted' || b.status === 'Completed' ? '#dcfce7' : '#fef3c7'),
                              color: b.status === 'Cancelled' ? '#ef4444' : (b.status === 'Consulted' || b.status === 'Completed' ? '#10b981' : '#d97706')
                            }]}>
                              {b.status}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}
            </View>
          );
        } else {
          const filteredOrders = (executive.ordersList || []).filter((order: any) => {
            const searchStr = tableSearch.toLowerCase().trim();
            const matchesSearch = searchStr === '' ||
              String(order.orderNo || '').toLowerCase().includes(searchStr) ||
              String(order.invoiceNo || '').toLowerCase().includes(searchStr) ||
              String(order.customerName || '').toLowerCase().includes(searchStr) ||
              String(order.customerPhone || '').toLowerCase().includes(searchStr);
            
            let resolvedType = String(order.type || '').toLowerCase();
            if (resolvedType === 'manual') {
              resolvedType = String(order.modeOfDelivery || '').toLowerCase() === 'bus' ? 'bus' : String(order.modeOfDelivery || '').toLowerCase() === 'schedule delivery' ? 'scheduled' : 'local';
            } else if (resolvedType === 'online') {
              resolvedType = 'local';
            } else if (resolvedType === 'sales_invoice' || resolvedType === 'sales_order') {
              resolvedType = 'counter';
            }
            
            const matchesType = tableType === '' || resolvedType === tableType.toLowerCase();
            const matchesStatus = tableStatus === '' || String(order.status || '').toLowerCase() === tableStatus.toLowerCase();
            
            return matchesSearch && matchesType && matchesStatus;
          });

          const sortedOrders = [...filteredOrders].sort((a: any, b: any) => {
            const tA = a.assignedAt ? new Date(a.assignedAt).getTime() : 0;
            const tB = b.assignedAt ? new Date(b.assignedAt).getTime() : 0;
            return tB - tA;
          });

          return (
            <View style={[styles.card, { marginTop: 24 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', marginBottom: 16, gap: 12 }}>
                <Text style={styles.sectionTitle}>Executive's Deliveries Details ({riders.find(r => r.riderId === filterRiderId)?.name || 'Filtered Executive'})</Text>
                
                {Platform.OS === 'web' && (
                  <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <TextInput
                      style={[styles.input, { width: 220, height: 38, paddingVertical: 0 }]}
                      placeholder="Search by Order, Name, Phone..."
                      value={tableSearch}
                      onChangeText={setTableSearch}
                    />
                    
                    <select
                      value={tableType}
                      onChange={(e) => setTableType(e.target.value)}
                      style={StyleSheet.flatten([styles.webSelect, { height: 38, width: 140, minWidth: 120 }]) as any}
                    >
                      <option value="">All Types</option>
                      <option value="Local">Local</option>
                      <option value="Bus">Bus</option>
                      <option value="Scheduled">Scheduled</option>
                      <option value="Counter">Counter</option>
                    </select>

                    <select
                      value={tableStatus}
                      onChange={(e) => setTableStatus(e.target.value)}
                      style={StyleSheet.flatten([styles.webSelect, { height: 38, width: 140, minWidth: 120 }]) as any}
                    >
                      <option value="">All Statuses</option>
                      <option value="assigned">Assigned</option>
                      <option value="picked up">Picked Up</option>
                      <option value="delivered">Delivered</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="returned">Returned</option>
                      <option value="failed">Failed</option>
                    </select>
                  </View>
                )}
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                <View style={styles.table}>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.th, { width: 100 }]}>Order No</Text>
                    <Text style={[styles.th, { width: 100 }]}>Invoice No</Text>
                    <Text style={[styles.th, { width: 100 }]}>Method</Text>
                    <Text style={[styles.th, { width: 150 }]}>Customer Name</Text>
                    <Text style={[styles.th, { width: 100 }]}>Status</Text>
                    <Text style={[styles.th, { width: 150 }]}>Assigned Time</Text>
                    <Text style={[styles.th, { width: 150 }]}>Picked Up Time</Text>
                    <Text style={[styles.th, { width: 150 }]}>Delivered Time</Text>
                    <Text style={[styles.th, { width: 140 }]}>Assigned to Deliv.</Text>
                    <Text style={[styles.th, { width: 140 }]}>Pickup to Deliv.</Text>
                  </View>

                  {sortedOrders.length === 0 ? (
                    <View style={{ padding: 24, alignItems: 'center' }}>
                      <Text style={{ color: '#64748B', fontSize: 13 }}>No matching deliveries found for the selected filters.</Text>
                    </View>
                  ) : (
                    sortedOrders.map((order: any, idx: number) => {
                      const formatTime = (ts: string) => {
                        if (!ts) return 'N/A';
                        return new Date(ts).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });
                      };
                      const formatDuration = (mins: number) => {
                        if (mins === null || mins === undefined) return 'N/A';
                        if (mins < 60) return `${mins} mins`;
                        const hrs = Math.floor(mins / 60);
                        const rem = mins % 60;
                        return `${hrs}h ${rem}m`;
                      };
                      return (
                        <View key={order.id || idx} style={styles.tableRow}>
                          <Text style={[styles.td, { width: 100, fontWeight: '700' }]}>{order.orderNo}</Text>
                          <Text style={[styles.td, { width: 100 }]}>{order.invoiceNo || 'N/A'}</Text>
                          <Text style={[styles.td, { width: 100, textTransform: 'capitalize' }]}>
                            {String(order.type).toLowerCase() === 'manual'
                              ? (String(order.modeOfDelivery).toLowerCase() === 'bus' ? 'Bus' : String(order.modeOfDelivery).toLowerCase() === 'schedule delivery' ? 'Scheduled' : 'Local')
                              : String(order.type).toLowerCase() === 'online'
                              ? 'Local'
                              : (String(order.type).toLowerCase() === 'sales_invoice' || String(order.type).toLowerCase() === 'sales_order')
                              ? 'Counter'
                              : order.type}
                          </Text>
                          <View style={{ width: 150, paddingVertical: 6 }}>
                            <Text style={{ fontWeight: '600', fontSize: 12, color: '#1e293b' }}>{order.customerName}</Text>
                            <Text style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{order.customerPhone}</Text>
                          </View>
                          <Text style={[styles.td, { width: 100, fontWeight: '600' }]}>{order.status}</Text>
                          <Text style={[styles.td, { width: 150 }]}>{formatTime(order.assignedAt)}</Text>
                          <Text style={[styles.td, { width: 150 }]}>{formatTime(order.pickedUpAt)}</Text>
                          <Text style={[styles.td, { width: 150 }]}>{formatTime(order.deliveredAt)}</Text>
                          <Text style={[styles.td, { width: 140, fontWeight: '600', color: '#4F46E5' }]}>{formatDuration(order.assignedToDeliveryDuration)}</Text>
                          <Text style={[styles.td, { width: 140, fontWeight: '600', color: '#10B981' }]}>{formatDuration(order.pickupToDeliveryDuration)}</Text>
                        </View>
                      );
                    })
                  )}
                </View>
              </ScrollView>
            </View>
          );
        }
      })()}

      {/* Stats KPI Calculation Legend */}
      <View style={[styles.card, { marginTop: 24, backgroundColor: '#f8fafc', borderColor: '#e2e8f0', borderWidth: 1 }]}>
        <Text style={[styles.sectionTitle, { color: '#1e293b', marginBottom: 8 }]}>How Statistics are Calculated</Text>
        {dashboardType === 'doctor' ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
            <View style={{ flex: 1, minWidth: 200 }}>
              <Text style={{ fontWeight: '700', fontSize: 13, color: '#475569', marginBottom: 2 }}>Completion Rate</Text>
              <Text style={{ fontSize: 12, color: '#64748b', lineHeight: 16 }}>Calculated as (Completed Consultations / Total Booked Tokens) × 100.</Text>
            </View>
            <View style={{ flex: 1, minWidth: 200 }}>
              <Text style={{ fontWeight: '700', fontSize: 13, color: '#475569', marginBottom: 2 }}>Total Revenue</Text>
              <Text style={{ fontSize: 12, color: '#64748b', lineHeight: 16 }}>Sum of all booking slot fees for consultations (excluding Cancelled tokens).</Text>
            </View>
            <View style={{ flex: 1, minWidth: 200 }}>
              <Text style={{ fontWeight: '700', fontSize: 13, color: '#475569', marginBottom: 2 }}>Doctor Payout</Text>
              <Text style={{ fontSize: 12, color: '#64748b', lineHeight: 16 }}>Commission payouts calculated as Booking Fee × Fee Share % for active slots.</Text>
            </View>
            <View style={{ flex: 1, minWidth: 200 }}>
              <Text style={{ fontWeight: '700', fontSize: 13, color: '#475569', marginBottom: 2 }}>BMH Net Share</Text>
              <Text style={{ fontSize: 12, color: '#64748b', lineHeight: 16 }}>Net revenue kept by BMH (Booking Fee × (1 - Fee Share %)).</Text>
            </View>
          </View>
        ) : dashboardType === 'employee' ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
            <View style={{ flex: 1, minWidth: 200 }}>
              <Text style={{ fontWeight: '700', fontSize: 13, color: '#475569', marginBottom: 2 }}>Task Completion Rate</Text>
              <Text style={{ fontSize: 12, color: '#64748b', lineHeight: 16 }}>Calculated as (Completed Tasks / Assigned Tasks) × 100.</Text>
            </View>
            <View style={{ flex: 1, minWidth: 200 }}>
              <Text style={{ fontWeight: '700', fontSize: 13, color: '#475569', marginBottom: 2 }}>Hours Worked</Text>
              <Text style={{ fontSize: 12, color: '#64748b', lineHeight: 16 }}>Accumulated session check-in to check-out hours parsed from attendance logs.</Text>
            </View>
            <View style={{ flex: 1, minWidth: 200 }}>
              <Text style={{ fontWeight: '700', fontSize: 13, color: '#475569', marginBottom: 2 }}>Bookings & Revenue</Text>
              <Text style={{ fontSize: 12, color: '#64748b', lineHeight: 16 }}>Sum of patient bookings created by this employee and corresponding consultation fees collected (excludes Cancelled bookings).</Text>
            </View>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
            <View style={{ flex: 1, minWidth: 200 }}>
              <Text style={{ fontWeight: '700', fontSize: 13, color: '#475569', marginBottom: 2 }}>Success %</Text>
              <Text style={{ fontSize: 12, color: '#64748b', lineHeight: 16 }}>Calculated as (Delivered Orders / Assigned Orders) × 100.</Text>
            </View>
            <View style={{ flex: 1, minWidth: 200 }}>
              <Text style={{ fontWeight: '700', fontSize: 13, color: '#475569', marginBottom: 2 }}>Avg Time</Text>
              <Text style={{ fontSize: 12, color: '#64748b', lineHeight: 16 }}>Average duration in minutes from order "Picked Up" by the rider to "Delivered".</Text>
            </View>
            <View style={{ flex: 1, minWidth: 200 }}>
              <Text style={{ fontWeight: '700', fontSize: 13, color: '#475569', marginBottom: 2 }}>Distance</Text>
              <Text style={{ fontSize: 12, color: '#64748b', lineHeight: 16 }}>Straight-line aerial distance (Haversine formula) from department store to order destination.</Text>
            </View>
            <View style={{ flex: 1, minWidth: 200 }}>
              <Text style={{ fontWeight: '700', fontSize: 13, color: '#475569', marginBottom: 2 }}>Attendance</Text>
              <Text style={{ fontSize: 12, color: '#64748b', lineHeight: 16 }}>Total number of days the executive checked in / had attendance logs during the range.</Text>
            </View>
            <View style={{ flex: 1, minWidth: 200 }}>
              <Text style={{ fontWeight: '700', fontSize: 13, color: '#475569', marginBottom: 2 }}>Rating ★</Text>
              <Text style={{ fontSize: 12, color: '#64748b', lineHeight: 16 }}>Starts at 5.0. Deducts -0.2 for each Failed delivery and -0.1 for each Cancelled delivery (Clamped between 1.0 and 5.0).</Text>
            </View>
          </View>
        )}
      </View>

      {/* Custom Customized Info Popup Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={infoModalVisible}
        onRequestClose={() => setInfoModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{infoModalTitle}</Text>
              <TouchableOpacity onPress={() => setInfoModalVisible(false)} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={true}>
              <Text style={styles.modalMessage}>{infoModalMessage}</Text>
            </ScrollView>
            <TouchableOpacity 
              style={styles.modalGotItBtn} 
              onPress={() => setInfoModalVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalGotItText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#4B5563',
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  refreshBtn: {
    backgroundColor: Colors.light.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  refreshText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  filtersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    alignItems: 'flex-end',
  },
  filterGroup: {
    flex: 1,
    minWidth: 200,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 8,
  },
  webSelect: {
    width: '100%',
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    fontSize: 14,
    color: '#111827',
  },
  input: {
    width: '100%',
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    fontSize: 14,
  },
  periodTabs: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 4,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  periodTabActive: {
    backgroundColor: '#fff',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  periodTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  periodTabActiveText: {
    color: Colors.light.primary,
  },
  resetBtn: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetBtnText: {
    color: '#4B5563',
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  kpiCard: {
    flex: 1,
    minWidth: 220,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginTop: 2,
  },
  kpiSub: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  paymentsSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 8,
  },
  paymentCol: {
    alignItems: 'center',
  },
  paymentLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  paymentValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginTop: 4,
  },
  paymentSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  paymentDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
  },
  rankingsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    marginTop: 20,
  },
  rankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
  },
  rankName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  rankDetails: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  rankScore: {
    fontSize: 16,
    fontWeight: '800',
  },
  table: {
    minWidth: 900,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
  },
  th: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  td: {
    fontSize: 14,
    color: '#4B5563',
    paddingHorizontal: 8,
  },
  riderName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    paddingHorizontal: 8,
  },
  riderPhone: {
    fontSize: 11,
    color: '#6B7280',
    paddingHorizontal: 8,
    marginTop: 2,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    fontSize: 12,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 480,
    maxHeight: '80%',
    padding: 24,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 12,
    marginBottom: 16
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a'
  },
  modalCloseBtn: {
    padding: 4
  },
  modalCloseBtnText: {
    fontSize: 16,
    color: '#94a3b8',
    fontWeight: '700'
  },
  modalBody: {
    marginBottom: 20,
    maxHeight: 300
  },
  modalMessage: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 20
  },
  modalGotItBtn: {
    backgroundColor: '#4F46E5',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  modalGotItText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13
  },
  toggleTabContainer: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderRadius: 10,
    padding: 4,
    marginBottom: 24,
    alignSelf: 'flex-start',
    width: 320,
  },
  toggleTabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  toggleTabButtonActive: {
    backgroundColor: '#4F46E5',
  },
  toggleTabButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  toggleTabButtonActiveText: {
    color: '#ffffff',
  },
});
