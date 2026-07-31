import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable, Platform, Alert, ScrollView, Modal, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Banknote, CheckCircle2, TrendingUp, CreditCard, Users, HandCoins, IndianRupee } from 'lucide-react-native';
import axios from 'axios';
import * as Print from 'expo-print';
import { Colors } from '../../../constants/Colors';
import { useResponsive } from '../../../hooks/useResponsive';

type Peer = { id: string; full_name: string; };
type Handover = { id: string; from_name: string; to_name: string; from_employee_id: string; to_employee_id: string; amount: string; status: string; created_at: string; from_role?: string; from_department?: string; to_role?: string; to_department?: string; customer_name?: string; };

const formatDateTimeToDDMMYYYY = (dateStr: string) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const displayHours = String(hours).padStart(2, '0');
    return `${day}-${month}-${year} ${displayHours}:${minutes} ${ampm}`;
  } catch (e) {
    return dateStr;
  }
};

const formatDateOnlyToDDMMYYYY = (dateStr: string) => {
  if (!dateStr) return '';
  try {
    const cleanDate = dateStr.split('T')[0].split(' ')[0];
    const parts = cleanDate.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      } else {
        return `${parts[0]}-${parts[1]}-${parts[2]}`;
      }
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch (e) {
    return dateStr;
  }
};

