import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable, Platform, Modal, TextInput, Alert, ScrollView, Image, TouchableWithoutFeedback } from 'react-native';
import { Plus, Search, MoreVertical, Shield, Building, User } from 'lucide-react-native';
import axios from 'axios';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Colors } from '../../../constants/Colors';
import { useResponsive } from '../../../hooks/useResponsive';
import { API_URL } from '../../../config';
import CustomDropdown from '../../../components/ui/CustomDropdown';
import CustomTimePicker from '../../../components/ui/CustomTimePicker';

type Employee = {
  id: string;
  full_name: string;
  email: string;
  department: string;
  role: string;
  status: string;
  profile_data?: string;
};

const formatDateToDDMMYYYY = (dateStr: string | null) => {
  if (!dateStr) return 'N/A';
  const match = dateStr.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }
  const matchIso = dateStr.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
  if (matchIso) {
    return `${matchIso[3]}-${matchIso[2]}-${matchIso[1]}`;
  }
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    }
  } catch (e) {}
  return dateStr;
};

const formatTimeTo12Hr = (timeStr: string | null | undefined) => {
  if (!timeStr || timeStr === 'N/A') return 'N/A';
  const trimmed = timeStr.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) {
    if (trimmed.toLowerCase().includes('am') || trimmed.toLowerCase().includes('pm')) {
      return trimmed;
    }
    return trimmed;
  }
  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const strHours = String(hours).padStart(2, '0');
  return `${strHours}:${minutes} ${ampm}`;
};

type Department = { id: string; name: string; };
type Role = { id: string; name: string; departmentId: string; };

