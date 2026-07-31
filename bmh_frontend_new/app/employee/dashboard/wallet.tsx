import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable, Platform, Modal, TextInput, Alert, ScrollView } from 'react-native';
import { Wallet, IndianRupee, ArrowUpRight, ArrowDownRight, Clock, CheckCircle2, Banknote, RefreshCcw, HandCoins, ChevronDown, ChevronUp, Calendar, ShieldCheck } from 'lucide-react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../../constants/Colors';
import { useResponsive } from '../../../hooks/useResponsive';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import DateTimePicker from '@react-native-community/datetimepicker';

type Transaction = { id: string; type: string; amount: string; note: string; status: string; created_at: string; payment_mode?: string; payment_txn_id?: string; order_no?: string; invoice_no?: string; customer_name?: string; customer_phone?: string; delivery_method?: string; cash_amount?: string; online_amount?: string; credit_amount?: string; };
type Handover = { id: string; from_name: string; to_name: string; from_employee_id: string; to_employee_id: string; amount: string; status: string; created_at: string; from_role?: string; from_department?: string; to_role?: string; to_department?: string; note?: string; credit_amount?: string; customer_name?: string; from_post_balance?: string | null; to_post_balance?: string | null; };
type Peer = { id: string; full_name: string; email: string; role: string; department: string; };
type Booking = { booking_id: string; token_number: number; patient_name: string; date: string; fee: string; payment_mode: string; doctor_name: string; created_at?: string; };