export default function AdminWalletScreen() {
  const { isDesktop } = useResponsive();

  const [cashInHand, setCashInHand] = useState('0.00');
  const [stats, setStats] = useState<any>({});
  const [walletBalances, setWalletBalances] = useState<any[]>([]);
  const [handovers, setHandovers] = useState<Handover[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminId, setAdminId] = useState<string | null>(null);

  const [handoverModalVisible, setHandoverModalVisible] = useState(false);
  const [amount, setAmount] = useState('');
  const [selectedPeerId, setSelectedPeerId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [peers, setPeers] = useState<Peer[]>([]);

  // Search & Filter state for cash holdings table
  const [searchNameQuery, setSearchNameQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'All' | 'Sub Admin' | 'Employee'>('All');

  // Details Modal state
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [employeeHistory, setEmployeeHistory] = useState<any>({ handovers: [], bookings: [], orders: [] });
  const [historyLoading, setHistoryLoading] = useState(false);
  const [modalActiveTab, setModalActiveTab] = useState<'ledger' | 'handovers' | 'bookings' | 'orders'>('ledger');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  useEffect(() => {
    const init = async () => {
      try {
        let userStr = null;
        if (Platform.OS === 'web') {
          userStr = localStorage.getItem('superAdminUser');
        } else {
          userStr = await AsyncStorage.getItem('superAdminUser');
        }
        
        if (userStr) {
          const user = JSON.parse(userStr);
          const aId = `ADMIN-${user.id}`;
          setAdminId(aId);
          fetchData(aId);
          fetchPeers(aId);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching admin user:', err);
        setLoading(false);
      }
    };
    init();
  }, []);

  const fetchPeers = async (id: string) => {
    try {
      const res = await axios.get(`https://napi.bharatmedicalhallplus.com/employees/all-users`);
      if (res.data.success) {
        setPeers(res.data.data.filter((p: any) => p.id !== id));
      }
    } catch (error) {}
  };

  const fetchData = async (id: string) => {
    setLoading(true);
    try {
      const [walletRes, handoversRes, statsRes, balancesRes] = await Promise.all([
        axios.get(`https://napi.bharatmedicalhallplus.com/wallet/${id}`),
        axios.get(`https://napi.bharatmedicalhallplus.com/wallet/handovers/${id}`),
        axios.get(`https://napi.bharatmedicalhallplus.com/admin/revenue-stats`),
        axios.get(`https://napi.bharatmedicalhallplus.com/admin/wallet-balances`)
      ]);
      
      if (walletRes.data.success) {
        setCashInHand(walletRes.data.data.wallet?.cash_in_hand || '0.00');
      }
      if (handoversRes.data.success) {
        setHandovers(handoversRes.data.data || []);
      }
      if (statsRes.data.success) {
        setStats(statsRes.data.data);
      }
      if (balancesRes.data.success) {
        // Sort by cash_in_hand high to low
        const sorted = (balancesRes.data.data || []).sort((a: any, b: any) => parseFloat(b.cash_in_hand || '0') - parseFloat(a.cash_in_hand || '0'));
        setWalletBalances(sorted);
      }
    } catch (error) {
      console.error('Error fetching admin wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const openEmployeeDetails = async (employee: any) => {
    setSelectedEmployee(employee);
    setDetailsModalVisible(true);
    setHistoryLoading(true);
    setFilterStartDate('');
    setFilterEndDate('');
    setModalActiveTab('ledger');
    try {
      const res = await axios.get(`https://napi.bharatmedicalhallplus.com/wallet/history/${employee.employee_id}`);
      if (res.data.success) {
        setEmployeeHistory(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const filterDataByDate = (list: any[], dateField: string) => {
    return list.filter(item => {
      const itemDateStr = item[dateField] ? item[dateField].split('T')[0] : '';
      if (!itemDateStr) return true;
      if (filterStartDate && itemDateStr < filterStartDate) return false;
      if (filterEndDate && itemDateStr > filterEndDate) return false;
      return true;
    });
  };

  // Helper to compile cash ledger entries chronologically for selected employee in modal
  const buildModalCashLedger = () => {
    if (!selectedEmployee) return { openingBalance: 0, ledger: [] };
    const entries: any[] = [];

    // Add Bookings
    const bookingsArr = Array.isArray(employeeHistory.bookings) ? employeeHistory.bookings : [];
    bookingsArr.forEach((b: any) => {
      const amt = parseFloat(b.amount || b.fee || '0');
      if (amt > 0) {
        const isCash = b.payment_mode === 'Cash' || b.payment_method === 'Cash';
        entries.push({
          id: `booking-${b.id || b.booking_id}`,
          dateStr: b.created_at || b.date,
          particulars: `Booking Collection - Patient: ${b.patient_name || 'N/A'} (Doc: Dr. ${b.doctor_name || 'N/A'})`,
          roleDept: `Patient • Clinical [${isCash ? 'Cash' : 'Online'}]`,
          debit: '-',
          credit: `₹${amt.toFixed(2)}`,
          amount: amt,
          cashAmount: isCash ? amt : 0,
          onlineAmount: !isCash ? amt : 0,
          type: 'credit',
          status: 'Accepted',
          paymentMode: isCash ? 'Cash' : 'Online'
        });
      }
    });

    // Add Order Collections
    const ordersArr = Array.isArray(employeeHistory.orders) ? employeeHistory.orders : [];
    ordersArr.forEach((tx: any) => {
      const cashVal = tx.cash_amount !== undefined && tx.cash_amount !== null 
        ? parseFloat(tx.cash_amount) 
        : (tx.payment_mode === 'Cash' || tx.payment_method === 'Cash' || tx.type === 'cash_collection' ? parseFloat(tx.amount || tx.paid_amount || '0') : 0);
      const onlineVal = tx.online_amount !== undefined && tx.online_amount !== null 
        ? parseFloat(tx.online_amount) 
        : (tx.payment_mode === 'Online' || tx.payment_method === 'Online' || tx.type === 'online_collection' ? parseFloat(tx.amount || tx.paid_amount || '0') : 0);
      
      const totalVal = cashVal + onlineVal;
      if (totalVal > 0) {
        let label = '';
        if (cashVal > 0 && onlineVal > 0) {
          label = `Split: Cash ₹${cashVal.toFixed(2)} + Online ₹${onlineVal.toFixed(2)}`;
        } else if (cashVal > 0) {
          label = `Cash ₹${cashVal.toFixed(2)}`;
        } else {
          label = `Online ₹${onlineVal.toFixed(2)}`;
        }

        entries.push({
          id: `order-${tx.id || tx.order_no}`,
          dateStr: tx.created_at || tx.order_date,
          particulars: `Order Collection - Customer: ${tx.customer_name || 'N/A'} (Order: ${tx.order_no || 'N/A'})`,
          roleDept: `${tx.delivery_method ? `Order • ${tx.delivery_method}` : 'Order Collection'} [${label}]`,
          debit: '-',
          credit: `₹${totalVal.toFixed(2)}`,
          amount: totalVal,
          cashAmount: cashVal,
          onlineAmount: onlineVal,
          type: 'credit',
          status: 'Accepted',
          paymentMode: cashVal > 0 && onlineVal > 0 ? 'Split' : (cashVal > 0 ? 'Cash' : 'Online')
        });
      }
    });

    // Add Handovers
    const stripId = (id: string) => (id || '').replace(/^(EMP-|SA-|DOC-|ADMIN-)/, '');
    const handoversArr = Array.isArray(employeeHistory.handovers) ? employeeHistory.handovers : [];
    handoversArr.forEach((h: any) => {
      const isOut = stripId(String(h.from_employee_id)) === stripId(String(selectedEmployee.employee_id));
      const targetName = isOut 
        ? (h.to_name ? `${h.to_name} (${h.to_employee_id})` : h.customer_name || 'Patient') 
        : `${h.from_name} (${h.from_employee_id})`;
      const targetRoleDept = isOut 
        ? (h.to_employee_id ? `${h.to_role || ''} • ${h.to_department || ''}` : 'Patient • Clinical') 
        : `${h.from_role || ''} • ${h.from_department || ''}`;
      
      const amt = parseFloat(h.amount || '0');
      
      if (isOut) {
        entries.push({
          id: `handover-${h.id}`,
          dateStr: h.created_at,
          particulars: `Handed Cash to ${targetName}`,
          roleDept: targetRoleDept,
          debit: `₹${amt.toFixed(2)}`,
          credit: '-',
          amount: amt,
          cashAmount: amt,
          type: 'debit',
          status: h.status,
          note: h.note,
          postBalance: h.from_post_balance !== null && h.from_post_balance !== undefined ? `₹${parseFloat(h.from_post_balance).toFixed(2)}` : null
        });
      } else {
        entries.push({
          id: `handover-${h.id}`,
          dateStr: h.created_at,
          particulars: `Received Cash from ${targetName}`,
          roleDept: targetRoleDept,
          debit: '-',
          credit: `₹${amt.toFixed(2)}`,
          amount: amt,
          cashAmount: amt,
          type: 'credit',
          status: h.status,
          note: h.note,
          postBalance: h.to_post_balance !== null && h.to_post_balance !== undefined ? `₹${parseFloat(h.to_post_balance).toFixed(2)}` : null
        });
      }
    });

    // Sort chronologically (oldest first)
    entries.sort((a: any, b: any) => new Date(a.dateStr).getTime() - new Date(b.dateStr).getTime());

    // Calculate running balance backwards starting from current actual cash_in_hand (Accepted or Pending)
    let cashBalance = parseFloat(selectedEmployee.cash_in_hand || '0');
    
    // Loop backwards
    for (let i = entries.length - 1; i >= 0; i--) {
      const entry = entries[i];
      const isAcceptedOrPending = entry.status === 'Accepted' || entry.status === 'Pending' || entry.status === 'pending';
      if (isAcceptedOrPending) {
        if (entry.id.startsWith('handover-')) {
          entry.runningBalanceVal = cashBalance;
          entry.runningBalance = `₹${cashBalance.toFixed(2)}`;
          if (entry.type === 'debit') {
            cashBalance += entry.amount;
          } else {
            cashBalance -= entry.amount;
          }
        } else {
          entry.runningBalanceVal = cashBalance;
          entry.runningBalance = `₹${cashBalance.toFixed(2)}`;
          cashBalance -= (entry.cashAmount || 0);
        }
      } else {
        entry.runningBalanceVal = null;
        entry.runningBalance = '-';
      }
    }

    // Filter by date range
    const filteredEntries = entries.filter((entry: any) => {
      const entryDate = entry.dateStr ? entry.dateStr.split('T')[0] : '';
      if (filterStartDate && entryDate < filterStartDate) return false;
      if (filterEndDate && entryDate > filterEndDate) return false;
      return true;
    });

    // Determine Opening Balance for the filtered range
    let openingBalance = 0;
    if (filteredEntries.length > 0) {
      const firstEntry = filteredEntries[0];
      const idx = entries.indexOf(firstEntry);
      if (idx > 0) {
        let foundPrev = false;
        for (let j = idx - 1; j >= 0; j--) {
          const isPrevAcceptedOrPending = entries[j].status === 'Accepted' || entries[j].status === 'Pending' || entries[j].status === 'pending';
          if (isPrevAcceptedOrPending && entries[j].runningBalanceVal !== null) {
            openingBalance = entries[j].runningBalanceVal;
            foundPrev = true;
            break;
          }
        }
        if (!foundPrev) {
          openingBalance = firstEntry.runningBalanceVal;
          const isFirstAcceptedOrPending = firstEntry.status === 'Accepted' || firstEntry.status === 'Pending' || firstEntry.status === 'pending';
          if (isFirstAcceptedOrPending) {
            if (firstEntry.id.startsWith('handover-') && firstEntry.type === 'debit') {
              openingBalance += firstEntry.amount;
            } else {
              openingBalance -= (firstEntry.cashAmount || 0);
            }
          }
        }
      } else {
        openingBalance = firstEntry.runningBalanceVal;
        const isFirstAcceptedOrPending = firstEntry.status === 'Accepted' || firstEntry.status === 'Pending' || firstEntry.status === 'pending';
        if (isFirstAcceptedOrPending) {
          if (firstEntry.id.startsWith('handover-') && firstEntry.type === 'debit') {
            openingBalance += firstEntry.amount;
          } else {
            openingBalance -= (firstEntry.cashAmount || 0);
          }
        }
      }
    } else {
      openingBalance = parseFloat(selectedEmployee.cash_in_hand || '0');
    }

    return {
      openingBalance,
      ledger: filteredEntries
    };
  };

  const { openingBalance: cashOpeningBalance, ledger: cashLedger } = buildModalCashLedger();

  const filteredBookings = filterDataByDate(employeeHistory.bookings || [], 'created_at');
  const filteredOrders = filterDataByDate(employeeHistory.orders || [], 'created_at');

  const modalHandoversBase = filterDataByDate(employeeHistory.handovers || [], 'created_at');
  const sortedModalHandoversOldest = [...modalHandoversBase].sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  let modalCashRunning = 0;
  const computedModalHandovers = sortedModalHandoversOldest.map((h: any) => {
    const isOut = h.from_employee_id == selectedEmployee?.employee_id;
    let credit = '-';
    let debit = '-';
    if (h.status === 'Accepted') {
      if (isOut) {
        debit = `₹${h.amount}`;
        modalCashRunning -= Number(h.amount);
      } else {
        credit = `₹${h.amount}`;
        modalCashRunning += Number(h.amount);
      }
    }
    return {
      ...h,
      credit,
      debit,
      runningBalance: `₹${modalCashRunning.toFixed(2)}`
    };
  });
  const filteredHandovers = [...computedModalHandovers].reverse();

  const filteredBalances = walletBalances.filter(item => {
    const name = item.full_name || '';
    const empId = item.employee_id || '';
    const matchesSearch = name.toLowerCase().includes(searchNameQuery.toLowerCase()) || 
                          empId.toLowerCase().includes(searchNameQuery.toLowerCase());
    
    const roleLower = (item.role || '').toLowerCase();
    const isSubAdmin = roleLower.includes('sub_admin') || roleLower.includes('sub admin');
    
    const matchesRole = roleFilter === 'All' || 
                        (roleFilter === 'Sub Admin' && isSubAdmin) || 
                        (roleFilter === 'Employee' && !isSubAdmin);
    return matchesSearch && matchesRole;
  });

  const handleExportModalCSV = () => {
    if (!selectedEmployee) return;
    let csvContent = "";
    let filename = `${selectedEmployee.full_name.replace(/\s+/g, '_')}_Wallet_Details`;
    
    if (modalActiveTab === 'ledger') {
      csvContent = "Date,Particulars,Staff/Details,Debit (Withdrawal),Credit (Deposit),Balance\n";
      csvContent += `"Opening Balance","Opening Balance","-","-","-","₹${cashOpeningBalance.toFixed(2)}"\n`;
      cashLedger.forEach(item => {
        csvContent += `"${formatDateTimeToDDMMYYYY(item.dateStr)}","${item.particulars}${item.note ? ` (${item.note})` : ''}","${item.roleDept}","${item.debit}","${item.credit}","${item.runningBalance}"\n`;
      });
      csvContent += `"Closing Balance","Closing Balance","-","-","-","₹${(cashLedger.length > 0 ? cashLedger[cashLedger.length - 1].runningBalanceVal : cashOpeningBalance).toFixed(2)}"\n`;
      filename += "_Ledger.csv";
    } else if (modalActiveTab === 'handovers') {
      // Return reverse list of computed ledger handovers or raw history handovers
      const mHandovers = cashLedger.filter(item => item.id.startsWith('handover-')).reverse();
      csvContent = "Date,Particulars,Debit (Withdrawal),Credit (Deposit),Balance\n";
      mHandovers.forEach(h => {
        csvContent += `"${formatDateTimeToDDMMYYYY(h.dateStr)}","${h.particulars}${h.note ? ` (${h.note})` : ''}","${h.debit}","${h.credit}","${h.runningBalance}"\n`;
      });
      filename += "_Handovers.csv";
    } else if (modalActiveTab === 'bookings') {
      csvContent = "Booking ID,Date,Patient,Amount,Status\n";
      filteredBookings.forEach(b => {
        csvContent += `${b.id},"${new Date(b.created_at).toLocaleString()}","${b.patient_name || 'N/A'}",${b.amount},"${b.payment_status}"\n`;
      });
      filename += "_Bookings.csv";
    } else {
      csvContent = "Order No,Date,Customer,Amount,Paid Amount,Status\n";
      filteredOrders.forEach(o => {
        csvContent += `"${o.order_no || 'N/A'}","${o.order_date || 'N/A'}","${o.customer_name || 'N/A'}",${o.amount},${o.paid_amount},"${o.status}"\n`;
      });
      filename += "_Orders.csv";
    }

    if (Platform.OS === 'web') {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      Alert.alert('Notice', 'CSV export is supported on Web.');
    }
  };

  const handlePrintModalPDF = async () => {
    if (!selectedEmployee) return;
    
    let rowsHtml = "";
    let title = "";
    let summaryHtml = "";
    
    const presentCashInHand = parseFloat(selectedEmployee.cash_in_hand || '0').toFixed(2);
    
    if (modalActiveTab === 'ledger') {
      title = "Cash Account Ledger / Pass Book";
      summaryHtml = `
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; margin-bottom: 20px; font-size: 14px; line-height: 1.6;">
          <strong>Present Cash in Hand of Employee:</strong> ₹${presentCashInHand}<br/>
          <strong>Opening Balance:</strong> ₹${cashOpeningBalance.toFixed(2)}<br/>
          <strong>Closing Balance:</strong> ₹${(cashLedger.length > 0 ? cashLedger[cashLedger.length - 1].runningBalanceVal : cashOpeningBalance).toFixed(2)}
        </div>
      `;
      rowsHtml = `
        <thead>
          <tr>
            <th>Date & Time</th>
            <th>Particulars (Narration)</th>
            <th>Staff/Details</th>
            <th style="text-align: right; color: #ef4444;">Debit (-)</th>
            <th style="text-align: right; color: #10b981;">Credit (+)</th>
            <th style="text-align: right;">Balance</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>-</td>
            <td><strong>Opening Balance</strong></td>
            <td>-</td>
            <td style="text-align: right;">-</td>
            <td style="text-align: right;">-</td>
            <td style="text-align: right; font-weight: bold;">₹${cashOpeningBalance.toFixed(2)}</td>
          </tr>
          ${cashLedger.map(item => `
            <tr>
              <td>${formatDateTimeToDDMMYYYY(item.dateStr)}</td>
              <td>
                <strong>${item.particulars}</strong>
                ${item.note ? `<br/><span style="font-size: 10px; color: #64748b;">Note: ${item.note}</span>` : ''}
                ${item.postBalance ? `<br/><span style="font-size: 10px; color: #059669; font-weight: bold;">Logged Balance: ${item.postBalance}</span>` : ''}
                ${item.status !== 'Accepted' ? `<br/><span style="font-size: 10px; font-weight: bold; color: ${item.status === 'Pending' ? '#b45309' : '#b91c1c'}; text-transform: uppercase;">${item.status}</span>` : ''}
              </td>
              <td>${item.roleDept}</td>
              <td style="text-align: right; color: #ef4444;">${item.debit}</td>
              <td style="text-align: right; color: #10b981;">${item.credit}</td>
              <td style="text-align: right; font-weight: bold;">${item.status === 'Accepted' ? item.runningBalance : '-'}</td>
            </tr>
          `).join('')}
          <tr style="background-color: #f8fafc; font-weight: bold;">
            <td>-</td>
            <td>Closing Balance</td>
            <td>-</td>
            <td style="text-align: right;">-</td>
            <td style="text-align: right;">-</td>
            <td style="text-align: right; color: #10b981; font-weight: 800;">₹${(cashLedger.length > 0 ? cashLedger[cashLedger.length - 1].runningBalanceVal : cashOpeningBalance).toFixed(2)}</td>
          </tr>
        </tbody>
      `;
    } else if (modalActiveTab === 'handovers') {
      title = "Cash Handovers Transaction History";
      let totalHandoverReceived = 0;
      let totalHandoverPaid = 0;
      filteredHandovers.forEach(h => {
        const isOut = h.from_employee_id == selectedEmployee.employee_id;
        if (h.status === 'Accepted') {
          if (isOut) {
            totalHandoverPaid += parseFloat(h.amount || '0');
          } else {
            totalHandoverReceived += parseFloat(h.amount || '0');
          }
        }
      });
      summaryHtml = `
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; margin-bottom: 20px; font-size: 14px; line-height: 1.6;">
          <strong>Present Cash in Hand of Employee:</strong> ₹${presentCashInHand}<br/>
          <strong>Total Handover Transactions:</strong> ${filteredHandovers.length}<br/>
          <span style="color: #ef4444; font-weight: bold;">Total Handed Over (Debit):</span> ₹${totalHandoverPaid.toFixed(2)}<br/>
          <span style="color: #10b981; font-weight: bold;">Total Received (Credit):</span> ₹${totalHandoverReceived.toFixed(2)}
        </div>
      `;
      rowsHtml = `
        <thead>
          <tr>
            <th>Date/Time</th>
            <th>Particulars</th>
            <th style="text-align: right; color: #ef4444;">Debit (-)</th>
            <th style="text-align: right; color: #10b981;">Credit (+)</th>
            <th style="text-align: right;">Balance</th>
          </tr>
        </thead>
        <tbody>
          ${filteredHandovers.map((h: any) => {
            const _stripId = (id: string) => (id || '').replace(/^(EMP-|SA-|DOC-|ADMIN-)/, '');
            const isOut = _stripId(String(h.from_employee_id)) === _stripId(String(selectedEmployee?.employee_id));
            const receiver = h.to_employee_id ? h.to_name : (h.customer_name ? `${h.customer_name} (Patient)` : 'Patient');
            const particulars = isOut ? `Cash Handover to ${receiver}` : `Received from ${h.from_name}`;
            return `
              <tr>
                <td>${formatDateTimeToDDMMYYYY(h.created_at)}</td>
                <td>
                  ${particulars}
                  ${h.note ? `<br/><span style="font-size: 10px; color: #64748b;">Note: ${h.note}</span>` : ''}
                  ${h.status !== 'Accepted' ? `<br/><span style="font-size: 10px; font-weight: bold; color: ${h.status === 'Pending' ? '#b45309' : '#b91c1c'};">${h.status}</span>` : ''}
                </td>
                <td style="text-align: right; color: #ef4444;">${isOut && h.status === 'Accepted' ? `₹${parseFloat(h.amount).toFixed(2)}` : '-'}</td>
                <td style="text-align: right; color: #10b981;">${!isOut && h.status === 'Accepted' ? `₹${parseFloat(h.amount).toFixed(2)}` : '-'}</td>
                <td style="text-align: right; font-weight: bold;">${h.status === 'Accepted' ? h.runningBalance : '-'}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      `;
    } else if (modalActiveTab === 'bookings') {
      title = "Bookings Cash & Online Collection History";
      let totalAmountVal = 0;
      let cashAmountVal = 0;
      let onlineAmountVal = 0;
      
      filteredBookings.forEach(b => {
        const amt = parseFloat(b.amount || '0');
        totalAmountVal += amt;
        const method = (b.payment_method || '').toLowerCase();
        if (method === 'cash') {
          cashAmountVal += amt;
        } else {
          onlineAmountVal += amt;
        }
      });
      
      summaryHtml = `
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; margin-bottom: 20px; font-size: 14px; line-height: 1.6;">
          <strong>Present Cash in Hand of Employee:</strong> ₹${presentCashInHand}<br/>
          <strong>Total Bookings:</strong> ${filteredBookings.length}<br/>
          <strong>Total Bookings Amount:</strong> ₹${totalAmountVal.toFixed(2)}<br/>
          <span style="color: #059669; font-weight: bold;">Cash Amount Collected:</span> ₹${cashAmountVal.toFixed(2)}<br/>
          <span style="color: #2563eb; font-weight: bold;">Online Amount:</span> ₹${onlineAmountVal.toFixed(2)}
        </div>
      `;
      
      rowsHtml = `
        <thead>
          <tr>
            <th>Booking ID</th>
            <th>Date/Time</th>
            <th>Patient Details</th>
            <th>Payment Mode</th>
            <th>Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${filteredBookings.map(b => `
            <tr>
              <td>#${b.id}</td>
              <td>${formatDateTimeToDDMMYYYY(b.created_at)}</td>
              <td>
                <strong>${b.patient_name || 'N/A'}</strong><br/>
                <span style="font-size: 11px; color: #475569;">Doc: Dr. ${b.doctor_name || 'N/A'} | Slot: ${b.start_time ? b.start_time.substring(0, 5) : ''} - ${b.end_time ? b.end_time.substring(0, 5) : ''}</span>
              </td>
              <td>${b.payment_method}</td>
              <td>₹${parseFloat(b.amount).toFixed(2)}</td>
              <td>${b.payment_status}</td>
            </tr>
          `).join('')}
        </tbody>
      `;
    } else {
      title = "Orders Cash & Online Collection History";
      let totalAmountVal = 0;
      let cashAmountVal = 0;
      let onlineAmountVal = 0;
      
      filteredOrders.forEach(o => {
        const amt = parseFloat(o.paid_amount || o.amount || '0');
        totalAmountVal += amt;
        const mode = (o.payment_mode || '').toLowerCase();
        if (mode === 'cash') {
          cashAmountVal += amt;
        } else {
          onlineAmountVal += amt;
        }
      });
      
      summaryHtml = `
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; margin-bottom: 20px; font-size: 14px; line-height: 1.6;">
          <strong>Present Cash in Hand of Employee:</strong> ₹${presentCashInHand}<br/>
          <strong>Total Orders:</strong> ${filteredOrders.length}<br/>
          <strong>Total Orders Amount:</strong> ₹${totalAmountVal.toFixed(2)}<br/>
          <span style="color: #059669; font-weight: bold;">Cash Amount Collected:</span> ₹${cashAmountVal.toFixed(2)}<br/>
          <span style="color: #2563eb; font-weight: bold;">Online Amount:</span> ₹${onlineAmountVal.toFixed(2)}
        </div>
      `;
      
      rowsHtml = `
        <thead>
          <tr>
            <th>Order No</th>
            <th>Date</th>
            <th>Customer</th>
            <th>Payment Mode</th>
            <th>Total Amount</th>
            <th>Paid Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${filteredOrders.map(o => `
            <tr>
              <td>${o.order_no || 'N/A'}</td>
              <td>${formatDateOnlyToDDMMYYYY(o.order_date || o.created_at)}</td>
              <td>${o.customer_name || 'N/A'}</td>
              <td>${o.payment_mode || 'N/A'}</td>
              <td>₹${parseFloat(o.amount || '0').toFixed(2)}</td>
              <td>₹${parseFloat(o.paid_amount || '0').toFixed(2)}</td>
              <td>${o.status}</td>
            </tr>
          `).join('')}
        </tbody>
      `;
    }

    const html = `
      <html>
        <head>
          <style>
            @page { size: portrait; margin: 10mm; }
            body { font-family: sans-serif; padding: 20px; }
            .header { border-bottom: 2px solid #3b82f6; padding-bottom: 10px; margin-bottom: 20px; }
            .header h1 { margin: 0; color: #1e3a8a; text-align: center; }
            .header h3 { margin: 5px 0 0 0; color: #475569; text-align: center; }
            .emp-info { font-size: 14px; margin-top: 15px; color: #334155; line-height: 1.5; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-size: 12px; }
            th { background-color: #f8fafc; }
            .footer { margin-top: 30px; font-size: 10px; color: #94a3b8; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Bharat Medical Hall</h1>
            <h3>${title}</h3>
            <div class="emp-info">
              <strong>Employee:</strong> ${selectedEmployee.full_name} (${selectedEmployee.employee_id}) <br/>
              <strong>Role:</strong> ${selectedEmployee.role} | <strong>Department:</strong> ${selectedEmployee.department || 'N/A'} <br/>
              <strong>Filters:</strong> ${filterStartDate || 'All'} to ${filterEndDate || 'Today'}
            </div>
          </div>
          
          ${summaryHtml}

          <table>
            ${rowsHtml}
          </table>
          <div class="footer">
            Generated on ${new Date().toLocaleString()} | Bharat Medical Hall Plus
          </div>
        </body>
      </html>
    `;

    try {
      if (Platform.OS === 'web') {
        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);
        iframe.contentDocument?.open();
        iframe.contentDocument?.write(html);
        iframe.contentDocument?.close();
        setTimeout(() => {
          iframe.contentWindow?.print();
          document.body.removeChild(iframe);
        }, 500);
      } else {
        await Print.printAsync({ html });
      }
    } catch (err) {
      console.error('Error printing PDF', err);
    }
  };

  const handleRequestHandover = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return Alert.alert('Error', 'Invalid amount');
    if (Number(amount) > Number(cashInHand)) return Alert.alert('Error', 'Insufficient cash in hand');
    if (!selectedPeerId) return Alert.alert('Error', 'Please select someone to hand over to');
    if (!adminId) return;

    setSubmitting(true);
    try {
      const res = await axios.post('https://napi.bharatmedicalhallplus.com/wallet/handover/request', {
        from_employee_id: adminId,
        to_employee_id: selectedPeerId,
        amount: Number(amount)
      });
      if (res.data.success) {
        Alert.alert('Success', 'Handover requested successfully');
        setHandoverModalVisible(false);
        setAmount(''); setSelectedPeerId('');
        fetchData(adminId);
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to request handover');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptHandover = async (id: string, action: 'Accepted' | 'Rejected') => {
    try {
      const res = await axios.post('https://napi.bharatmedicalhallplus.com/wallet/handover/accept', { id, action });
      if (res.data.success) {
        Alert.alert('Success', `Handover ${action.toLowerCase()}`);
        if(adminId) fetchData(adminId);
      }
    } catch (error) {
      Alert.alert('Error', `Failed to ${action.toLowerCase()}`);
    }
  };

  const incomingHandovers = handovers.filter(h => h.to_employee_id === adminId && h.status === 'Pending');
  const pastHandovers = handovers.filter(h => h.to_employee_id === adminId && h.status !== 'Pending');

  // System-wide cash summary — use server-side revenue-stats (same as admin dashboard) for accuracy
  // stats.totalCashInWallets = all staff cash, stats.totalPendingHandovers = all pending system handovers
  const totalStaffCashInHand = parseFloat(String(stats.totalCashInWallets || '0'));
  const totalEmployeeCash = walletBalances.filter((item: any) => {
    const roleLower = (item.role || '').toLowerCase();
    return !roleLower.includes('sub_admin') && !roleLower.includes('sub admin');
  }).reduce((acc: number, item: any) => acc + parseFloat(item.cash_in_hand || '0'), 0);
  const totalSubAdminCash = walletBalances.filter((item: any) => {
    const roleLower = (item.role || '').toLowerCase();
    return roleLower.includes('sub_admin') || roleLower.includes('sub admin');
  }).reduce((acc: number, item: any) => acc + parseFloat(item.cash_in_hand || '0'), 0);

  // Use backend-computed pending handover total (all system pending, not just this admin's)
  const allPendingHandoversTotal = parseFloat(String(stats.totalPendingHandovers || '0'));
  const pendingIncoming = incomingHandovers.reduce((acc: number, h: any) => acc + parseFloat(h.amount || '0'), 0);

  // Total cash across entire system (vault + all staff)
  const vaultCash = parseFloat(cashInHand || '0');
  const systemTotalCash = vaultCash + totalStaffCashInHand;

  return (
    <View style={[styles.container, !isDesktop && styles.containerMobile]}>
      <View style={[styles.header, !isDesktop && styles.headerMobile]}>
        <View>
          <Text style={styles.title}>Super Admin Vault</Text>
          <Text style={styles.subtitle}>Manage cash handed over from departments and track revenue.</Text>
        </View>
        <View style={styles.headerButtons}>
          <Pressable style={[styles.primaryBtn, {backgroundColor: '#16a34a'}]} onPress={() => {setAmount(cashInHand); setHandoverModalVisible(true)}}>
            <HandCoins size={18} color="#FFF" />
            <Text style={styles.primaryBtnText}>Handover Cash</Text>
          </Pressable>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.light.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: '#ECFDF5', borderColor: '#D1FAE5' }]}>
              <View style={[styles.iconBox, { backgroundColor: '#10B9811A' }]}>
                <Banknote size={24} color="#10B981" />
              </View>
              <Text style={{ fontSize: 16, color: '#059669', fontWeight: '600', marginTop: 12 }}>Vault Cash Balance</Text>
              <Text style={{ fontSize: 32, fontWeight: '800', color: '#064E3B' }}>₹{cashInHand}</Text>
            </View>

            {/* Cash Revenue Card */}
            <View style={[styles.statCard, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
              <View style={[styles.iconBox, { backgroundColor: '#16a34a1A' }]}>
                <IndianRupee size={24} color="#16a34a" />
              </View>
              <Text style={{ fontSize: 16, color: '#15803d', fontWeight: '600', marginTop: 12 }}> Bookings Cash Revenue</Text>
              <Text style={{ fontSize: 32, fontWeight: '800', color: '#14532d' }}>₹{parseFloat(String(stats.totalCash || 0)).toFixed(2)}</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: '#EFF6FF', borderColor: '#DBEAFE' }]}>
              <View style={[styles.iconBox, { backgroundColor: '#3B82F61A' }]}>
                <CreditCard size={24} color="#3B82F6" />
              </View>
              <Text style={{ fontSize: 16, color: '#2563EB', fontWeight: '600', marginTop: 12 }}> Bookings Online Revenue</Text>
              <Text style={{ fontSize: 32, fontWeight: '800', color: '#1E3A8A' }}>₹{parseFloat(String(stats.totalOnline || 0)).toFixed(2)}</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: '#FDF4FF', borderColor: '#FAE8FF' }]}>
              <View style={[styles.iconBox, { backgroundColor: '#D946EF1A' }]}>
                <TrendingUp size={24} color="#D946EF" />
              </View>
              <Text style={{ fontSize: 16, color: '#C026D3', fontWeight: '600', marginTop: 12 }}>Bookings Total Revenue</Text>
              <Text style={{ fontSize: 32, fontWeight: '800', color: '#701A75' }}>
                ₹{(parseFloat(String(stats.totalCash || 0)) + parseFloat(String(stats.totalOnline || 0))).toFixed(2)}
              </Text>
            </View>
          </View>

          {/* System-wide Cash Summary — sourced from backend revenue-stats API */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#475569', marginBottom: 10, letterSpacing: 0.5, textTransform: 'uppercase' }}>System Cash Overview</Text>
            <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
              {/* Employee Cash in Hand */}
              <View style={{ flex: 1, minWidth: 160, backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa', borderRadius: 12, padding: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#f97316' }} />
                  <Text style={{ fontSize: 12, color: '#c2410c', fontWeight: '600' }}>Employee Cash in Hand</Text>
                </View>
                <Text style={{ fontSize: 22, fontWeight: '800', color: '#9a3412' }}>₹{totalEmployeeCash.toFixed(2)}</Text>
                <Text style={{ fontSize: 11, color: '#c2410c', marginTop: 4 }}>{walletBalances.filter((i: any) => !((i.role||'').toLowerCase().includes('sub_admin')||(i.role||'').toLowerCase().includes('sub admin'))).length} employees</Text>
              </View>

              {/* Sub-Admin Cash in Hand */}
              <View style={{ flex: 1, minWidth: 160, backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a', borderRadius: 12, padding: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#eab308' }} />
                  <Text style={{ fontSize: 12, color: '#92400e', fontWeight: '600' }}>Sub-Admin Cash in Hand</Text>
                </View>
                <Text style={{ fontSize: 22, fontWeight: '800', color: '#78350f' }}>₹{totalSubAdminCash.toFixed(2)}</Text>
                <Text style={{ fontSize: 11, color: '#92400e', marginTop: 4 }}>{walletBalances.filter((i: any) => (i.role||'').toLowerCase().includes('sub_admin')||(i.role||'').toLowerCase().includes('sub admin')).length} sub-admins</Text>
              </View>

              {/* Pending Handovers — from backend (system-wide) */}
              <View style={{ flex: 1, minWidth: 160, backgroundColor: '#fef3c7', borderWidth: 1, borderColor: '#fcd34d', borderRadius: 12, padding: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#d97706' }} />
                  <Text style={{ fontSize: 12, color: '#b45309', fontWeight: '600' }}>Pending Handovers (All)</Text>
                </View>
                <Text style={{ fontSize: 22, fontWeight: '800', color: '#92400e' }}>₹{allPendingHandoversTotal.toFixed(2)}</Text>
                <Text style={{ fontSize: 11, color: '#b45309', marginTop: 4 }}>To vault: ₹{pendingIncoming.toFixed(2)}</Text>
              </View>

              {/* Total System Cash = vault + all staff */}
              <View style={{ flex: 1, minWidth: 160, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 12, padding: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#16a34a' }} />
                  <Text style={{ fontSize: 12, color: '#15803d', fontWeight: '600' }}>Total System Cash</Text>
                </View>
                <Text style={{ fontSize: 22, fontWeight: '800', color: '#14532d' }}>₹{systemTotalCash.toFixed(2)}</Text>
                <Text style={{ fontSize: 11, color: '#15803d', marginTop: 4 }}>Vault + All Staff</Text>
              </View>
            </View>
          </View>

          {incomingHandovers.length > 0 && (
            <View style={styles.pendingSection}>
              <Text style={styles.sectionTitle}>Incoming Cash Handovers</Text>
              {incomingHandovers.map(h => (
                <View key={h.id} style={styles.pendingCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pendingAmount}>₹{h.amount}</Text>
                    <Text style={styles.pendingNote}>From: {h.from_name} ({h.from_employee_id})</Text>
                    <Text style={{fontSize: 12, color: '#475569', marginTop: 2}}>{h.from_role} • {h.from_department}</Text>
                    <Text style={styles.txDate}>{new Date(h.created_at).toLocaleString()}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Pressable style={[styles.acceptBtn, {backgroundColor: '#ef4444'}]} onPress={() => handleAcceptHandover(h.id, 'Rejected')}>
                      <Text style={styles.acceptBtnText}>Reject</Text>
                    </Pressable>
                    <Pressable style={styles.acceptBtn} onPress={() => handleAcceptHandover(h.id, 'Accepted')}>
                      <CheckCircle2 size={16} color="#FFF" />
                      <Text style={styles.acceptBtnText}>Accept</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={styles.balancesSection}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <Users size={20} color={Colors.light.text} />
              <Text style={[styles.sectionTitle, { marginBottom: 0, marginLeft: 8 }]}>Sub-Admin & Employee Cash Holdings</Text>
            </View>

            {/* Search and Dropdown Filter */}
            <View style={{ flexDirection: 'row', gap: 16, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <TextInput
                style={{ flex: 1, minWidth: 200, borderWidth: 1, borderColor: Colors.light.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14 }}
                placeholder="Search by employee/sub admin name or ID..."
                value={searchNameQuery}
                onChangeText={setSearchNameQuery}
              />
              {Platform.OS === 'web' ? (
                <select
                  value={roleFilter}
                  onChange={(e: any) => setRoleFilter(e.target.value as any)}
                  style={{ padding: 8, borderRadius: 8, border: `1px solid ${Colors.light.border}`, fontSize: 14, outline: 'none', height: 38, cursor: 'pointer' }}
                >
                  <option value="All">All Roles</option>
                  <option value="Sub Admin">Sub Admins Only</option>
                  <option value="Employee">Employees Only</option>
                </select>
              ) : (
                <TextInput
                  style={{ width: 120, borderWidth: 1, borderColor: Colors.light.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14 }}
                  placeholder="Role (All/Sub/Emp)"
                  value={roleFilter}
                  onChangeText={(val: any) => setRoleFilter(val)}
                />
              )}
            </View>

            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCell, { flex: 2, fontWeight: '600' }]}>Name / ID</Text>
                <Text style={[styles.tableCell, { flex: 1, fontWeight: '600' }]}>Role</Text>
                <Text style={[styles.tableCell, { flex: 1, fontWeight: '600' }]}>Department</Text>
                <Text style={[styles.tableCell, { flex: 1, fontWeight: '600', textAlign: 'right' }]}>Cash in Hand</Text>
              </View>
              {filteredBalances.map((item, idx) => (
                <Pressable key={idx} style={styles.tableRow} onPress={() => openEmployeeDetails(item)}>
                  <View style={{ flex: 2 }}>
                    <Text style={{ fontWeight: '500', color: Colors.light.text }}>{item.full_name}</Text>
                    <Text style={{ fontSize: 12, color: Colors.light.icon }}>{item.employee_id}</Text>
                  </View>
                  <Text style={[styles.tableCell, { flex: 1 }]}>{item.role}</Text>
                  <Text style={[styles.tableCell, { flex: 1, color: Colors.light.icon, fontSize: 13 }]}>{item.department || 'N/A'}</Text>
                  <Text style={[styles.tableCell, { flex: 1, textAlign: 'right', fontWeight: '700', color: '#059669' }]}>
                    ₹{item.cash_in_hand}
                  </Text>
                </Pressable>
              ))}
              {filteredBalances.length === 0 && (
                <Text style={{ padding: 16, textAlign: 'center', color: Colors.light.icon }}>No balances found.</Text>
              )}
            </View>
          </View>

          <View style={{ marginTop: 32 }}>
            <Text style={styles.sectionTitle}>Handover History</Text>
            {pastHandovers.length === 0 && <Text style={{color: Colors.light.icon}}>No past handovers.</Text>}
            {pastHandovers.map(h => (
              <View key={h.id} style={styles.historyCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View>
                    <Text style={styles.historyPeer}>From: {h.from_name} ({h.from_employee_id})</Text>
                      {h.from_role && <Text style={{fontSize: 12, color: '#475569', marginTop: 2}}>{h.from_role} • {h.from_department}</Text>}
                      <Text style={styles.historyDate}>{new Date(h.created_at).toLocaleString()}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.historyAmount, { color: h.status === 'Accepted' ? '#10B981' : '#ef4444' }]}>
                      +₹{h.amount}
                    </Text>
                    <View style={styles.tag}>
                      <Text style={styles.tagText}>{h.status}</Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>

        </ScrollView>
      )}

      <Modal visible={handoverModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, !isDesktop && styles.modalContentMobile]}>
            <Text style={styles.modalTitle}>Handover Cash</Text>
            
            <Text style={styles.inputLabel}>Select Person</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Search name..." 
                value={searchQuery}
                onChangeText={setSearchQuery} 
              />
              <View style={{ maxHeight: 200, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, marginTop: 8, marginBottom: 16 }}>
                <ScrollView nestedScrollEnabled>
                  {peers.filter((p: any) => p.full_name && p.full_name.toLowerCase().includes(searchQuery.toLowerCase())).map((p: any) => (
                    <Pressable 
                      key={p.id} 
                      style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', backgroundColor: selectedPeerId === p.id ? '#eff6ff' : 'transparent' }}
                      onPress={() => setSelectedPeerId(p.id)}
                    >
                      <Text style={{ color: selectedPeerId === p.id ? '#2563eb' : '#334155', fontWeight: selectedPeerId === p.id ? '600' : '400' }}>{p.full_name}</Text>
                      {(p.role || p.department) && (
                        <Text style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>
                          {p.role || 'Unknown Role'} {p.department ? `• ${p.department}` : ''}
                        </Text>
                      )}
                      
                    </Pressable>
                  ))}
                  {peers.length === 0 && <Text style={{padding: 12, color: '#64748b'}}>No persons found.</Text>}
                </ScrollView>
              </View>

            <Text style={styles.inputLabel}>Amount to Handover</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 500"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />

            <View style={styles.modalButtons}>
              <Pressable style={styles.modalCancelBtn} onPress={() => {setHandoverModalVisible(false); setSelectedPeerId('');}}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.modalSubmitBtn, submitting && styles.btnDisabled]} onPress={handleRequestHandover} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.modalSubmitText}>Submit</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={detailsModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 800, maxHeight: '90%' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <View>
                <Text style={{ fontSize: 24, fontWeight: '800', color: Colors.light.text }}>
                  {selectedEmployee?.full_name || 'Loading...'}
                </Text>
                <Text style={{ fontSize: 14, color: Colors.light.icon }}>
                  {selectedEmployee?.role} • {selectedEmployee?.department || 'N/A'} ({selectedEmployee?.employee_id})
                </Text>
              </View>
              <Pressable style={{ padding: 8 }} onPress={() => setDetailsModalVisible(false)}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#ef4444' }}>Close</Text>
              </Pressable>
            </View>

            {/* Date Filters & Export/Print Actions */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
              {Platform.OS === 'web' ? (
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                  <Text style={{ fontSize: 14, fontWeight: '600' }}>From:</Text>
                  <input 
                    type="date" 
                    value={filterStartDate} 
                    onChange={(e: any) => setFilterStartDate(e.target.value)} 
                    style={{ padding: 8, borderRadius: 6, border: '1px solid #cbd5e1', outline: 'none' }}
                  />
                  <Text style={{ fontSize: 14, fontWeight: '600' }}>To:</Text>
                  <input 
                    type="date" 
                    value={filterEndDate} 
                    onChange={(e: any) => setFilterEndDate(e.target.value)} 
                    style={{ padding: 8, borderRadius: 6, border: '1px solid #cbd5e1', outline: 'none' }}
                  />
                </View>
              ) : (
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', flex: 1 }}>
                  <TextInput
                    style={{ flex: 1, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 8 }}
                    placeholder="Start (YYYY-MM-DD)"
                    value={filterStartDate}
                    onChangeText={setFilterStartDate}
                  />
                  <TextInput
                    style={{ flex: 1, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 8 }}
                    placeholder="End (YYYY-MM-DD)"
                    value={filterEndDate}
                    onChangeText={setFilterEndDate}
                  />
                </View>
              )}

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable 
                  style={{ backgroundColor: '#10b981', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }} 
                  onPress={handleExportModalCSV}
                >
                  <Text style={{ color: 'white', fontWeight: 'bold' }}>Export CSV</Text>
                </Pressable>
                <Pressable 
                  style={{ backgroundColor: '#3b82f6', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }} 
                  onPress={handlePrintModalPDF}
                >
                  <Text style={{ color: 'white', fontWeight: 'bold' }}>Print PDF</Text>
                </Pressable>
              </View>
            </View>

            {/* Modal Tabs */}
            <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', marginBottom: 15 }}>
              <Pressable 
                style={[{ paddingVertical: 10, paddingHorizontal: 20, borderBottomWidth: 2, borderBottomColor: 'transparent' }, modalActiveTab === 'ledger' && { borderBottomColor: '#3b82f6' }]} 
                onPress={() => setModalActiveTab('ledger')}
              >
                <Text style={[{ fontSize: 15, color: '#64748b' }, modalActiveTab === 'ledger' && { color: '#3b82f6', fontWeight: '700' }]}>
                  Cash Ledger
                </Text>
              </Pressable>
              <Pressable 
                style={[{ paddingVertical: 10, paddingHorizontal: 20, borderBottomWidth: 2, borderBottomColor: 'transparent' }, modalActiveTab === 'handovers' && { borderBottomColor: '#3b82f6' }]} 
                onPress={() => setModalActiveTab('handovers')}
              >
                <Text style={[{ fontSize: 15, color: '#64748b' }, modalActiveTab === 'handovers' && { color: '#3b82f6', fontWeight: '700' }]}>
                  Handovers
                </Text>
              </Pressable>
              <Pressable 
                style={[{ paddingVertical: 10, paddingHorizontal: 20, borderBottomWidth: 2, borderBottomColor: 'transparent' }, modalActiveTab === 'bookings' && { borderBottomColor: '#3b82f6' }]} 
                onPress={() => setModalActiveTab('bookings')}
              >
                <Text style={[{ fontSize: 15, color: '#64748b' }, modalActiveTab === 'bookings' && { color: '#3b82f6', fontWeight: '700' }]}>
                  Bookings
                </Text>
              </Pressable>
              <Pressable 
                style={[{ paddingVertical: 10, paddingHorizontal: 20, borderBottomWidth: 2, borderBottomColor: 'transparent' }, modalActiveTab === 'orders' && { borderBottomColor: '#3b82f6' }]} 
                onPress={() => setModalActiveTab('orders')}
              >
                <Text style={[{ fontSize: 15, color: '#64748b' }, modalActiveTab === 'orders' && { color: '#3b82f6', fontWeight: '700' }]}>
                  Orders
                </Text>
              </Pressable>
            </View>

            {/* Tab content table */}
            {historyLoading ? (
              <ActivityIndicator size="large" color="#3b82f6" style={{ marginVertical: 40 }} />
            ) : (
              <ScrollView style={{ flex: 1 }}>
                {modalActiveTab === 'ledger' && (
                  <View style={styles.table}>
                    <View style={styles.tableHeader}>
                      <Text style={[styles.tableCell, { flex: 1.5, fontWeight: '600' }]}>Date & Time</Text>
                      <Text style={[styles.tableCell, { flex: 2.5, fontWeight: '600' }]}>Particulars (Narration)</Text>
                      <Text style={[styles.tableCell, { flex: 1.2, fontWeight: '600' }]}>Staff/Details</Text>
                      <Text style={[styles.tableCell, { flex: 1, fontWeight: '600', textAlign: 'right', color: '#ef4444' }]}>Debit (-)</Text>
                      <Text style={[styles.tableCell, { flex: 1, fontWeight: '600', textAlign: 'right', color: '#22c55e' }]}>Credit (+)</Text>
                      <Text style={[styles.tableCell, { flex: 1.2, fontWeight: '600', textAlign: 'right' }]}>Balance</Text>
                    </View>

                    {/* Closing Balance Row (Shown first on screen: latest at top) */}
                    <View style={[styles.tableRow, { backgroundColor: '#f8fafc', borderBottomWidth: 2, borderBottomColor: '#cbd5e1' }]}>
                      <Text style={[styles.tableCell, { flex: 1.5, fontSize: 13, color: '#64748b' }]}>-</Text>
                      <Text style={[styles.tableCell, { flex: 2.5, fontSize: 13, fontWeight: '700', color: '#0f172a' }]}>Closing Balance</Text>
                      <Text style={[styles.tableCell, { flex: 1.2, fontSize: 13, color: '#64748b' }]}>-</Text>
                      <Text style={[styles.tableCell, { flex: 1, fontSize: 13, color: '#64748b', textAlign: 'right' }]}>-</Text>
                      <Text style={[styles.tableCell, { flex: 1, fontSize: 13, color: '#64748b', textAlign: 'right' }]}>-</Text>
                      <Text style={[styles.tableCell, { flex: 1.2, fontSize: 13, color: '#16a34a', textAlign: 'right', fontWeight: '800' }]}>
                        ₹{(cashLedger.length > 0 ? cashLedger[cashLedger.length - 1].runningBalanceVal : cashOpeningBalance).toFixed(2)}
                      </Text>
                    </View>

                    {cashLedger.length === 0 ? (
                      <Text style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>No collections or handovers in this range.</Text>
                    ) : (
                      [...cashLedger].reverse().map((item: any) => {
                        const isPending = item.status !== 'Accepted';
                        return (
                          <View key={item.id} style={styles.tableRow}>
                            <Text style={[styles.tableCell, { flex: 1.5, fontSize: 13 }]}>{formatDateTimeToDDMMYYYY(item.dateStr)}</Text>
                            <View style={{ flex: 2.5 }}>
                              <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.light.text }}>{item.particulars}</Text>
                              {item.note ? <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{item.note}</Text> : null}
                              {item.postBalance && (
                                <Text style={{ fontSize: 11, color: '#059669', fontWeight: '600', marginTop: 2 }}>
                                  Logged Balance: {item.postBalance}
                                </Text>
                              )}
                              {isPending && (
                                <View style={{ alignSelf: 'flex-start', backgroundColor: item.status === 'Pending' ? '#fef08a' : '#fee2e2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4 }}>
                                  <Text style={{ fontSize: 10, fontWeight: '700', color: item.status === 'Pending' ? '#854d0e' : '#991b1b', textTransform: 'uppercase' }}>{item.status}</Text>
                                </View>
                              )}
                            </View>
                            <Text style={[styles.tableCell, { flex: 1.2, fontSize: 12 }]}>{item.roleDept}</Text>
                            <Text style={[styles.tableCell, { flex: 1, textAlign: 'right', fontWeight: '500', color: '#ef4444' }]}>{item.debit}</Text>
                            <Text style={[styles.tableCell, { flex: 1, textAlign: 'right', fontWeight: '500', color: '#22c55e' }]}>{item.credit}</Text>
                            <Text style={[styles.tableCell, { flex: 1.2, textAlign: 'right', fontWeight: '700', color: Colors.light.text }]}>
                              {item.runningBalance}
                            </Text>
                          </View>
                        );
                      })
                    )}

                    {/* Opening Balance Row (Shown last on screen: oldest at bottom) */}
                    <View style={styles.tableRow}>
                      <Text style={[styles.tableCell, { flex: 1.5, fontSize: 13, color: '#64748b' }]}>-</Text>
                      <Text style={[styles.tableCell, { flex: 2.5, fontSize: 13, fontWeight: '700', color: '#475569' }]}>Opening Balance</Text>
                      <Text style={[styles.tableCell, { flex: 1.2, fontSize: 13, color: '#64748b' }]}>-</Text>
                      <Text style={[styles.tableCell, { flex: 1, fontSize: 13, color: '#64748b', textAlign: 'right' }]}>-</Text>
                      <Text style={[styles.tableCell, { flex: 1, fontSize: 13, color: '#64748b', textAlign: 'right' }]}>-</Text>
                      <Text style={[styles.tableCell, { flex: 1.2, fontSize: 13, color: '#0f172a', textAlign: 'right', fontWeight: '700' }]}>₹{cashOpeningBalance.toFixed(2)}</Text>
                    </View>
                  </View>
                )}

                {modalActiveTab === 'handovers' && (
                  <View style={styles.table}>
                    <View style={styles.tableHeader}>
                      <Text style={[styles.tableCell, { flex: 1.5, fontWeight: '600' }]}>Date/Time</Text>
                      <Text style={[styles.tableCell, { flex: 2.5, fontWeight: '600' }]}>Particulars</Text>
                      <Text style={[styles.tableCell, { flex: 1, fontWeight: '600', textAlign: 'right', color: '#ef4444' }]}>Debit (-)</Text>
                      <Text style={[styles.tableCell, { flex: 1, fontWeight: '600', textAlign: 'right', color: '#22c55e' }]}>Credit (+)</Text>
                    </View>
                    {filteredHandovers.map((h, i) => {
                      const _sid = (id: string) => (id || '').replace(/^(EMP-|SA-|DOC-|ADMIN-)/, '');
                      const isOut = _sid(String(h.from_employee_id)) === _sid(String(selectedEmployee?.employee_id));
                      const receiver = h.to_employee_id ? h.to_name : (h.customer_name ? `${h.customer_name} (Patient)` : 'Patient');
                      return (
                        <View key={i} style={styles.tableRow}>
                          <Text style={[styles.tableCell, { flex: 1.5, fontSize: 13 }]}>{formatDateTimeToDDMMYYYY(h.created_at)}</Text>
                          <View style={{ flex: 2 }}>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: isOut ? '#ef4444' : '#16a34a' }}>
                              {isOut ? `Cash Handover to ${receiver}` : `Received from ${h.from_name}`}
                            </Text>
                            {h.note ? <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{h.note}</Text> : null}
                            {h.status !== 'Accepted' && (
                              <View style={{ alignSelf: 'flex-start', backgroundColor: h.status === 'Pending' ? '#fef08a' : '#fee2e2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4 }}>
                                <Text style={{ fontSize: 10, fontWeight: '700', color: h.status === 'Pending' ? '#854d0e' : '#991b1b', textTransform: 'uppercase' }}>{h.status}</Text>
                              </View>
                            )}
                          </View>
                          <Text style={[styles.tableCell, { flex: 1, textAlign: 'right', fontWeight: '500', color: '#ef4444', opacity: h.status === 'Pending' ? 0.6 : 1 }]}>
                            {isOut ? `₹${parseFloat(h.amount).toFixed(2)}` : '-'}
                          </Text>
                          <Text style={[styles.tableCell, { flex: 1, textAlign: 'right', fontWeight: '500', color: '#22c55e', opacity: h.status === 'Pending' ? 0.6 : 1 }]}>
                            {!isOut ? `₹${parseFloat(h.amount).toFixed(2)}` : '-'}
                          </Text>
                        </View>
                      );
                    })}
                    {filteredHandovers.length === 0 && (
                      <Text style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>No handovers found.</Text>
                    )}
                  </View>
                )}

                {modalActiveTab === 'bookings' && (
                  <View style={styles.table}>
                    <View style={styles.tableHeader}>
                      <Text style={[styles.tableCell, { flex: 1, fontWeight: '600' }]}>ID</Text>
                      <Text style={[styles.tableCell, { flex: 1.5, fontWeight: '600' }]}>Date/Time</Text>
                      <Text style={[styles.tableCell, { flex: 2, fontWeight: '600' }]}>Patient / Doctor / Slot</Text>
                      <Text style={[styles.tableCell, { flex: 1.2, fontWeight: '600', textAlign: 'right' }]}>Amount</Text>
                      <Text style={[styles.tableCell, { flex: 1, fontWeight: '600', textAlign: 'right' }]}>Status</Text>
                    </View>
                    {filteredBookings.map((b, i) => (
                      <View key={i} style={styles.tableRow}>
                        <Text style={[styles.tableCell, { flex: 1, fontSize: 13 }]}>#{b.id}</Text>
                        <Text style={[styles.tableCell, { flex: 1.5, fontSize: 13 }]}>{formatDateTimeToDDMMYYYY(b.created_at)}</Text>
                        <View style={{ flex: 2, justifyContent: 'center' }}>
                          <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.light.text }}>{b.patient_name || 'N/A'}</Text>
                          <Text style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>Doc: Dr. {b.doctor_name || 'N/A'}</Text>
                          <Text style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
                            Slot: {b.start_time ? b.start_time.substring(0, 5) : ''} - {b.end_time ? b.end_time.substring(0, 5) : ''}
                          </Text>
                        </View>
                        <Text style={[styles.tableCell, { flex: 1.2, textAlign: 'right', fontWeight: '700' }]}>₹{b.amount}</Text>
                        <Text style={[styles.tableCell, { flex: 1, textAlign: 'right', fontSize: 13, color: '#10b981' }]}>{b.payment_status}</Text>
                      </View>
                    ))}
                    {filteredBookings.length === 0 && (
                      <Text style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>No bookings found.</Text>
                    )}
                  </View>
                )}

                {modalActiveTab === 'orders' && (
                  <View style={styles.table}>
                    <View style={styles.tableHeader}>
                      <Text style={[styles.tableCell, { flex: 1.5, fontWeight: '600' }]}>Order No</Text>
                      <Text style={[styles.tableCell, { flex: 1.2, fontWeight: '600' }]}>Date</Text>
                      <Text style={[styles.tableCell, { flex: 1.5, fontWeight: '600' }]}>Customer</Text>
                      <Text style={[styles.tableCell, { flex: 1, fontWeight: '600', textAlign: 'right' }]}>Total</Text>
                      <Text style={[styles.tableCell, { flex: 1.2, fontWeight: '600', textAlign: 'right' }]}>Cash / Online</Text>
                      <Text style={[styles.tableCell, { flex: 1, fontWeight: '600', textAlign: 'center' }]}>Mode</Text>
                      <Text style={[styles.tableCell, { flex: 1, fontWeight: '600', textAlign: 'right' }]}>Status</Text>
                    </View>
                    {filteredOrders.map((o, i) => {
                      const isDelivered = ['delivered','completed'].includes((o.status||'').toLowerCase());
                      const sourceLabel = o.order_source === 'online_order' ? 'Online' : o.order_source === 'sales_order' ? 'Sales' : 'Manual';
                      const sourceBg = o.order_source === 'online_order' ? '#dbeafe' : o.order_source === 'sales_order' ? '#fef9c3' : '#f0fdf4';
                      const sourceColor = o.order_source === 'online_order' ? '#1d4ed8' : o.order_source === 'sales_order' ? '#a16207' : '#15803d';
                      return (
                        <View key={i} style={[styles.tableRow, { flexWrap: 'wrap' }]}>
                          <View style={{ flex: 1.5, flexDirection: 'column', paddingRight: 4 }}>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: '#1e293b' }}>{o.order_no || `#${o.id}`}</Text>
                            <View style={{ backgroundColor: sourceBg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginTop: 3, alignSelf: 'flex-start' }}>
                              <Text style={{ fontSize: 10, color: sourceColor, fontWeight: '700' }}>{sourceLabel}</Text>
                            </View>
                          </View>
                          <View style={{ flex: 1.2, flexDirection: 'column' }}>
                            <Text style={{ fontSize: 13, color: '#334155' }}>{formatDateOnlyToDDMMYYYY(o.order_date || o.created_at)}</Text>
                            {o.delivered_at && (
                              <Text style={{ fontSize: 10, color: '#10b981' }}>Del: {formatDateOnlyToDDMMYYYY(o.delivered_at)}</Text>
                            )}
                          </View>
                          <Text style={[styles.tableCell, { flex: 1.5, fontSize: 13 }]}>{o.customer_name || 'N/A'}</Text>
                          <Text style={[styles.tableCell, { flex: 1, textAlign: 'right', fontWeight: '700', fontSize: 13 }]}>₹{parseFloat(o.amount || 0).toFixed(2)}</Text>
                          <View style={{ flex: 1.2, alignItems: 'flex-end' }}>
                            {parseFloat(o.cash_amount || 0) > 0 && (
                              <Text style={{ fontSize: 12, color: '#16a34a', fontWeight: '600' }}>💵 ₹{parseFloat(o.cash_amount).toFixed(2)}</Text>
                            )}
                            {parseFloat(o.online_amount || 0) > 0 && (
                              <Text style={{ fontSize: 12, color: '#2563eb', fontWeight: '600' }}>📱 ₹{parseFloat(o.online_amount).toFixed(2)}</Text>
                            )}
                            {parseFloat(o.credit_amount || 0) > 0 && (
                              <Text style={{ fontSize: 12, color: '#dc2626', fontWeight: '600' }}>🔴 ₹{parseFloat(o.credit_amount).toFixed(2)}</Text>
                            )}
                            {!parseFloat(o.cash_amount || 0) && !parseFloat(o.online_amount || 0) && (
                              <Text style={{ fontSize: 12, color: '#94a3b8' }}>—</Text>
                            )}
                          </View>
                          <View style={{ flex: 1, alignItems: 'center' }}>
                            {o.pod_payment_mode ? (
                              <View style={{ backgroundColor: '#f0fdf4', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                                <Text style={{ fontSize: 11, color: '#15803d', fontWeight: '600' }}>{o.pod_payment_mode}</Text>
                              </View>
                            ) : (
                              <Text style={{ fontSize: 11, color: '#94a3b8' }}>—</Text>
                            )}
                          </View>
                          <View style={{ flex: 1, alignItems: 'flex-end' }}>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: isDelivered ? '#10b981' : '#f59e0b' }}>{o.status}</Text>
                          </View>
                        </View>
                      );
                    })}
                    {filteredOrders.length === 0 && (
                      <Text style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>No orders found for this employee.</Text>
                    )}
                  </View>
                )}

              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background, padding: 32 },
  containerMobile: { padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 },
  headerMobile: { flexDirection: 'column', gap: 16 },
  title: { fontSize: 32, fontWeight: '800', color: Colors.light.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 16, color: Colors.light.icon, marginTop: 8 },
  statsGrid: { flexDirection: 'row', gap: 16, marginBottom: 32, flexWrap: 'wrap' },
  statCard: { flex: 1, minWidth: 250, padding: 24, borderRadius: 24, borderWidth: 1 },
  iconBox: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  pendingSection: { marginBottom: 32, backgroundColor: '#FFFBEB', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: '#FEF3C7' },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: Colors.light.text, marginBottom: 16 },
  pendingCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 12, shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  pendingAmount: { fontSize: 20, fontWeight: '700', color: Colors.light.text },
  pendingNote: { fontSize: 14, color: Colors.light.text, marginTop: 4 },
  txDate: { fontSize: 12, color: Colors.light.icon, marginTop: 4 },
  acceptBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.light.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, gap: 8 },
  acceptBtnText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  balancesSection: { marginBottom: 32, backgroundColor: '#FFF', padding: 24, borderRadius: 24, borderWidth: 1, borderColor: Colors.light.border },
  table: { backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: Colors.light.border, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#F8FAFC', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.light.border },
  tableRow: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.light.border, alignItems: 'center' },
  tableCell: { color: Colors.light.text, fontSize: 14 },
  historyCard: { backgroundColor: Colors.light.card, padding: 20, borderRadius: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  historyPeer: { fontSize: 16, fontWeight: '600', color: Colors.light.text },
  historyDate: { fontSize: 12, color: Colors.light.icon, marginTop: 4 },
  historyAmount: { fontSize: 16, fontWeight: '700' },
  tag: { backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginTop: 8 },
  tagText: { fontSize: 12, color: Colors.light.icon, fontWeight: '600' },
  headerButtons: { flexDirection: 'row', gap: 12 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.light.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, gap: 8 },
  primaryBtnText: { color: '#FFF', fontWeight: '600', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalContent: { backgroundColor: '#FFF', padding: 32, borderRadius: 24, width: '100%', maxWidth: 500 },
  modalContentMobile: { padding: 24 },
  modalTitle: { fontSize: 24, fontWeight: '800', color: Colors.light.text, marginBottom: 24 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: Colors.light.text, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: Colors.light.border, borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 24 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalCancelBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  modalCancelText: { color: Colors.light.icon, fontWeight: '600', fontSize: 16 },
  modalSubmitBtn: { backgroundColor: Colors.light.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  modalSubmitText: { color: '#FFF', fontWeight: '600', fontSize: 16 },
  btnDisabled: { opacity: 0.7 },
  peerList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  peerItem: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: 'transparent' },
  peerItemActive: { backgroundColor: '#EFF6FF', borderColor: '#3B82F6' },
  peerName: { color: '#64748B', fontWeight: '500' },
  peerNameActive: { color: '#2563EB', fontWeight: '600' }
});