export default function EmployeesScreen() {
  const { isDesktop } = useResponsive();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);

  const [loading, setLoading] = useState(true);

  const [rolesModalVisible, setRolesModalVisible] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const [newRoleName, setNewRoleName] = useState('');
  const [selectedDeptForRole, setSelectedDeptForRole] = useState('all');
  const [addingRole, setAddingRole] = useState(false);
  const [employeePayslips, setEmployeePayslips] = useState<any[]>([]);

  // Payslip Generation
  const [generatePayslipMonth, setGeneratePayslipMonth] = useState('');
  const [appreciationAmount, setAppreciationAmount] = useState('0');
  const [extraWorkingAmount, setExtraWorkingAmount] = useState('0');
  const [generatingPayslip, setGeneratingPayslip] = useState(false);

  const [selectedUserType, setSelectedUserType] = useState('employee');
  const [searchQuery, setSearchQuery] = useState('');

  // Department filter states
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('all');
  const [deptSearchQuery, setDeptSearchQuery] = useState('');
  const [isDeptDropdownOpen, setIsDeptDropdownOpen] = useState(false);

  // Edit Profile States
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editSalary, setEditSalary] = useState('');
  const [editShiftIn, setEditShiftIn] = useState('');
  const [editShiftOut, setEditShiftOut] = useState('');
  const [editBreakStart, setEditBreakStart] = useState('');
  const [editBreakEnd, setEditBreakEnd] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    const fetchEmployees = async () => {
      setLoading(true);
      try {
        const [empRes, adminRes, deptRes, roleRes] = await Promise.all([
          axios.get('https://napi.bharatmedicalhallplus.com/employees'),
          axios.get('https://napi.bharatmedicalhallplus.com/admin/department-admins'),
          axios.get('https://napi.bharatmedicalhallplus.com/department'),
          axios.get('https://napi.bharatmedicalhallplus.com/roles')
        ]);

        let depts: any[] = [];
        if (deptRes.data.success) {
          depts = deptRes.data.data;
          setDepartments(depts);
        }

        if (selectedUserType === 'employee') {
          if (empRes.data.success) setEmployees(empRes.data.data);
        } else {
          if (adminRes.data.success) {
            const mappedAdmins = adminRes.data.data?.map((a: any) => ({
              ...a,
              role: 'Sub Admin',
              department: depts.find(d => String(d.id) === String(a.department_id))?.name || 'Unknown'
            }));
            setEmployees(mappedAdmins);
          }
        }

        if (roleRes.data.success) setRoles(roleRes.data.data);
      } catch (error) {
        console.error('Error fetching employees:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, [selectedUserType]);

  useEffect(() => {
    if (selectedEmployee) {
      axios.get(`${API_URL}/leave/payslips?employee_id=${selectedEmployee.id}`)
        .then(res => setEmployeePayslips(res.data))
        .catch(err => console.error(err));
    } else {
      setEmployeePayslips([]);
    }
  }, [selectedEmployee]);

  const handleGeneratePayslip = async () => {
    if (!selectedEmployee) return;
    if (!generatePayslipMonth) {
      Alert.alert('Error', 'Please enter a month (YYYY-MM)');
      return;
    }
    setGeneratingPayslip(true);
    try {
      const res = await axios.post(`${API_URL}/leave/payslips/generate`, {
        employee_id: selectedEmployee.id,
        user_type: selectedEmployee.role === 'Sub Admin' ? 'sub_admin' : 'employee',
        month: generatePayslipMonth,
        appreciation_amount: appreciationAmount ? Number(appreciationAmount) : 0,
        extra_working_amount: extraWorkingAmount ? Number(extraWorkingAmount) : 0
      });
      if (res.data.success) {
        Alert.alert('Success', 'Payslip generated successfully!');
        // Refresh payslips
        const refreshRes = await axios.get(`${API_URL}/leave/payslips?employee_id=${selectedEmployee.id}`);
        setEmployeePayslips(refreshRes.data);
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to generate payslip');
    } finally {
      setGeneratingPayslip(false);
    }
  };

  const handleAddRole = async () => {
    if (!newRoleName) {
      Alert.alert('Error', 'Role name is required');
      return;
    }
    setAddingRole(true);
    try {
      const response = await axios.post('https://napi.bharatmedicalhallplus.com/roles', {
        name: newRoleName,
        departmentId: selectedDeptForRole
      });
      if (response.data.success) {
        setRoles([...roles, response.data.data]);
        setNewRoleName('');
        Alert.alert('Success', 'Role added successfully');
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to add role');
    } finally {
      setAddingRole(false);
    }
  };

  const handleUpdateStatus = async (employeeId: string, newStatus: string) => {
    try {
      let cleanId = String(employeeId);
      if (cleanId.startsWith('SA-')) cleanId = cleanId.replace('SA-', '');
      if (cleanId.startsWith('EMP-')) cleanId = cleanId.replace('EMP-', '');

      const endpoint = selectedUserType === 'sub_admin'
        ? `https://napi.bharatmedicalhallplus.com/admin/department-admins/${cleanId}/status`
        : `https://napi.bharatmedicalhallplus.com/employees/${cleanId}/status`;

      const response = await axios.put(endpoint, {
        status: newStatus
      });
      if (response.data.success) {
        setEmployees(employees?.map(e => String(e.id) === String(employeeId) ? { ...e, status: newStatus } : e));
      }
    } catch (error) {
      Alert.alert('Error', `Failed to update status to ${newStatus}`);
      console.error(error);
    }
  };

  const getDeptName = (deptId: string) => {
    if (deptId === 'all') return 'All Departments';
    return departments.find(d => String(d.id) === String(deptId))?.name || 'Unknown';
  };

  const getFullDetails = (item: any) => {
    let pd: any = {};
    if (item.profile_data) {
      if (typeof item.profile_data === 'string') {
        try {
          pd = JSON.parse(item.profile_data);
        } catch (e) {
          console.error(e);
        }
      } else if (typeof item.profile_data === 'object') {
        pd = item.profile_data;
      }
    }

    const id = item.employee_id || item.id || 'N/A';
    const fullName = item.full_name || 'N/A';
    const email = item.email || 'N/A';
    const mobile = item.mobile || pd.mobile || 'N/A';
    const dob = formatDateToDDMMYYYY(item.dob);
    const department = item.department || 'N/A';
    const role = item.role || 'N/A';
    const status = item.status || 'N/A';

    // Personal/Identification
    const age = pd.age || 'N/A';
    const bloodGroup = pd.bloodGroup || item.blood_group || pd.blood_group || 'N/A';
    const emergencyContact = pd.emergencyContact || 'N/A';

    // Statutory/Compliance
    const aadhaar = pd.aadhaar || 'N/A';
    const pan = pd.pan || 'N/A';
    const esi = pd.esi || 'N/A';

    // Payroll/Banking
    const salary = pd.salary || 'N/A';
    const bankName = pd.bankName || pd.bank_account?.bankName || 'N/A';
    const accountNo = pd.accountNo || pd.bank_account?.accountNo || 'N/A';
    const ifsc = pd.ifsc || pd.bank_account?.ifsc || 'N/A';
    const branch = pd.branch || pd.bank_account?.branch || 'N/A';

    // Operations/Shifts
    const manager = pd.manager || 'N/A';
    const shiftIn = item.schedule_in || pd.shiftIn || 'N/A';
    const shiftOut = item.schedule_out || pd.shiftOut || 'N/A';
    const breakStart = item.break_in || pd.breakStart || 'N/A';
    const breakEnd = item.break_out || pd.breakEnd || 'N/A';
    const weeklyOff = item.weekly_off_days || pd.weeklyOff || 'N/A';

    return {
      id, fullName, email, mobile, dob, department, role, status,
      age, bloodGroup, emergencyContact, aadhaar, pan, esi,
      salary, bankName, accountNo, ifsc, branch, manager,
      shiftIn, shiftOut, breakStart, breakEnd, weeklyOff
    };
  };

  const csvEscape = (val: string | number) => {
    const str = String(val === null || val === undefined ? '' : val);
    return `"${str.replace(/"/g, '""')}"`;
  };

  const formatCsvText = (val: string | number) => {
    const str = String(val === null || val === undefined ? '' : val).trim();
    if (str === 'N/A' || str === '') return str;
    if (/^\d+$/.test(str)) {
      return `="${str}"`;
    }
    return str;
  };

  const handleExportCSV = async () => {
    const filtered = getFilteredEmployees();
    if (!filtered || filtered.length === 0) {
      Alert.alert('Info', 'No records to export.');
      return;
    }

    const headers = [
      'ID', 'Full Name', 'Email', 'Mobile', 'DOB', 'Department', 'Role', 'Status',
      'Age', 'Blood Group', 'Emergency Contact', 'Aadhaar ID', 'PAN Card', 'ESI ID',
      'Base Salary', 'Bank Name', 'Account No', 'IFSC', 'Branch', 'Manager',
      'Shift In', 'Shift Out', 'Break Start', 'Break End', 'Weekly Off Days'
    ];

    let csvContent = headers.map(csvEscape).join(',') + '\n';

    filtered.forEach(emp => {
      const details = getFullDetails(emp);
      const row = [
        details.id, details.fullName, details.email, formatCsvText(details.mobile), details.dob, details.department, details.role, details.status,
        details.age, details.bloodGroup, formatCsvText(details.emergencyContact), formatCsvText(details.aadhaar), details.pan, details.esi,
        details.salary, details.bankName, formatCsvText(details.accountNo), details.ifsc, details.branch, details.manager,
        details.shiftIn, details.shiftOut, details.breakStart, details.breakEnd, details.weeklyOff
      ];
      csvContent += row.map(csvEscape).join(',') + '\n';
    });

    const filename = `${selectedUserType === 'employee' ? 'employees' : 'sub_admins'}_export.csv`;

    if (Platform.OS === 'web') {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('href', url);
      a.setAttribute('download', filename);
      a.click();
      window.URL.revokeObjectURL(url);
    } else {
      try {
        const uri = (FileSystem as any).documentDirectory + filename;
        await (FileSystem as any).writeAsStringAsync(uri, csvContent, { encoding: (FileSystem as any).EncodingType.UTF8 });
        await Sharing.shareAsync(uri);
      } catch (err) {
        console.error('CSV Export error:', err);
        Alert.alert('Error', 'Failed to share/save CSV export.');
      }
    }
  };

  const handlePrintEmployees = async () => {
    const filtered = getFilteredEmployees();
    if (!filtered || filtered.length === 0) {
      Alert.alert('Info', 'No records to print.');
      return;
    }

    const cardsHtml = filtered.map(emp => {
      const d = getFullDetails(emp);
      return `
        <div class="employee-card">
          <div class="employee-header">
            <div>
              <h2 class="employee-title">${d.fullName}</h2>
              <div class="employee-meta">${d.role} &bull; ${d.department}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-weight: bold; color: #1e3a8a;">ID: ${d.id}</div>
              <div style="font-size: 12px; color: ${d.status === 'approved' ? '#059669' : '#d97706'}; font-weight: bold; text-transform: uppercase;">
                Status: ${d.status}
              </div>
            </div>
          </div>
          <div class="details-grid">
            <div class="details-section">
              <div class="section-title">Personal & Contact</div>
              <div class="info-row"><span class="info-label">Email:</span><span class="info-value">${d.email}</span></div>
              <div class="info-row"><span class="info-label">Mobile:</span><span class="info-value">${d.mobile}</span></div>
              <div class="info-row"><span class="info-label">DOB:</span><span class="info-value">${d.dob}</span></div>
              <div class="info-row"><span class="info-label">Age:</span><span class="info-value">${d.age} yrs</span></div>
              <div class="info-row"><span class="info-label">Blood Group:</span><span class="info-value">${d.bloodGroup}</span></div>
              <div class="info-row"><span class="info-label">Emergency Contact:</span><span class="info-value">${d.emergencyContact}</span></div>
            </div>
            <div class="details-section">
              <div class="section-title">Statutory & Compliance</div>
              <div class="info-row"><span class="info-label">Aadhaar ID:</span><span class="info-value">${d.aadhaar}</span></div>
              <div class="info-row"><span class="info-label">PAN Card:</span><span class="info-value">${d.pan}</span></div>
              <div class="info-row"><span class="info-label">ESI ID:</span><span class="info-value">${d.esi}</span></div>
            </div>
            <div class="details-section">
              <div class="section-title">Payroll & Banking</div>
              <div class="info-row"><span class="info-label">Base Salary:</span><span class="info-value">${d.salary !== 'N/A' ? '₹' + d.salary : 'N/A'}</span></div>
              <div class="info-row"><span class="info-label">Bank Name:</span><span class="info-value">${d.bankName}</span></div>
              <div class="info-row"><span class="info-label">Account No:</span><span class="info-value">${d.accountNo}</span></div>
              <div class="info-row"><span class="info-label">IFSC / Branch:</span><span class="info-value">${d.ifsc} / ${d.branch}</span></div>
            </div>
            <div class="details-section">
              <div class="section-title">Operations & Shifts</div>
              <div class="info-row"><span class="info-label">Manager:</span><span class="info-value">${d.manager}</span></div>
              <div class="info-row"><span class="info-label">Shift Time:</span><span class="info-value">${d.shiftIn !== 'N/A' && d.shiftOut !== 'N/A' ? `${formatTimeTo12Hr(d.shiftIn)} - ${formatTimeTo12Hr(d.shiftOut)}` : 'N/A'}</span></div>
              <div class="info-row"><span class="info-label">Break Window:</span><span class="info-value">${d.breakStart !== 'N/A' && d.breakEnd !== 'N/A' ? `${formatTimeTo12Hr(d.breakStart)} - ${formatTimeTo12Hr(d.breakEnd)}` : 'N/A'}</span></div>
              <div class="info-row"><span class="info-label">Weekly Off:</span><span class="info-value">${d.weeklyOff}</span></div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    const htmlContent = `
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Staff Report</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #334155;
              margin: 0;
              padding: 20px;
              background-color: #fff;
            }
            h1 {
              text-align: center;
              color: #1e3a8a;
              margin-bottom: 5px;
              font-size: 24px;
            }
            .report-meta {
              text-align: center;
              color: #64748b;
              margin-bottom: 25px;
              font-size: 14px;
            }
            .employee-card {
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 20px;
              margin-bottom: 25px;
              background-color: #fff;
              page-break-inside: avoid;
              box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
            }
            .employee-header {
              border-bottom: 2px solid #3b82f6;
              padding-bottom: 10px;
              margin-bottom: 15px;
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
            }
            .employee-title {
              margin: 0;
              font-size: 18px;
              color: #0f172a;
            }
            .employee-meta {
              font-size: 13px;
              color: #64748b;
              margin-top: 4px;
            }
            .details-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 15px;
            }
            @media (max-width: 600px) {
              .details-grid {
                grid-template-columns: 1fr;
              }
            }
            .details-section {
              background: #f8fafc;
              padding: 12px 16px;
              border-radius: 8px;
              border: 1px solid #e2e8f0;
            }
            .section-title {
              font-weight: 700;
              font-size: 11px;
              text-transform: uppercase;
              color: #64748b;
              margin-bottom: 10px;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 4px;
              letter-spacing: 0.5px;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              font-size: 13px;
              margin-bottom: 6px;
              line-height: 1.4;
            }
            .info-label {
              color: #64748b;
              font-weight: 500;
            }
            .info-value {
              color: #0f172a;
              font-weight: 600;
              text-align: right;
              max-width: 65%;
              word-break: break-all;
            }
            @media print {
              body { padding: 0; }
              .employee-card {
                box-shadow: none;
                border: 1px solid #cbd5e1;
              }
            }
          </style>
        </head>
        <body>
          <h1>Bharat Medical Hall - ${selectedUserType === 'employee' ? 'Employees' : 'Sub Admins'} Report</h1>
          <div class="report-meta">
            Generated on: ${new Date().toLocaleDateString('en-GB')} &bull; Filtered by Department: ${selectedDeptFilter === 'all' ? 'All' : selectedDeptFilter}
          </div>
          ${cardsHtml}
        </body>
      </html>
    `;

    try {
      if (Platform.OS === 'web') {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
        iframe.contentDocument?.write(htmlContent);
        iframe.contentDocument?.close();
        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          setTimeout(() => {
            document.body.removeChild(iframe);
          }, 1000);
        }, 250);
      } else {
        if (typeof Print !== 'undefined') {
          await Print.printAsync({ html: htmlContent });
        }
      }
    } catch (err) {
      console.error('Print error:', err);
      Alert.alert('Error', 'Failed to print report.');
    }
  };

  const getFilteredEmployees = () => {
    let result = employees;

    if (selectedDeptFilter !== 'all') {
      result = result.filter(emp => emp.department === selectedDeptFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(emp => {
        return (
          emp.full_name?.toLowerCase().includes(query) ||
          emp.email?.toLowerCase().includes(query)
        );
      });
    }

    return result;
  };

  const renderHeader = () => {
    if (!isDesktop) return null;
    return (
      <View style={[styles.tableRow, styles.tableHeader]}>
        <Text style={[styles.cell, { flex: 2, fontWeight: '700', color: Colors.light.icon }]}>Name</Text>
        {isDesktop && <Text style={[styles.cell, { flex: 2.5, fontWeight: '700', color: Colors.light.icon }]}>Email</Text>}
        {isDesktop && <Text style={[styles.cell, { flex: 1.5, fontWeight: '700', color: Colors.light.icon }]}>DOB</Text>}
        <Text style={[styles.cell, { flex: 1.5, fontWeight: '700', color: Colors.light.icon }]}>Department</Text>
        <Text style={[styles.cell, { flex: 1, fontWeight: '700', color: Colors.light.icon }]}>Role</Text>
        <Text style={[styles.cell, { width: 180, fontWeight: '700', color: Colors.light.icon }]}>Status</Text>
        <View style={{ width: 40 }} />
      </View>
    );
  };

  const renderItem = ({ item }: { item: Employee }) => {
    if (!isDesktop) {
      return (
        <View style={styles.adminRow}>
          <View style={[styles.adminAvatar, { backgroundColor: '#10B981' }]}>
            <Text style={styles.adminInitials}>{item.full_name.charAt(0)}</Text>
          </View>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.adminName} numberOfLines={1}>{item.full_name}</Text>
            <Text style={styles.adminEmail} numberOfLines={1}>{item.department} • {item.role}</Text>
            <Text style={styles.adminEmail} numberOfLines={1}>{item.email} • DOB: {formatDateToDDMMYYYY((item as any).dob)}</Text>
          </View>
          <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
              <View style={[styles.statusBadge, item.status === 'approved' ? styles.statusApproved : item.status === 'pending' ? styles.statusPending : { backgroundColor: '#fee2e2' }]}>
                <Text style={[styles.statusText, item.status === 'approved' ? styles.textApproved : item.status === 'pending' ? styles.textPending : { color: '#dc2626' }]}>
                  {item.status}
                </Text>
              </View>
              {item.status === 'pending' && (
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <Pressable style={[styles.statusBadge, { backgroundColor: Colors.light.primary, paddingHorizontal: 10, paddingVertical: 4 }]} onPress={() => handleUpdateStatus(item.id, 'approved')}>
                    <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>Approve</Text>
                  </Pressable>
                  <Pressable style={[styles.statusBadge, { backgroundColor: '#ef4444', paddingHorizontal: 10, paddingVertical: 4 }]} onPress={() => handleUpdateStatus(item.id, 'rejected')}>
                    <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>Reject</Text>
                  </Pressable>
                </View>
              )}
              {item.status === 'approved' && (
                <Pressable style={[styles.statusBadge, { backgroundColor: '#f97316', paddingHorizontal: 10, paddingVertical: 4 }]} onPress={() => handleUpdateStatus(item.id, 'deactivated')}>
                  <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>Deactivate</Text>
                </Pressable>
              )}
              {(item.status === 'deactivated' || item.status === 'rejected') && (
                <Pressable style={[styles.statusBadge, { backgroundColor: Colors.light.primary, paddingHorizontal: 10, paddingVertical: 4 }]} onPress={() => handleUpdateStatus(item.id, 'approved')}>
                  <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>Approve</Text>
                </Pressable>
              )}
            </View>
            <Pressable
              style={styles.actionBtnMobile}
              onPress={() => { setSelectedEmployee(item); setProfileModalVisible(true); }}
            >
              <MoreVertical size={20} color={Colors.light.icon} />
            </Pressable>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.tableRow}>
        <Text style={[styles.cell, { flex: 2, fontWeight: '600' }]}>{item.full_name}</Text>
        {isDesktop && <Text style={[styles.cell, { flex: 2.5, color: Colors.light.icon }]}>{item.email}</Text>}
        {isDesktop && <Text style={[styles.cell, { flex: 1.5, color: Colors.light.icon }]}>{formatDateToDDMMYYYY((item as any).dob)}</Text>}
        <Text style={[styles.cell, { flex: 1.5 }]}>{item.department}</Text>
        <Text style={[styles.cell, { flex: 1 }]}>{item.role}</Text>
        <View style={{ width: 180, flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <View style={[styles.statusBadge, item.status === 'approved' ? styles.statusApproved : item.status === 'pending' ? styles.statusPending : { backgroundColor: '#fee2e2' }]}>
            <Text style={[styles.statusText, item.status === 'approved' ? styles.textApproved : item.status === 'pending' ? styles.textPending : { color: '#dc2626' }]}>{item.status}</Text>
          </View>
          {item.status === 'pending' && (
            <>
              <Pressable style={[styles.statusBadge, { backgroundColor: Colors.light.primary }]} onPress={() => handleUpdateStatus(item.id, 'approved')}>
                <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>Approve</Text>
              </Pressable>
              <Pressable style={[styles.statusBadge, { backgroundColor: '#ef4444' }]} onPress={() => handleUpdateStatus(item.id, 'rejected')}>
                <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>Reject</Text>
              </Pressable>
            </>
          )}
          {item.status === 'approved' && (
            <Pressable style={[styles.statusBadge, { backgroundColor: '#f97316' }]} onPress={() => handleUpdateStatus(item.id, 'deactivated')}>
              <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>Deactivate</Text>
            </Pressable>
          )}
          {(item.status === 'deactivated' || item.status === 'rejected') && (
            <Pressable style={[styles.statusBadge, { backgroundColor: Colors.light.primary }]} onPress={() => handleUpdateStatus(item.id, 'approved')}>
              <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>Approve</Text>
            </Pressable>
          )}
        </View>
        <Pressable
          style={styles.actionBtn}
          onPress={() => { setSelectedEmployee(item); setProfileModalVisible(true); }}
        >
          <MoreVertical size={20} color={Colors.light.icon} />
        </Pressable>
      </View>
    );
  };

  return (
    <View style={[styles.container, !isDesktop && styles.containerMobile]}>
      <View style={[styles.header, !isDesktop && styles.headerMobile]}>
        <View>
          <Text style={styles.title}>Employees & Admins</Text>
          <Text style={styles.subtitle}>Manage your hospital staff.</Text>
        </View>
        <View style={[styles.headerButtons, !isDesktop && styles.headerButtonsMobile]}>
          <View style={styles.userTypeToggle}>
            <Pressable
              style={[styles.toggleBtn, selectedUserType === 'employee' && styles.toggleBtnActive]}
              onPress={() => setSelectedUserType('employee')}
            >
              <Text style={[styles.toggleText, selectedUserType === 'employee' && styles.toggleTextActive]}>Employees</Text>
            </Pressable>
            <Pressable
              style={[styles.toggleBtn, selectedUserType === 'sub_admin' && styles.toggleBtnActive]}
              onPress={() => setSelectedUserType('sub_admin')}
            >
              <Text style={[styles.toggleText, selectedUserType === 'sub_admin' && styles.toggleTextActive]}>Sub Admins</Text>
            </Pressable>
          </View>
          {selectedUserType === 'employee' && (
            <Pressable style={styles.manageRolesBtn} onPress={() => setRolesModalVisible(true)}>
              <Shield size={20} color={Colors.light.primary} />
              <Text style={styles.manageRolesText}>Manage Roles</Text>
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.card}>
        <View style={[styles.toolbar, { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: 'space-between' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap', flex: 1, minWidth: 280 }}>
            <View style={styles.searchBox}>
              <Search size={20} color={Colors.light.icon} style={styles.searchIcon} />
              <TextInput
                style={{
                  flex: 1,
                  fontSize: 15,
                  color: Colors.light.text,
                  padding: 0,
                  height: '100%',
                  ...Platform.select({
                    web: {
                      outlineWidth: 0,
                    } as any
                  })
                }}
                placeholder="Search by name or email..."
                placeholderTextColor={Colors.light.icon}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <Pressable onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
                  <Text style={{ color: Colors.light.icon, fontSize: 16 }}>✕</Text>
                </Pressable>
              ) : null}
            </View>

            <Pressable
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: Colors.light.background,
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: selectedDeptFilter !== 'all' ? Colors.light.primary : 'transparent',
                height: 46,
              }}
              onPress={() => setIsDeptDropdownOpen(true)}
            >
              <Building size={18} color={selectedDeptFilter !== 'all' ? Colors.light.primary : Colors.light.icon} style={{ marginRight: 8 }} />
              <Text style={{ fontSize: 15, color: selectedDeptFilter !== 'all' ? Colors.light.primary : Colors.light.text, fontWeight: selectedDeptFilter !== 'all' ? '600' : '400' }}>
                {selectedDeptFilter === 'all' ? 'All Departments' : `Dept: ${selectedDeptFilter}`}
              </Text>
              {selectedDeptFilter !== 'all' && (
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    setSelectedDeptFilter('all');
                  }}
                  style={{ marginLeft: 8, padding: 2 }}
                >
                  <Text style={{ color: Colors.light.primary, fontWeight: 'bold' }}>✕</Text>
                </Pressable>
              )}
            </Pressable>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Pressable
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#EFF6FF',
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderRadius: 8,
                gap: 8,
                height: 46,
              }}
              onPress={handleExportCSV}
            >
              <Text style={{ color: Colors.light.primary, fontWeight: '600', fontSize: 14 }}>Export CSV</Text>
            </Pressable>

            <Pressable
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#EFF6FF',
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderRadius: 8,
                gap: 8,
                height: 46,
              }}
              onPress={handlePrintEmployees}
            >
              <Text style={{ color: Colors.light.primary, fontWeight: '600', fontSize: 14 }}>Print Report</Text>
            </Pressable>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={Colors.light.primary} style={{ padding: 40 }} />
        ) : (
          <ScrollView horizontal={true} style={{ width: '100%' }} showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
            <View style={{ minWidth: 900, flex: 1 }}>
              <FlatList
                data={getFilteredEmployees()}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={renderHeader}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
              />
            </View>
          </ScrollView>
        )}
      </View>

      {/* Roles Management Modal */}
      <Modal visible={rolesModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDesktop && { width: 600 }]}>
            <Text style={styles.modalTitle}>Manage Roles</Text>

            <View style={styles.addRoleSection}>
              <Text style={styles.sectionLabel}>Add New Role</Text>
              <View style={styles.addRoleRow}>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  placeholder="e.g. Senior Surgeon"
                  value={newRoleName}
                  onChangeText={setNewRoleName}
                />
                <Pressable
                  style={[styles.submitBtn, { paddingVertical: 14 }]}
                  onPress={handleAddRole}
                  disabled={addingRole}
                >
                  <Text style={styles.submitBtnText}>{addingRole ? 'Adding...' : 'Add'}</Text>
                </Pressable>
              </View>

              <Text style={[styles.label, { marginTop: 15, marginBottom: 5 }]}>Assign to Department</Text>
              <View style={{ zIndex: 1000, elevation: 1000, marginBottom: 15 }}>
                <CustomDropdown
                  options={[
                    { label: 'All Departments (Global)', value: 'all' },
                    ...departments?.map(d => ({ label: d.name, value: d.id }))
                  ]}
                  value={selectedDeptForRole}
                  onChange={(val) => setSelectedDeptForRole(val)}
                  placeholder="Select Department"
                />
              </View>
            </View>

            <View style={styles.existingRolesSection}>
              <Text style={styles.sectionLabel}>Existing Roles ({roles.length})</Text>
              <FlatList
                data={roles}
                keyExtractor={(item) => item.id}
                style={{ maxHeight: 300 }}
                renderItem={({ item }) => (
                  <View style={styles.roleItem}>
                    <Shield size={16} color={Colors.light.primary} style={{ marginRight: 12 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.roleNameText}>{item.name}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        <Building size={12} color={Colors.light.icon} style={{ marginRight: 4 }} />
                        <Text style={styles.roleDeptText}>{getDeptName(item.departmentId)}</Text>
                      </View>
                    </View>
                  </View>
                )}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>No roles created yet.</Text>
                }
              />
            </View>

            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setRolesModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Close</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Profile Viewer Modal */}
      <Modal visible={profileModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }, isDesktop && { width: 600 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={[styles.modalTitle, { marginBottom: 0 }]}>Employee Profile</Text>
              {!isEditingProfile ? (
                <Pressable onPress={() => {
                  if (selectedEmployee) {
                    let pd: any = {};
                    if (selectedEmployee.profile_data) {
                      try { pd = JSON.parse(selectedEmployee.profile_data); } catch (e) { }
                    }
                    setEditSalary(pd.salary || '');
                    setEditShiftIn(pd.shiftIn || (selectedEmployee as any).schedule_in || '');
                    setEditShiftOut(pd.shiftOut || (selectedEmployee as any).schedule_out || '');
                    setEditBreakStart(pd.breakStart || '');
                    setEditBreakEnd(pd.breakEnd || '');
                    setIsEditingProfile(true);
                  }
                }}>
                  <Text style={{ color: Colors.light.primary, fontWeight: '600' }}>Edit Details</Text>
                </Pressable>
              ) : (
                <Pressable onPress={() => setIsEditingProfile(false)}>
                  <Text style={{ color: Colors.light.icon, fontWeight: '600' }}>Cancel Edit</Text>
                </Pressable>
              )}
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ marginBottom: 20 }}>
              {selectedEmployee && (() => {
                let pd: any = {};
                if (selectedEmployee.profile_data) {
                  try { pd = JSON.parse(selectedEmployee.profile_data); } catch (e) { }
                }
                return (
                  <View style={{ gap: 12 }}>
                    <View style={{ alignItems: 'center', marginBottom: 20 }}>
                      {pd.photo && pd.photo.length > 5 && pd.photo !== 'null' ? (
                        <Image source={{ uri: pd.photo }} style={{ width: 100, height: 100, borderRadius: 50 }} resizeMode="cover" />
                      ) : (
                        <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' }}>
                          <User size={48} color="#1E40AF" />
                        </View>
                      )}
                      <Text style={{ fontSize: 20, fontWeight: '700', color: Colors.light.text, marginTop: 12 }}>{selectedEmployee.full_name}</Text>
                      <Text style={{ fontSize: 14, color: Colors.light.primary, fontWeight: '600' }}>{selectedEmployee.role}</Text>
                    </View>

                    <Text style={styles.sectionLabel}>Personal & Identification</Text>
                    <View style={styles.profileRow}><Text style={styles.profileKey}>Email:</Text><Text style={styles.profileVal}>{selectedEmployee.email}</Text></View>
                    <View style={styles.profileRow}><Text style={styles.profileKey}>Mobile:</Text><Text style={styles.profileVal}>{(selectedEmployee as any).mobile || pd.mobile || 'N/A'}</Text></View>
                    <View style={styles.profileRow}><Text style={styles.profileKey}>DOB:</Text><Text style={styles.profileVal}>{formatDateToDDMMYYYY((selectedEmployee as any).dob)}</Text></View>
                    <View style={styles.profileRow}><Text style={styles.profileKey}>Age/Blood:</Text><Text style={styles.profileVal}>{pd.age || 'N/A'} yrs / {pd.bloodGroup || 'N/A'}</Text></View>
                    <View style={styles.profileRow}><Text style={styles.profileKey}>Emergency Contact:</Text><Text style={styles.profileVal}>{pd.emergencyContact || 'N/A'}</Text></View>

                    <Text style={[styles.sectionLabel, { marginTop: 16 }]}>Statutory & Compliance</Text>
                    <View style={styles.profileRow}><Text style={styles.profileKey}>Aadhaar ID:</Text><Text style={styles.profileVal}>{pd.aadhaar || 'N/A'}</Text></View>
                    <View style={styles.profileRow}><Text style={styles.profileKey}>PAN Card:</Text><Text style={styles.profileVal}>{pd.pan || 'N/A'}</Text></View>
                    <View style={styles.profileRow}><Text style={styles.profileKey}>ESI ID:</Text><Text style={styles.profileVal}>{pd.esi || 'N/A'}</Text></View>

                    <Text style={[styles.sectionLabel, { marginTop: 16 }]}>Payroll & Banking</Text>
                    <View style={styles.profileRow}><Text style={styles.profileKey}>Base Salary:</Text><Text style={styles.profileVal}>{pd.salary ? `₹${pd.salary}` : 'N/A'}</Text></View>
                    <View style={styles.profileRow}><Text style={styles.profileKey}>Bank Name:</Text><Text style={styles.profileVal}>{pd.bankName || 'N/A'}</Text></View>
                    <View style={styles.profileRow}><Text style={styles.profileKey}>Account No:</Text><Text style={styles.profileVal}>{pd.accountNo || 'N/A'}</Text></View>
                    <View style={styles.profileRow}><Text style={styles.profileKey}>IFSC / Branch:</Text><Text style={styles.profileVal}>{pd.ifsc || 'N/A'} / {pd.branch || 'N/A'}</Text></View>

                    {employeePayslips && employeePayslips.length > 0 && (
                      <View>
                        <Text style={[styles.sectionLabel, { marginTop: 16 }]}>Recent Payslips</Text>
                        {employeePayslips.slice(0, 3)?.map((ps, i) => (
                          <View key={i} style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 8, marginBottom: 8 }}>
                            <Text style={{ fontWeight: '700', marginBottom: 4 }}>{ps.month}</Text>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                              <Text style={{ color: Colors.light.icon }}>Base: ₹{ps.base_salary}</Text>
                              <Text style={{ color: Colors.light.error }}>Deductions: ₹{parseFloat(ps.extra_leave_deduction || 0) + parseFloat(ps.late_checkin_deduction || 0) + parseFloat(ps.early_checkout_deduction || 0)}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                              <Text style={{ color: '#10B981', fontSize: 12 }}>Appreciation: ₹{ps.appreciation_amount || 0}</Text>
                              <Text style={{ color: '#10B981', fontSize: 12 }}>Extra Work: ₹{ps.extra_working_amount || 0}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                              <Text style={{ fontWeight: '700', color: Colors.light.primary }}>Net Pay: ₹{ps.net_salary}</Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}

                    <View style={{ backgroundColor: '#F1F5F9', padding: 16, borderRadius: 12, marginTop: 16 }}>
                      <Text style={[styles.sectionLabel, { marginTop: 0, marginBottom: 12 }]}>Generate Payslip (Super Admin)</Text>
                      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 12, fontWeight: '600', marginBottom: 4 }}>Month (YYYY-MM)</Text>
                          <TextInput style={styles.input} placeholder="e.g. 2026-06" value={generatePayslipMonth} onChangeText={setGeneratePayslipMonth} />
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 12, fontWeight: '600', marginBottom: 4 }}>Appreciation Amount (₹)</Text>
                          <TextInput style={styles.input} keyboardType="numeric" value={appreciationAmount} onChangeText={setAppreciationAmount} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 12, fontWeight: '600', marginBottom: 4 }}>Extra Working Amount (₹)</Text>
                          <TextInput style={styles.input} keyboardType="numeric" value={extraWorkingAmount} onChangeText={setExtraWorkingAmount} />
                        </View>
                      </View>
                      <Pressable style={styles.submitBtn} onPress={handleGeneratePayslip} disabled={generatingPayslip}>
                        <Text style={styles.submitBtnText}>{generatingPayslip ? 'Generating...' : 'Generate / Update Payslip'}</Text>
                      </Pressable>
                    </View>

                    <Text style={[styles.sectionLabel, { marginTop: 16 }]}>Operations & Shifts</Text>
                    <View style={styles.profileRow}><Text style={styles.profileKey}>Manager:</Text><Text style={styles.profileVal}>{pd.manager || 'N/A'}</Text></View>
                    <View style={styles.profileRow}><Text style={styles.profileKey}>Shift Clock:</Text><Text style={styles.profileVal}>{pd.shiftIn || (selectedEmployee as any).schedule_in || 'N/A'} to {pd.shiftOut || (selectedEmployee as any).schedule_out || 'N/A'}</Text></View>
                    <View style={styles.profileRow}><Text style={styles.profileKey}>Break Window:</Text><Text style={styles.profileVal}>{pd.breakStart || 'N/A'} to {pd.breakEnd || 'N/A'}</Text></View>

                    {isEditingProfile && (
                      <View style={{ backgroundColor: '#FFFBEB', padding: 16, borderRadius: 12, marginTop: 16, borderWidth: 1, borderColor: '#FEF3C7' }}>
                        <Text style={[styles.sectionLabel, { marginTop: 0, marginBottom: 12 }]}>Edit Super Admin Overrides</Text>
                        <View style={{ gap: 12 }}>
                          <View>
                            <Text style={{ fontSize: 12, fontWeight: '600', marginBottom: 4 }}>Base Salary (₹)</Text>
                            <TextInput style={styles.input} keyboardType="numeric" value={editSalary} onChangeText={setEditSalary} />
                          </View>
                          <View style={{ flexDirection: 'row', gap: 12 }}>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 12, fontWeight: '600', marginBottom: 4 }}>Shift In (HH:MM)</Text>
                              <CustomTimePicker value={editShiftIn} onChange={setEditShiftIn} placeholder="09:00" />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 12, fontWeight: '600', marginBottom: 4 }}>Shift Out (HH:MM)</Text>
                              <CustomTimePicker value={editShiftOut} onChange={setEditShiftOut} placeholder="17:00" />
                            </View>
                          </View>
                          <View style={{ flexDirection: 'row', gap: 12 }}>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 12, fontWeight: '600', marginBottom: 4 }}>Break Start (HH:MM)</Text>
                              <CustomTimePicker value={editBreakStart} onChange={setEditBreakStart} placeholder="13:00" />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 12, fontWeight: '600', marginBottom: 4 }}>Break End (HH:MM)</Text>
                              <CustomTimePicker value={editBreakEnd} onChange={setEditBreakEnd} placeholder="14:00" />
                            </View>
                          </View>
                        </View>
                        <Pressable
                          style={[styles.submitBtn, { marginTop: 12 }]}
                          disabled={savingProfile}
                          onPress={async () => {
                            setSavingProfile(true);
                            try {
                              let newPd = { ...pd, salary: editSalary, shiftIn: editShiftIn, shiftOut: editShiftOut, breakStart: editBreakStart, breakEnd: editBreakEnd };

                              if (selectedEmployee.role === 'Sub Admin') {
                                await axios.put(`https://napi.bharatmedicalhallplus.com/admin/department-admins/${selectedEmployee.id}/profile`, {
                                  profile_data: newPd,
                                  schedule_in: editShiftIn,
                                  schedule_out: editShiftOut
                                });
                              } else {
                                await axios.put(`https://napi.bharatmedicalhallplus.com/employees/${selectedEmployee.id}/profile`, {
                                  profile_data: newPd
                                });
                              }
                              Alert.alert('Success', 'Profile updated successfully');
                              setIsEditingProfile(false);
                              // Refresh
                              const url = selectedEmployee.role === 'Sub Admin' ? 'https://napi.bharatmedicalhallplus.com/admin/department-admins' : 'https://napi.bharatmedicalhallplus.com/employees';
                              const empRes = await axios.get(url);
                              if (empRes.data.success) {
                                let updatedEmps = empRes.data.data;
                                if (selectedEmployee.role === 'Sub Admin') {
                                  updatedEmps = updatedEmps?.map((a: any) => ({
                                    ...a, role: 'Sub Admin', department: selectedEmployee.department
                                  }));
                                }
                                setEmployees(updatedEmps);
                                setSelectedEmployee(updatedEmps.find((e: any) => String(e.id) === String(selectedEmployee.id)));
                              }
                            } catch (e: any) {
                              Alert.alert('Error', e.response?.data?.message || 'Failed to save');
                            } finally {
                              setSavingProfile(false);
                            }
                          }}
                        >
                          <Text style={styles.submitBtnText}>{savingProfile ? 'Saving...' : 'Save Profile Changes'}</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                );
              })()}
            </ScrollView>
            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => { setProfileModalVisible(false); setIsEditingProfile(false); }}>
                <Text style={styles.cancelBtnText}>Close Profile</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Department Filter Modal */}
      <Modal visible={isDeptDropdownOpen} transparent animationType="fade" onRequestClose={() => setIsDeptDropdownOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setIsDeptDropdownOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { maxHeight: '60%', width: 400 }]}>
                <Text style={styles.modalTitle}>Select Department</Text>
                
                <View style={[styles.searchBox, { maxWidth: '100%', marginBottom: 16, backgroundColor: '#f1f5f9' }]}>
                  <Search size={18} color={Colors.light.icon} style={{ marginRight: 8 }} />
                  <TextInput
                    style={{
                      flex: 1,
                      fontSize: 14,
                      color: Colors.light.text,
                      padding: 0,
                      height: 40,
                      ...Platform.select({
                        web: { outlineWidth: 0 } as any
                      })
                    }}
                    placeholder="Search department..."
                    placeholderTextColor={Colors.light.icon}
                    value={deptSearchQuery}
                    onChangeText={setDeptSearchQuery}
                  />
                  {deptSearchQuery ? (
                    <Pressable onPress={() => setDeptSearchQuery('')} style={{ padding: 4 }}>
                      <Text style={{ color: Colors.light.icon, fontSize: 14 }}>✕</Text>
                    </Pressable>
                  ) : null}
                </View>

                <FlatList
                  data={[
                    { id: 'all', name: 'All Departments' },
                    ...departments.filter(d => d.name.toLowerCase().includes(deptSearchQuery.toLowerCase()))
                  ]}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <Pressable
                      style={({ pressed }) => [
                        {
                          paddingVertical: 12,
                          paddingHorizontal: 16,
                          borderRadius: 8,
                          backgroundColor: selectedDeptFilter === item.name || (selectedDeptFilter === 'all' && item.id === 'all')
                            ? '#EFF6FF'
                            : pressed ? '#F8FAFC' : 'transparent',
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 4
                        }
                      ]}
                      onPress={() => {
                        setSelectedDeptFilter(item.id === 'all' ? 'all' : item.name);
                        setIsDeptDropdownOpen(false);
                        setDeptSearchQuery('');
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 15,
                          color: selectedDeptFilter === item.name || (selectedDeptFilter === 'all' && item.id === 'all')
                            ? Colors.light.primary
                            : Colors.light.text,
                          fontWeight: selectedDeptFilter === item.name || (selectedDeptFilter === 'all' && item.id === 'all')
                            ? '700'
                            : '500'
                        }}
                      >
                        {item.name}
                      </Text>
                      {(selectedDeptFilter === item.name || (selectedDeptFilter === 'all' && item.id === 'all')) && (
                        <Text style={{ color: Colors.light.primary, fontWeight: 'bold' }}>✓</Text>
                      )}
                    </Pressable>
                  )}
                  style={{ flexGrow: 1 }}
                  ListEmptyComponent={
                    <Text style={{ color: Colors.light.icon, fontStyle: 'italic', padding: 16, textAlign: 'center' }}>
                      No departments found
                    </Text>
                  }
                />

                <View style={[styles.modalActions, { marginTop: 16 }]}>
                  <Pressable style={styles.cancelBtn} onPress={() => { setIsDeptDropdownOpen(false); setDeptSearchQuery(''); }}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </Pressable>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
    padding: 32,
  },
  containerMobile: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  headerMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.light.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.light.icon,
    marginTop: 8,
  },
  headerButtons: { flexDirection: 'row', gap: 16 },
  headerButtonsMobile: { flexWrap: 'wrap' },
  manageRolesBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, gap: 8 },
  manageRolesText: { color: Colors.light.primary, fontWeight: '600', fontSize: 14 },
  userTypeToggle: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 12, padding: 4 },
  toggleBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  toggleBtnActive: { backgroundColor: 'white', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  toggleText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  toggleTextActive: { color: Colors.light.primary },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.light.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  addBtnText: { color: '#FFF', fontWeight: '700', marginLeft: 8, fontSize: 15 },
  card: {
    flex: 1,
    backgroundColor: Colors.light.card,
    borderRadius: 24,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
      }
    })
  },
  toolbar: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    maxWidth: 400,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchPlaceholder: {
    color: Colors.light.icon,
    fontSize: 15,
  },
  listContent: {
    paddingBottom: 24,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  tableHeader: {
    backgroundColor: Colors.light.background,
    borderBottomWidth: 2,
  },
  cell: {
    fontSize: 15,
    color: Colors.light.text,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    alignSelf: 'flex-start',
  },
  statusApproved: {
    backgroundColor: '#D1FAE5',
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  textApproved: {
    color: '#059669',
  },
  textPending: {
    color: '#D97706',
  },
  actionBtn: { width: 40, alignItems: 'flex-end' },

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 24, padding: 32, width: '100%', maxWidth: 500, ...Platform.select({ web: { boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' } }) },
  modalTitle: { fontSize: 24, fontWeight: '800', color: Colors.light.text, marginBottom: 24 },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: Colors.light.icon, marginBottom: 12, letterSpacing: 0.5, textTransform: 'uppercase' },
  addRoleSection: { marginBottom: 32, backgroundColor: '#F8FAFC', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: Colors.light.border },
  addRoleRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '700', color: Colors.light.text, marginBottom: 8 },
  input: { backgroundColor: '#FFF', borderWidth: 1, borderColor: Colors.light.border, borderRadius: 8, padding: 14, fontSize: 14, color: Colors.light.text, marginBottom: 20, ...Platform.select({ web: { outlineWidth: 0 as any } }) },

  deptOptionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  deptOption: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100, borderWidth: 1, borderColor: Colors.light.border, backgroundColor: '#FFF' },
  deptOptionSelected: { backgroundColor: '#EFF6FF', borderColor: Colors.light.primary },
  deptOptionText: { fontSize: 13, color: Colors.light.icon, fontWeight: '600' },
  deptOptionTextSelected: { color: Colors.light.primary, fontWeight: '700' },

  existingRolesSection: { flex: 1 },
  roleItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.light.border },
  roleNameText: { fontSize: 15, fontWeight: '700', color: Colors.light.text },
  roleDeptText: { fontSize: 12, color: Colors.light.icon, fontWeight: '500' },
  emptyText: { color: Colors.light.icon, fontSize: 14, fontStyle: 'italic', marginTop: 12 },

  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 24 },
  cancelBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, backgroundColor: '#F1F5F9' },
  cancelBtnText: { color: Colors.light.text, fontWeight: '700', fontSize: 15 },
  submitBtn: { backgroundColor: Colors.light.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  submitBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },

  profileRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  profileKey: { fontSize: 14, color: Colors.light.icon, fontWeight: '500' },
  profileVal: { fontSize: 14, color: Colors.light.text, fontWeight: '600' },

  adminRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, marginBottom: 12, marginHorizontal: 16 },
  adminAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.light.primary, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  adminInitials: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  adminName: { fontSize: 15, fontWeight: '700', color: Colors.light.text },
  adminEmail: { fontSize: 13, color: Colors.light.icon, marginTop: 2 },
  actionBtnMobile: { padding: 4 }
});