export default function EmployeeWalletScreen() {
  const { isDesktop } = useResponsive();
  const [activeTab, setActiveTab] = useState<'Allowance' | 'Cash'>('Allowance');

  // Accordion Expand/Collapse States
  const [isBookingsExpanded, setIsBookingsExpanded] = useState(false);
  const [isHandoversExpanded, setIsHandoversExpanded] = useState(true);
  const [isOrdersExpanded, setIsOrdersExpanded] = useState(false);

  // User
  const [user, setUser] = useState<any>(null);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [filterType, setFilterType] = useState<'booking' | 'appointment'>('booking');
  const [filterTxType, setFilterTxType] = useState<'all' | 'credit' | 'debit'>('all');  // ledger tx type filter
  const [filterPayMode, setFilterPayMode] = useState<'all' | 'cash' | 'online' | 'handover'>('all'); // payment mode filter

  // Allowances
  const [balance, setBalance] = useState('0.00');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  // Cash
  const [cashInHand, setCashInHand] = useState('0.00');
  const [handovers, setHandovers] = useState<Handover[]>([]);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);

  const [loading, setLoading] = useState(true);
  const [employeeId, setEmployeeId] = useState<string | null>(null);

  // Modals
  const [usageModalVisible, setUsageModalVisible] = useState(false);
  const [requestModalVisible, setRequestModalVisible] = useState(false);
  const [handoverModalVisible, setHandoverModalVisible] = useState(false);

  // Form states
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [selectedPeerId, setSelectedPeerId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      let empId = null;
      let userStr = null;
      if (Platform.OS === 'web') {
        userStr = localStorage.getItem('employeeUser');
      } else {
        userStr = await AsyncStorage.getItem('employeeUser');
      }
      if (userStr) {
        const u = JSON.parse(userStr);
        setUser(u);
        empId = u.id;
        setEmployeeId(empId);
      }
      if (empId) {
        fetchData(empId);
        fetchPeers(empId);
        fetchBookings(empId);
      }
    };
    loadUser();
  }, []);

  const formatDateDMY = (dateStr: string, includeTime = false) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      
      let formatted = `${day}-${month}-${year}`;
      
      if (includeTime) {
        let hours = d.getHours();
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        formatted += ` ${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
      }
      
      return formatted;
    } catch (e) {
      return dateStr;
    }
  };

  const exportToCSV = async (data: any[], filename: string, headers: string[], rowMapper: (item: any) => string[]) => {
    try {
      const headerRows = [
        `"Bharat Medical Hall"`,
        `"Employee Name:","${user?.full_name || 'N/A'}"`,
        `"Department:","${user?.department || 'N/A'}"`,
        `"Role:","${user?.role || 'Employee'}"`,
        `"Date Range:","${startDate || 'All'} to ${endDate || 'All'}"`,
        ``,
        headers.map(h => `"${h}"`).join(',')
      ];

      const dataRows = data.map(item => rowMapper(item).map(val => `"${String(val).replace(/"/g, '""')}"`).join(','));
      const csvContent = [...headerRows, ...dataRows].join('\n');

      if (Platform.OS === 'web') {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${filename}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // @ts-ignore
        const path = `${FileSystem.documentDirectory}${filename}.csv`;
        // @ts-ignore
        await FileSystem.writeAsStringAsync(path, csvContent, { encoding: FileSystem.EncodingType.UTF8 });
        await Sharing.shareAsync(path);
      }
    } catch (e: any) {
      Alert.alert("Error", "Failed to export CSV: " + e.message);
    }
  };

  const handlePrint = async (title: string, headers: string[], rows: any[], rowMapper: (item: any) => string[], extraHtml?: string) => {
    try {
      const tableHeadersHtml = headers.map(h => `<th>${h}</th>`).join('');
      const tableRowsHtml = rows.map(row => {
        const cells = rowMapper(row).map(val => `<td>${val}</td>`).join('');
        return `<tr>${cells}</tr>`;
      }).join('');

      const htmlContent = `
        <html>
          <head>
            <style>
              @page { size: portrait; margin: 8mm; }
              body { font-family: sans-serif; padding: 10px; color: #334155; }
              h1 { color: #0f172a; margin-bottom: 4px; text-align: center; font-size: 18px; }
              .meta-section { margin-top: 10px; margin-bottom: 12px; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 10px; }
              .meta-row { display: flex; margin-bottom: 4px; font-size: 11px; }
              .meta-label { font-weight: bold; width: 130px; color: #475569; }
              table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 9px; }
              th, td { border: 1px solid #cbd5e1; padding: 4px 6px; text-align: left; }
              th { background-color: #f8fafc; font-weight: bold; color: #1e293b; }
              tr:nth-child(even) { background-color: #f8fafc; }
            </style>
          </head>
          <body>
            <h1>Bharat Medical Hall</h1>
            <div class="meta-section">
              <div class="meta-row"><span class="meta-label">Report:</span><span>${title}</span></div>
              <div class="meta-row"><span class="meta-label">Employee Name:</span><span>${user?.full_name || 'N/A'}</span></div>
              <div class="meta-row"><span class="meta-label">Department:</span><span>${user?.department || 'N/A'}</span></div>
              <div class="meta-row"><span class="meta-label">Role:</span><span>${user?.role || 'Employee'}</span></div>
              <div class="meta-row"><span class="meta-label">Date Range:</span><span>${startDate || 'All'} to ${endDate || 'All'}</span></div>
              ${extraHtml || ''}
            </div>
            <table>
              <thead>
                <tr>${tableHeadersHtml}</tr>
              </thead>
              <tbody>
                ${tableRowsHtml}
              </tbody>
            </table>
          </body>
        </html>
      `;

      if (Platform.OS === 'web') {
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);
        const doc = iframe.contentWindow?.document || iframe.contentDocument;
        if (doc) {
          doc.open();
          doc.write(htmlContent);
          doc.close();
          setTimeout(() => {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            document.body.removeChild(iframe);
          }, 500);
        }
      } else {
        await Print.printAsync({ html: htmlContent });
      }
    } catch (e: any) {
      Alert.alert("Error", "Failed to print: " + e.message);
    }
  };

  const fetchData = async (id: string) => {
    setLoading(true);
    try {
      const [walletRes, handoversRes] = await Promise.all([
        axios.get(`https://napi.bharatmedicalhallplus.com/wallet/${id}`),
        axios.get(`https://napi.bharatmedicalhallplus.com/wallet/handovers/${id}`)
      ]);
      
      if (walletRes.data.success) {
        setBalance(walletRes.data.data.wallet?.balance || '0.00');
        setCashInHand(walletRes.data.data.wallet?.cash_in_hand || '0.00');
        setTransactions(walletRes.data.data.transactions || []);
      }
      if (handoversRes.data.success) {
        setHandovers(handoversRes.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPeers = async (id: string) => {
    try {
      const res = await axios.get(`https://napi.bharatmedicalhallplus.com/employees/all-users`);
      if (res.data.success) {
        // filter out self
        const filtered = res.data.data.filter((p: any) => p.id !== id);
        setPeers(filtered);
      }
    } catch (error) {}
  };

  const fetchBookings = async (id: string) => {
    try {
      const res = await axios.get(`https://napi.bharatmedicalhallplus.com/bookings?booked_by=${id}&exclude_blocked=true`);
      if (res.data.success) setBookings(res.data.data);
    } catch (error) {}
  };

  const handleLogUsage = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return Alert.alert('Error', 'Invalid amount');
    if (Number(amount) > Number(balance)) return Alert.alert('Error', 'Insufficient balance');
    if (!employeeId) return;

    setSubmitting(true);
    try {
      const res = await axios.post('https://napi.bharatmedicalhallplus.com/wallet/usage', { employee_id: employeeId, amount: Number(amount), note });
      if (res.data.success) {
        Alert.alert('Success', 'Usage logged successfully');
        setUsageModalVisible(false);
        setAmount(''); setNote('');
        fetchData(employeeId);
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to log usage');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestAllocation = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return Alert.alert('Error', 'Invalid amount');
    if (!employeeId) return;

    setSubmitting(true);
    try {
      const res = await axios.post('https://napi.bharatmedicalhallplus.com/wallet/request', { employee_id: employeeId, amount: Number(amount), note });
      if (res.data.success) {
        Alert.alert('Success', 'Allocation request sent');
        setRequestModalVisible(false);
        setAmount(''); setNote('');
        fetchData(employeeId);
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to request allocation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptAllocation = async (txId: string) => {
    if (!employeeId) return;
    try {
      const res = await axios.put(`https://napi.bharatmedicalhallplus.com/wallet/transaction/${txId}`, { status: 'completed' });
      if (res.data.success) fetchData(employeeId);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to accept allocation');
    }
  };

  const handleRequestHandover = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return Alert.alert('Error', 'Invalid amount');
    if (Number(amount) > Number(cashInHand)) return Alert.alert('Error', 'Insufficient cash in hand');
    if (!selectedPeerId) return Alert.alert('Error', 'Please select someone to hand over to');
    if (!employeeId) return;

    setSubmitting(true);
    try {
      const res = await axios.post('https://napi.bharatmedicalhallplus.com/wallet/handover/request', {
        from_employee_id: employeeId,
        to_employee_id: selectedPeerId,
        amount: Number(amount),
        note: note
      });
      if (res.data.success) {
        Alert.alert('Success', 'Handover requested successfully');
        setHandoverModalVisible(false);
        setAmount(''); setSelectedPeerId(''); setNote('');
        fetchData(employeeId);
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
        if(employeeId) fetchData(employeeId);
      }
    } catch (error) {
      Alert.alert('Error', `Failed to ${action.toLowerCase()}`);
    }
  };

  const pendingAllocations = transactions.filter(t => t.type === 'allocation_granted' && t.status === 'pending');
  const incomingHandovers = handovers.filter(h => h.to_employee_id == employeeId && h.status === 'Pending');

  const filteredTransactions = transactions.filter(tx => {
    if (!tx.created_at) return true;
    const txDate = new Date(tx.created_at).toISOString().split('T')[0];
    if (startDate && txDate < startDate) return false;
    if (endDate && txDate > endDate) return false;
    return true;
  });

  const rawAllowanceTransactions = filteredTransactions.filter(tx => 
    tx.type !== 'cash_collection' && tx.type !== 'online_collection' && tx.type !== 'split_collection' && tx.type !== 'cash_handover' && tx.type !== 'online_refund'
  ).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  let allowanceRunning = 0;
  const computedAllowanceTransactions = rawAllowanceTransactions.map(tx => {
    let credit = '-';
    let debit = '-';
    if (tx.status === 'completed') {
      if (tx.type === 'usage') {
        debit = `₹${tx.amount}`;
        allowanceRunning -= Number(tx.amount);
      } else {
        credit = `₹${tx.amount}`;
        allowanceRunning += Number(tx.amount);
      }
    }
    return {
      ...tx,
      credit,
      debit,
      runningBalance: `₹${allowanceRunning.toFixed(2)}`
    };
  });
  const allowanceTransactions = [...computedAllowanceTransactions].reverse();

  const collectedTransactions = filteredTransactions.filter(tx => 
    tx.type === 'cash_collection' || tx.type === 'online_collection' || tx.type === 'split_collection'
  ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const filteredBookings = bookings.filter(b => {
    const targetDateStr = filterType === 'booking' ? b.created_at : b.date;
    if (!targetDateStr) return true;
    const bDate = new Date(targetDateStr).toISOString().split('T')[0];
    if (startDate && bDate < startDate) return false;
    if (endDate && bDate > endDate) return false;
  }).sort((a, b) => {
    const dateA = new Date(filterType === 'booking' ? (a.created_at || a.date) : a.date).getTime();
    const dateB = new Date(filterType === 'booking' ? (b.created_at || b.date) : b.date).getTime();
    return dateB - dateA;
  });

  // Helper to compile cash ledger entries chronologically
  const buildCashLedger = () => {
    const entries: any[] = [];

    // Add Bookings
    bookings.forEach((b: any) => {
      const amt = parseFloat(b.fee || '0');
      if (amt > 0) {
        const isCash = b.payment_mode === 'Cash';
        entries.push({
          id: `booking-${b.booking_id || b.token_number}`,
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
    transactions.forEach((tx: any) => {
      if (tx.type === 'cash_collection' || tx.type === 'online_collection' || tx.type === 'split_collection') {
        const cashVal = tx.cash_amount !== undefined && tx.cash_amount !== null 
          ? parseFloat(tx.cash_amount) 
          : (tx.payment_mode === 'Cash' || tx.type === 'cash_collection' ? parseFloat(tx.amount || '0') : 0);
        const onlineVal = tx.online_amount !== undefined && tx.online_amount !== null 
          ? parseFloat(tx.online_amount) 
          : (tx.payment_mode === 'Online' || tx.type === 'online_collection' ? parseFloat(tx.amount || '0') : 0);
        
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
            id: `order-${tx.id}`,
            dateStr: tx.created_at,
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
      }
    });

    // Add Handovers
    handovers.forEach((h: any) => {
      const isOut = h.from_employee_id == employeeId;
      const targetName = isOut 
        ? (h.to_employee_id ? `${h.to_name} (${h.to_employee_id})` : h.customer_name || 'Patient') 
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

    // Calculate running balance backwards starting from the current actual cashInHand (for Accepted or Pending transactions)
    let cashBalance = parseFloat(cashInHand || '0');
    
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
      if (startDate && entryDate < startDate) return false;
      if (endDate && entryDate > endDate) return false;
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
      openingBalance = parseFloat(cashInHand || '0');
    }

    return {
      openingBalance,
      ledger: filteredEntries
    };
  };

  const { openingBalance: cashOpeningBalance, ledger: cashLedger } = buildCashLedger();

  // Bookings calculations
  const totalCashBooked = filteredBookings.filter(b => b.payment_mode === 'Cash').reduce((acc, b) => acc + Number(b.fee || 0), 0);
  const totalOnlineBooked = filteredBookings.filter(b => b.payment_mode === 'Online').reduce((acc, b) => acc + Number(b.fee || 0), 0);
  // Orders calculations
  const totalOrderCash = collectedTransactions.reduce((acc, tx) => {
    const cashVal = tx.cash_amount !== undefined && tx.cash_amount !== null ? Number(tx.cash_amount) : (tx.payment_mode === 'Cash' ? Number(tx.amount || 0) : 0);
    return acc + cashVal;
  }, 0);
  const totalOrderOnline = collectedTransactions.reduce((acc, tx) => {
    const onlineVal = tx.online_amount !== undefined && tx.online_amount !== null ? Number(tx.online_amount) : (tx.payment_mode === 'Online' ? Number(tx.amount || 0) : 0);
    return acc + onlineVal;
  }, 0);

  // Combined calculations (from filtered bookings/orders - kept for legacy cards)
  const combinedCash = totalCashBooked + totalOrderCash;
  const combinedOnline = totalOnlineBooked + totalOrderOnline;

  // Ledger-based filtered stats (cash & online collected in the filtered ledger range)
  const ledgerCashCollected = cashLedger
    .filter((item: any) => !item.id.startsWith('handover-'))
    .reduce((acc: number, item: any) => acc + (item.cashAmount || 0), 0);
  const ledgerOnlineCollected = cashLedger
    .filter((item: any) => !item.id.startsWith('handover-'))
    .reduce((acc: number, item: any) => acc + (item.onlineAmount || 0), 0);
  const ledgerHandoverOut = cashLedger
    .filter((item: any) => item.id.startsWith('handover-') && item.type === 'debit' && item.status === 'Accepted')
    .reduce((acc: number, item: any) => acc + (item.amount || 0), 0);
  const ledgerHandoverIn = cashLedger
    .filter((item: any) => item.id.startsWith('handover-') && item.type === 'credit' && item.status === 'Accepted')
    .reduce((acc: number, item: any) => acc + (item.amount || 0), 0);

  // Apply tx type + pay mode filters to the visible ledger
  const visibleLedger = cashLedger.filter((item: any) => {
    if (filterTxType === 'credit' && item.type !== 'credit') return false;
    if (filterTxType === 'debit' && item.type !== 'debit') return false;
    if (filterPayMode === 'cash') {
      if (item.id.startsWith('handover-')) return false;
      if ((item.cashAmount || 0) === 0) return false;
    }
    if (filterPayMode === 'online') {
      if (item.id.startsWith('handover-')) return false;
      if ((item.onlineAmount || 0) === 0) return false;
    }
    if (filterPayMode === 'handover' && !item.id.startsWith('handover-')) return false;
    return true;
  });

  return (
    <View style={[styles.container, !isDesktop && styles.containerMobile]}>
      <View style={[styles.header, !isDesktop && styles.headerMobile]}>
        <View>
          <Text style={styles.title}>My Wallet</Text>
          <Text style={styles.subtitle}>Manage allowances and collected cash.</Text>
        </View>
        <View style={styles.headerButtons}>
          <Pressable style={[styles.tabBtn, activeTab === 'Allowance' && styles.tabBtnActive]} onPress={() => setActiveTab('Allowance')}>
            <Wallet size={18} color={activeTab === 'Allowance' ? '#FFF' : Colors.light.primary} />
            <Text style={[styles.tabBtnText, activeTab === 'Allowance' && styles.tabBtnTextActive]}>Allowances</Text>
          </Pressable>
          <Pressable style={[styles.tabBtn, activeTab === 'Cash' && styles.tabBtnActive]} onPress={() => setActiveTab('Cash')}>
            <Banknote size={18} color={activeTab === 'Cash' ? '#FFF' : Colors.light.primary} />
            <Text style={[styles.tabBtnText, activeTab === 'Cash' && styles.tabBtnTextActive]}>Cash Collections</Text>
          </Pressable>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.light.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <View style={styles.filterCard}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: Colors.light.text, marginBottom: 16 }}>Filter by Date Range</Text>
            <View style={styles.filterRow}>
              <View style={styles.filterCol}>
                <Text style={styles.filterLabel}>Start Date</Text>
                {Platform.OS === 'web' ? (
                  <View style={styles.webDateInputContainer}>
                    <Calendar size={16} color="#64748b" style={{ marginRight: 8 }} />
                    <input
                      type="date"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      style={styles.webDateInput as any}
                    />
                  </View>
                ) : (
                  <>
                    <Pressable style={styles.mobileDateBtn} onPress={() => setShowStartPicker(true)}>
                      <Calendar size={16} color="#64748b" />
                      <Text style={styles.mobileDateBtnText}>
                        {startDate ? formatDateDMY(startDate, false) : 'Select Start Date'}
                      </Text>
                    </Pressable>
                    {showStartPicker && (
                      <DateTimePicker
                        value={startDate ? new Date(startDate) : new Date()}
                        mode="date"
                        display="default"
                        onChange={(event: any, date?: Date) => {
                          setShowStartPicker(Platform.OS === 'ios');
                          if (date) {
                            const offsetDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
                            setStartDate(offsetDate.toISOString().split('T')[0]);
                          }
                        }}
                      />
                    )}
                  </>
                )}
              </View>
              <View style={styles.filterCol}>
                <Text style={styles.filterLabel}>End Date</Text>
                {Platform.OS === 'web' ? (
                  <View style={styles.webDateInputContainer}>
                    <Calendar size={16} color="#64748b" style={{ marginRight: 8 }} />
                    <input
                      type="date"
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      style={styles.webDateInput as any}
                    />
                  </View>
                ) : (
                  <>
                    <Pressable style={styles.mobileDateBtn} onPress={() => setShowEndPicker(true)}>
                      <Calendar size={16} color="#64748b" />
                      <Text style={styles.mobileDateBtnText}>
                        {endDate ? formatDateDMY(endDate, false) : 'Select End Date'}
                      </Text>
                    </Pressable>
                    {showEndPicker && (
                      <DateTimePicker
                        value={endDate ? new Date(endDate) : new Date()}
                        mode="date"
                        display="default"
                        onChange={(event: any, date?: Date) => {
                          setShowEndPicker(Platform.OS === 'ios');
                          if (date) {
                            const offsetDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
                            setEndDate(offsetDate.toISOString().split('T')[0]);
                          }
                        }}
                      />
                    )}
                  </>
                )}
              </View>
              {(startDate !== '' || endDate !== '') && (
                <Pressable style={styles.clearFilterBtn} onPress={() => { setStartDate(''); setEndDate(''); }}>
                  <Text style={styles.clearFilterBtnText}>Clear</Text>
                </Pressable>
              )}
            </View>

            {activeTab === 'Cash' && (
              <View style={{ marginTop: 12, gap: 8 }}>
                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>Filter Bookings By:</Text>
                  <Pressable
                    style={{ paddingVertical: 5, paddingHorizontal: 10, borderRadius: 6, backgroundColor: filterType === 'booking' ? Colors.light.primary : '#f1f5f9' }}
                    onPress={() => setFilterType('booking')}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '600', color: filterType === 'booking' ? '#fff' : '#475569' }}>Booking Date</Text>
                  </Pressable>
                  <Pressable
                    style={{ paddingVertical: 5, paddingHorizontal: 10, borderRadius: 6, backgroundColor: filterType === 'appointment' ? Colors.light.primary : '#f1f5f9' }}
                    onPress={() => setFilterType('appointment')}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '600', color: filterType === 'appointment' ? '#fff' : '#475569' }}>Appointment Date</Text>
                  </Pressable>
                </View>

                {/* Transaction Type filter */}
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>Tx Type:</Text>
                  {(['all', 'credit', 'debit'] as const).map(t => (
                    <Pressable
                      key={t}
                      style={{ paddingVertical: 5, paddingHorizontal: 10, borderRadius: 6, backgroundColor: filterTxType === t ? '#0f172a' : '#f1f5f9' }}
                      onPress={() => setFilterTxType(t)}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '600', color: filterTxType === t ? '#fff' : '#475569', textTransform: 'capitalize' }}>{t === 'all' ? 'All' : t === 'credit' ? 'Credit (+)' : 'Debit (-)'}</Text>
                    </Pressable>
                  ))}
                </View>

                {/* Payment Mode filter */}
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>Payment Mode:</Text>
                  {(['all', 'cash', 'online', 'handover'] as const).map(m => (
                    <Pressable
                      key={m}
                      style={{ paddingVertical: 5, paddingHorizontal: 10, borderRadius: 6, backgroundColor: filterPayMode === m ? '#0f172a' : '#f1f5f9' }}
                      onPress={() => setFilterPayMode(m)}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '600', color: filterPayMode === m ? '#fff' : '#475569', textTransform: 'capitalize' }}>{m === 'all' ? 'All' : m.charAt(0).toUpperCase() + m.slice(1)}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}


          </View>
          
          {incomingHandovers.length > 0 && activeTab === 'Cash' && (
            <View style={styles.pendingSection}>
              <Text style={styles.sectionTitle}>Incoming Cash Handovers</Text>
              {incomingHandovers.map(h => (
                <View key={h.id} style={styles.pendingCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pendingAmount}>₹{h.amount}</Text>
                    <Text style={styles.pendingNote}>From: {h.from_name} ({h.from_employee_id})</Text>
                    <Text style={{fontSize: 12, color: '#475569', marginTop: 2}}>{h.from_role} • {h.from_department}</Text>
                    <Text style={styles.txDate}>{formatDateDMY(h.created_at, true)}</Text>
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

          {activeTab === 'Allowance' ? (
            <>
              <View style={[styles.balanceCard, !isDesktop && { flexDirection: 'column', alignItems: 'center' }]}>
                <View style={styles.balanceIconWrapper}>
                  <Wallet size={32} color={Colors.light.primary} />
                </View>
                <View style={[{flex: 1}, !isDesktop && { alignItems: 'center' }]}>
                  <Text style={styles.balanceLabel}>Current Allowance Balance</Text>
                  <Text style={styles.balanceAmount}>₹{balance}</Text>
                </View>
                <View style={[{flexDirection: 'row', gap: 8}, !isDesktop && { width: '100%', justifyContent: 'center' }]}>
                   <Pressable style={[styles.secondaryBtn, !isDesktop && {flex: 1, justifyContent: 'center'}]} onPress={() => setRequestModalVisible(true)}>
                     <Text style={styles.secondaryBtnText}>Request Funds</Text>
                   </Pressable>
                   <Pressable style={[styles.primaryBtn, !isDesktop && {flex: 1, justifyContent: 'center'}]} onPress={() => setUsageModalVisible(true)}>
                     <Text style={styles.primaryBtnText}>Log Usage</Text>
                   </Pressable>
                </View>
              </View>

              {pendingAllocations.length > 0 && (
                <View style={styles.pendingSection}>
                  <Text style={styles.sectionTitle}>Pending Allocations</Text>
                  {pendingAllocations.map(tx => (
                    <View key={tx.id} style={styles.pendingCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.pendingAmount}>₹{tx.amount}</Text>
                        {tx.note ? <Text style={styles.pendingNote}>Note: {tx.note}</Text> : null}
                        <Text style={styles.txDate}>{formatDateDMY(tx.created_at, true)}</Text>
                      </View>
                      <Pressable style={styles.acceptBtn} onPress={() => handleAcceptAllocation(tx.id)}>
                        <CheckCircle2 size={16} color="#FFF" />
                        <Text style={styles.acceptBtnText}>Accept</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 32, marginBottom: 16 }}>
                <Text style={{ fontSize: 20, fontWeight: '700', color: Colors.light.text }}>Transaction History</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable style={styles.actionIconButton} onPress={() => exportToCSV(allowanceTransactions, 'Allowance_History', ['Date', 'Particulars', 'Debit (Withdrawal)', 'Credit (Deposit)', 'Balance'], (tx) => [
                    formatDateDMY(tx.created_at, true),
                    `${tx.type === 'usage' ? 'Usage Logged' : tx.type === 'allocation_granted' ? 'Allocation Granted' : 'Allocation Requested'}${tx.note ? ` (${tx.note})` : ''}`,
                    tx.type === 'usage' ? `₹${tx.amount}` : '-',
                    tx.type === 'allocation_granted' ? `₹${tx.amount}` : '-',
                    tx.runningBalance
                  ])}>
                    <Text style={styles.actionIconText}>CSV</Text>
                  </Pressable>
                  <Pressable style={styles.actionIconButton} onPress={() => handlePrint('Allowance Transaction History', ['Date', 'Particulars', 'Debit (Withdrawal)', 'Credit (Deposit)', 'Balance'], allowanceTransactions, (tx) => [
                    formatDateDMY(tx.created_at, true),
                    `${tx.type === 'usage' ? 'Usage Logged' : tx.type === 'allocation_granted' ? 'Allocation Granted' : 'Allocation Requested'}${tx.note ? ` (${tx.note})` : ''}`,
                    tx.type === 'usage' ? `₹${tx.amount}` : '-',
                    tx.type === 'allocation_granted' ? `₹${tx.amount}` : '-',
                    tx.runningBalance
                  ])}>
                    <Text style={styles.actionIconText}>Print</Text>
                  </Pressable>
                </View>
              </View>
              <ScrollView horizontal={true} showsHorizontalScrollIndicator={true}>
                <View style={{ minWidth: isDesktop ? '100%' : 600, backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden', marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', backgroundColor: '#f8fafc', borderBottomWidth: 1, borderColor: '#e2e8f0', padding: 12 }}>
                    <Text style={{ flex: 1.5, fontWeight: '700', fontSize: 13, color: '#475569' }}>Date & Time</Text>
                    <Text style={{ flex: 2.5, fontWeight: '700', fontSize: 13, color: '#475569' }}>Particulars (Narration)</Text>
                    <Text style={{ flex: 1, fontWeight: '700', fontSize: 13, color: '#ef4444', textAlign: 'right' }}>Debit (-)</Text>
                    <Text style={{ flex: 1, fontWeight: '700', fontSize: 13, color: '#22c55e', textAlign: 'right' }}>Credit (+)</Text>
                    <Text style={{ flex: 1.2, fontWeight: '700', fontSize: 13, color: '#0f172a', textAlign: 'right' }}>Balance</Text>
                  </View>
                  {allowanceTransactions.length === 0 ? (
                    <Text style={{ padding: 16, textAlign: 'center', color: '#64748b', fontStyle: 'italic' }}>No transactions recorded.</Text>
                  ) : (
                    allowanceTransactions.map((tx: any) => {
                      const isPending = tx.status === 'pending';
                      return (
                        <View key={tx.id} style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: '#f1f5f9', padding: 12, alignItems: 'center' }}>
                          <Text style={{ flex: 1.5, fontSize: 13, color: '#334155' }}>{formatDateDMY(tx.created_at, true)}</Text>
                          <View style={{ flex: 2.5 }}>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: '#0f172a' }}>
                              {tx.type === 'usage' ? 'Usage Logged' : tx.type === 'allocation_granted' ? 'Allocation Granted' : 'Allocation Requested'}
                            </Text>
                            {tx.note ? <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{tx.note}</Text> : null}
                            {isPending && (
                              <View style={{ alignSelf: 'flex-start', backgroundColor: '#fef08a', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4 }}>
                                <Text style={{ fontSize: 10, fontWeight: '700', color: '#854d0e', textTransform: 'uppercase' }}>Pending</Text>
                              </View>
                            )}
                          </View>
                          <Text style={{ flex: 1, fontSize: 13, color: '#ef4444', textAlign: 'right', fontWeight: '500' }}>
                            {tx.type === 'usage' ? `₹${tx.amount}` : '-'}
                          </Text>
                          <Text style={{ flex: 1, fontSize: 13, color: '#22c55e', textAlign: 'right', fontWeight: '500' }}>
                            {tx.type === 'allocation_granted' ? `₹${tx.amount}` : '-'}
                          </Text>
                          <Text style={{ flex: 1.2, fontSize: 13, color: '#0f172a', textAlign: 'right', fontWeight: '700' }}>
                            {tx.runningBalance}
                          </Text>
                        </View>
                      );
                    })
                  )}
                </View>
              </ScrollView>
            </>
          ) : (
            <>
              <View style={[styles.balanceCard, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }, !isDesktop && { flexDirection: 'column', alignItems: 'center' }]}>
                <View style={[styles.balanceIconWrapper, { backgroundColor: '#dcfce7' }]}>
                  <Banknote size={32} color="#16a34a" />
                </View>
                <View style={[{flex: 1}, !isDesktop && { alignItems: 'center' }]}>
                  <Text style={styles.balanceLabel}>Present Cash in Hand</Text>
                  <Text style={[styles.balanceAmount, {color: '#166534'}]}>₹{parseFloat(cashInHand || '0').toFixed(2)}</Text>
                </View>
                <Pressable style={[styles.primaryBtn, {backgroundColor: '#16a34a'}, !isDesktop && { width: '100%', justifyContent: 'center' }]} onPress={() => {setAmount(cashInHand); setHandoverModalVisible(true)}}>
                  <HandCoins size={18} color="#FFF" />
                  <Text style={styles.primaryBtnText}>Handover Cash</Text>
                </Pressable>
              </View>

              {/* Filter-based Cash / Online / Handover summary */}
              <View style={[{ flexDirection: 'row', gap: 12, marginTop: 12, flexWrap: 'wrap' }, !isDesktop && { flexDirection: 'column' }]}>
                <View style={[styles.statsBox, { flex: 1, borderLeftWidth: 3, borderLeftColor: '#16a34a' }]}>
                  <Text style={styles.statsLabel}>Cash Collected {startDate || endDate ? '(Filtered)' : '(All Time)'}</Text>
                  <Text style={[styles.statsValue, { color: '#16a34a' }]}>₹{ledgerCashCollected.toFixed(2)}</Text>
                </View>
                <View style={[styles.statsBox, { flex: 1, borderLeftWidth: 3, borderLeftColor: Colors.light.primary }]}>
                  <Text style={styles.statsLabel}>Online Collected {startDate || endDate ? '(Filtered)' : '(All Time)'}</Text>
                  <Text style={[styles.statsValue, { color: Colors.light.primary }]}>₹{ledgerOnlineCollected.toFixed(2)}</Text>
                </View>
                <View style={[styles.statsBox, { flex: 1, borderLeftWidth: 3, borderLeftColor: '#f59e0b' }]}>
                  <Text style={styles.statsLabel}>Handover Out / In</Text>
                  <Text style={[styles.statsValue, { color: '#b45309', fontSize: 14 }]}>-₹{ledgerHandoverOut.toFixed(2)} / +₹{ledgerHandoverIn.toFixed(2)}</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 32, marginBottom: 16 }}>
                <Text style={{ fontSize: 20, fontWeight: '700', color: Colors.light.text }}>Cash Account Ledger</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable style={styles.actionIconButton} onPress={() => {
                    const printRows = [];
                    printRows.push({
                      dateStr: '',
                      particulars: 'Opening Balance',
                      debit: '-',
                      credit: '-',
                      runningBalance: `₹${cashOpeningBalance.toFixed(2)}`
                    });
                    cashLedger.forEach(item => {
                      printRows.push(item);
                    });
                    printRows.push({
                      dateStr: '',
                      particulars: 'Closing Balance',
                      debit: '-',
                      credit: '-',
                      runningBalance: `₹${(cashLedger.length > 0 ? cashLedger[cashLedger.length - 1].runningBalanceVal : cashOpeningBalance).toFixed(2)}`
                    });
                    exportToCSV(printRows, 'Cash_Ledger', ['Date', 'Particulars', 'Debit (Withdrawal)', 'Credit (Deposit)', 'Balance'], (item) => [
                      item.dateStr ? formatDateDMY(item.dateStr, true) : '-',
                      `${item.particulars}${item.note ? ` (${item.note})` : ''}`,
                      item.debit,
                      item.credit,
                      item.runningBalance
                    ]);
                  }}>
                    <Text style={styles.actionIconText}>CSV</Text>
                  </Pressable>
                  <Pressable style={styles.actionIconButton} onPress={() => {
                    const printRows = [];
                    printRows.push({
                      dateStr: '',
                      particulars: 'Opening Balance',
                      debit: '-',
                      credit: '-',
                      runningBalance: `₹${cashOpeningBalance.toFixed(2)}`
                    });
                    cashLedger.forEach(item => {
                      printRows.push(item);
                    });
                    printRows.push({
                      dateStr: '',
                      particulars: 'Closing Balance',
                      debit: '-',
                      credit: '-',
                      runningBalance: `₹${(cashLedger.length > 0 ? cashLedger[cashLedger.length - 1].runningBalanceVal : cashOpeningBalance).toFixed(2)}`
                    });
                    handlePrint('Cash Ledger', ['Date', 'Particulars', 'Debit (Withdrawal)', 'Credit (Deposit)', 'Balance'], printRows, (item) => [
                      item.dateStr ? formatDateDMY(item.dateStr, true) : '-',
                      `${item.particulars}${item.note ? ` (${item.note})` : ''}`,
                      item.debit,
                      item.credit,
                      item.runningBalance
                    ]);
                  }}>
                    <Text style={styles.actionIconText}>Print</Text>
                  </Pressable>
                </View>
              </View>

              <ScrollView horizontal={true} showsHorizontalScrollIndicator={true}>
                <View style={{ minWidth: isDesktop ? '100%' : 700, backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden', marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', backgroundColor: '#f8fafc', borderBottomWidth: 1, borderColor: '#e2e8f0', padding: 12 }}>
                    <Text style={{ flex: 1.5, fontWeight: '700', fontSize: 13, color: '#475569' }}>Date & Time</Text>
                    <Text style={{ flex: 2.5, fontWeight: '700', fontSize: 13, color: '#475569' }}>Particulars (Narration)</Text>
                    <Text style={{ flex: 1.2, fontWeight: '700', fontSize: 13, color: '#475569' }}>Staff/Details</Text>
                    <Text style={{ flex: 1, fontWeight: '700', fontSize: 13, color: '#ef4444', textAlign: 'right' }}>Debit (-)</Text>
                    <Text style={{ flex: 1, fontWeight: '700', fontSize: 13, color: '#22c55e', textAlign: 'right' }}>Credit (+)</Text>
                    <Text style={{ flex: 1.2, fontWeight: '700', fontSize: 13, color: '#0f172a', textAlign: 'right' }}>Balance</Text>
                  </View>

                  {/* Closing Balance Row (Shown first on screen: latest at top) */}
                  <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: '#e2e8f0', padding: 12, backgroundColor: '#f8fafc', alignItems: 'center' }}>
                    <Text style={{ flex: 1.5, fontSize: 13, color: '#64748b' }}>-</Text>
                    <Text style={{ flex: 2.5, fontSize: 13, fontWeight: '700', color: '#0f172a' }}>Closing Balance</Text>
                    <Text style={{ flex: 1.2, fontSize: 13, color: '#64748b' }}>-</Text>
                    <Text style={{ flex: 1, fontSize: 13, color: '#64748b', textAlign: 'right' }}>-</Text>
                    <Text style={{ flex: 1, fontSize: 13, color: '#64748b', textAlign: 'right' }}>-</Text>
                    <Text style={{ flex: 1.2, fontSize: 13, color: '#16a34a', textAlign: 'right', fontWeight: '800' }}>
                      ₹{(cashLedger.length > 0 ? cashLedger[cashLedger.length - 1].runningBalanceVal : cashOpeningBalance).toFixed(2)}
                    </Text>
                  </View>

                  {visibleLedger.length === 0 ? (
                    <View style={{ padding: 24, alignItems: 'center' }}>
                      <Text style={{ color: '#64748b', fontStyle: 'italic' }}>No matching transactions in this range.</Text>
                    </View>
                  ) : (
                    [...visibleLedger].reverse().map((item: any) => {
                      const isPending = item.status !== 'Accepted';
                      return (
                        <View key={item.id} style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: '#f1f5f9', padding: 12, alignItems: 'center' }}>
                          <Text style={{ flex: 1.5, fontSize: 13, color: '#334155' }}>{formatDateDMY(item.dateStr, true)}</Text>
                          <View style={{ flex: 2.5 }}>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: '#0f172a' }}>{item.particulars}</Text>
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
                          <Text style={{ flex: 1.2, fontSize: 12, color: '#64748b' }}>{item.roleDept}</Text>
                          <Text style={{ flex: 1, fontSize: 13, color: '#ef4444', textAlign: 'right', fontWeight: '500' }}>{item.debit}</Text>
                          <Text style={{ flex: 1, fontSize: 13, color: '#22c55e', textAlign: 'right', fontWeight: '500' }}>{item.credit}</Text>
                          <Text style={{ flex: 1.2, fontSize: 13, color: '#0f172a', textAlign: 'right', fontWeight: '700' }}>
                            {item.runningBalance}
                          </Text>
                        </View>
                      );
                    })
                  )}

                  {/* Opening Balance Row (Shown last on screen: oldest at bottom) */}
                  <View style={{ flexDirection: 'row', borderTopWidth: 1, borderColor: '#cbd5e1', padding: 12, backgroundColor: '#fafafa', alignItems: 'center' }}>
                    <Text style={{ flex: 1.5, fontSize: 13, color: '#64748b' }}>-</Text>
                    <Text style={{ flex: 2.5, fontSize: 13, fontWeight: '700', color: '#475569' }}>Opening Balance</Text>
                    <Text style={{ flex: 1.2, fontSize: 13, color: '#64748b' }}>-</Text>
                    <Text style={{ flex: 1, fontSize: 13, color: '#64748b', textAlign: 'right' }}>-</Text>
                    <Text style={{ flex: 1, fontSize: 13, color: '#64748b', textAlign: 'right' }}>-</Text>
                    <Text style={{ flex: 1.2, fontSize: 13, color: '#0f172a', textAlign: 'right', fontWeight: '700' }}>₹{cashOpeningBalance.toFixed(2)}</Text>
                  </View>
                </View>
              </ScrollView>
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* Handover Modal */}
      <Modal visible={handoverModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, !isDesktop && styles.modalContentMobile]}>
            <Text style={styles.modalTitle}>Handover Cash</Text>
            
            <Text style={styles.inputLabel}>Select Peer</Text>
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
                  {peers.length === 0 && <Text style={{padding: 12, color: '#64748b'}}>No peers found in your department.</Text>}
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

            <Text style={styles.inputLabel}>Note (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Booking Collections handover"
              value={note}
              onChangeText={setNote}
            />

            <View style={styles.modalButtons}>
              <Pressable style={styles.modalCancelBtn} onPress={() => {setHandoverModalVisible(false); setSelectedPeerId(''); setNote(''); setAmount('');}}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.modalSubmitBtn, submitting && styles.btnDisabled]} onPress={handleRequestHandover} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.modalSubmitText}>Submit Request</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Usage Modal */}
      <Modal visible={usageModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, !isDesktop && styles.modalContentMobile]}>
            <Text style={styles.modalTitle}>Log Allowance Usage</Text>
            <Text style={styles.inputLabel}>Amount Used</Text>
            <TextInput style={styles.input} placeholder="e.g. 150" keyboardType="numeric" value={amount} onChangeText={setAmount} />
            <Text style={styles.inputLabel}>Note / Reason</Text>
            <TextInput style={[styles.input, { height: 80 }]} placeholder="e.g. Bought pens for reception" multiline value={note} onChangeText={setNote} />
            <View style={styles.modalButtons}>
              <Pressable style={styles.modalCancelBtn} onPress={() => setUsageModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.modalSubmitBtn, submitting && styles.btnDisabled]} onPress={handleLogUsage} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.modalSubmitText}>Submit</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Request Modal */}
      <Modal visible={requestModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, !isDesktop && styles.modalContentMobile]}>
            <Text style={styles.modalTitle}>Request Funds</Text>
            <Text style={styles.inputLabel}>Amount</Text>
            <TextInput style={styles.input} placeholder="e.g. 500" keyboardType="numeric" value={amount} onChangeText={setAmount} />
            <Text style={styles.inputLabel}>Reason for Request</Text>
            <TextInput style={[styles.input, { height: 80 }]} placeholder="e.g. Need to buy printer ink" multiline value={note} onChangeText={setNote} />
            <View style={styles.modalButtons}>
              <Pressable style={styles.modalCancelBtn} onPress={() => setRequestModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.modalSubmitBtn, submitting && styles.btnDisabled]} onPress={handleRequestAllocation} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.modalSubmitText}>Submit Request</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 32, backgroundColor: '#F8FAFC' },
  containerMobile: { padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  headerMobile: { flexDirection: 'column', alignItems: 'flex-start', gap: 16 },
  title: { fontSize: 28, fontWeight: '800', color: Colors.light.text, marginBottom: 4 },
  subtitle: { fontSize: 15, color: '#64748B' },
  headerButtons: { flexDirection: 'row', gap: 12 },
  tabBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: '#e2e8f0' },
  tabBtnActive: { backgroundColor: Colors.light.primary },
  tabBtnText: { color: Colors.light.primary, fontWeight: '600' },
  tabBtnTextActive: { color: '#FFF' },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.light.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  primaryBtnText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#e0f2fe', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  secondaryBtnText: { color: Colors.light.primary, fontWeight: '600', fontSize: 14 },
  balanceCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 24, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: '#e2e8f0', gap: 16 },
  balanceIconWrapper: { width: 64, height: 64, borderRadius: 16, backgroundColor: '#f0f9ff', justifyContent: 'center', alignItems: 'center' },
  balanceLabel: { fontSize: 14, color: '#64748B', fontWeight: '500', marginBottom: 4 },
  balanceAmount: { fontSize: 36, fontWeight: '800', color: Colors.light.text },
  statsBox: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  statsLabel: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  statsValue: { fontSize: 24, fontWeight: '700', marginTop: 4 },
  pendingSection: { marginTop: 24, padding: 16, backgroundColor: '#fef3c7', borderRadius: 12, borderWidth: 1, borderColor: '#fde68a' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#92400e', marginBottom: 12 },
  pendingCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', padding: 16, borderRadius: 8, marginBottom: 8 },
  pendingAmount: { fontSize: 18, fontWeight: '700', color: Colors.light.text },
  pendingNote: { fontSize: 14, color: '#64748B', marginTop: 4 },
  acceptBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#10b981', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  acceptBtnText: { color: '#FFF', fontWeight: '600', fontSize: 13 },
  txCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  txIconWrapper: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  txDetails: { flex: 1 },
  txType: { fontSize: 15, fontWeight: '600', color: Colors.light.text, marginBottom: 4 },
  txDate: { fontSize: 13, color: '#94a3b8' },
  txNote: { fontSize: 14, color: '#64748B', marginTop: 4, fontStyle: 'italic' },
  txAmountSection: { alignItems: 'flex-end' },
  txAmount: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  txStatus: { fontSize: 11, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, overflow: 'hidden' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 16, padding: 24, width: 400, maxWidth: '100%' },
  modalContentMobile: { width: '100%' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.light.text, marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8, marginTop: 16 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 12, fontSize: 15, backgroundColor: '#f8fafc' },
  peerList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  peerItem: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc' },
  peerItemActive: { borderColor: Colors.light.primary, backgroundColor: '#e0f2fe' },
  peerName: { fontSize: 14, fontWeight: '600', color: Colors.light.text },
  peerNameActive: { color: Colors.light.primary },
  peerRole: { fontSize: 11, color: '#64748b' },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 24 },
  modalCancelBtn: { flex: 1, padding: 14, borderRadius: 8, backgroundColor: '#f1f5f9', alignItems: 'center' },
  modalCancelText: { color: '#475569', fontWeight: '600' },
  modalSubmitBtn: { flex: 1, padding: 14, borderRadius: 8, backgroundColor: Colors.light.primary, alignItems: 'center' },
  modalSubmitText: { color: '#FFF', fontWeight: '600' },
  btnDisabled: { opacity: 0.7 },
  filterCard: { backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', padding: 20, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 16, flexWrap: 'wrap' },
  filterCol: { flex: 1, minWidth: 200, maxWidth: Platform.OS === 'web' ? 240 : undefined },
  filterLabel: { fontSize: 12, fontWeight: '600', color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  webDateInputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, backgroundColor: '#F8FAFC', paddingHorizontal: 12, paddingVertical: 10, width: '100%' },
  webCalendarIcon: { marginRight: 8 },
  webDateInput: { borderWidth: 0, backgroundColor: 'transparent', fontSize: 14, color: '#334155', width: '100%', outlineWidth: 0, padding: 0 },
  mobileDateBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#F8FAFC' },
  mobileDateBtnText: { fontSize: 14, color: '#334155' },
  clearFilterBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#fee2e2', borderWidth: 1, borderColor: '#fca5a5', justifyContent: 'center', alignItems: 'center', alignSelf: 'flex-end', height: 42 },
  clearFilterBtnText: { fontSize: 14, fontWeight: '600', color: '#ef4444' },
  actionIconButton: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE' },
  actionIconText: { fontSize: 12, fontWeight: '600', color: '#1E40AF' }
});
