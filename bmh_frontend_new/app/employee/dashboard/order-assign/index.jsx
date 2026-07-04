import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Platform, Modal, ScrollView, TextInput, useWindowDimensions } from 'react-native';
import axios from 'axios';
import { Picker } from '@react-native-picker/picker';
import { Package, MapPin, Bus, User, Map, CheckCircle, Search, Filter, Calendar, List } from 'lucide-react-native';

export default function OrderAssignScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width > 1024;
  const isTablet = width > 768 && width <= 1024;

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [orders, setOrders] = useState([]);
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Assignment Modal State
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [deliveryType, setDeliveryType] = useState('Local');
  const [selectedBoyId, setSelectedBoyId] = useState('');
  
  // Local Pickup fields
  const [address, setAddress] = useState('');
  const [gpsLocation, setGpsLocation] = useState('');
  
  // Bus Pickup fields
  const [busDetails, setBusDetails] = useState({
    bus_number: '',
    arrival_time: '',
    driver_name: '',
    driver_number: '',
    waybill_number: '',
    drop_location: ''
  });

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All'); // All, online_order, sales_order, purchase_order
  const [assignmentFilter, setAssignmentFilter] = useState('All'); // All, Unassigned, Assigned, Completed
  
  // Date Filter
  const [selectedDate, setSelectedDate] = useState('');

  const fetchData = async () => {
    try {
      let url = 'https://napi.bharatmedicalhallplus.com/admin/all-orders-for-assignment';
      if (selectedDate) {
        url += `?fromDate=${selectedDate}&toDate=${selectedDate}`;
      }
      const [ordRes, empRes] = await Promise.all([
        axios.get(url),
        axios.get('https://napi.bharatmedicalhallplus.com/employees/delivery-fleet')
      ]);
      if (ordRes.data && ordRes.data.success) {
        setOrders(ordRes.data.data);
      }
      if (empRes.data && empRes.data.success) {
        setDeliveryBoys(empRes.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleAssign = async () => {
    if (deliveryType !== 'Store' && !selectedBoyId) {
      alert("Please select a delivery boy");
      return;
    }
    
    try {
      const payload = {
        delivery_type: deliveryType,
        delivery_boy_id: deliveryType === 'Store' ? null : selectedBoyId,
        address: deliveryType === 'Local' ? address : null,
        gps_location: deliveryType === 'Local' ? gpsLocation : null,
        bus_details: deliveryType === 'Bus' ? busDetails : null
      };

      let url = '';
      if (selectedOrder.type === 'online_order') {
        url = `https://napi.bharatmedicalhallplus.com/online-orders/${selectedOrder.id}/assign-delivery`;
      } else if (selectedOrder.type === 'sales_order') {
        url = `https://napi.bharatmedicalhallplus.com/sales-order/${selectedOrder.id}/assign-delivery`;
      } else if (selectedOrder.type === 'sales_invoice') {
        url = `https://napi.bharatmedicalhallplus.com/sales-invoice-list/${selectedOrder.id}/assign-delivery`;
      } else if (selectedOrder.type === 'purchase_order') {
        url = `https://napi.bharatmedicalhallplus.com/ecogreen-purchase-orders/assign/${selectedOrder.id}`;
      }

      const res = await axios.put(url, payload); // Wait, PO assignment is POST, others might be PUT. Let's fix that.
      
      alert('Delivery Assigned Successfully!');
      setSelectedOrder(null);
      fetchData();
    } catch (err) {
      alert("Error assigning delivery: " + err.message);
    }
  };

  const executeAssignReq = async (url, payload, method) => {
    if(method === 'POST') {
       return await axios.post(url, payload);
    }
    return await axios.put(url, payload);
  }

  const handleAssignV2 = async () => {
    if (deliveryType !== 'Store' && !selectedBoyId) {
      alert("Please select a delivery boy");
      return;
    }
    
    try {
      const payload = {
        delivery_type: deliveryType,
        delivery_boy_id: deliveryType === 'Store' ? null : selectedBoyId,
        address: deliveryType === 'Local' ? address : null,
        gps_location: deliveryType === 'Local' ? gpsLocation : null,
        bus_details: deliveryType === 'Bus' ? busDetails : null
      };

      let url = '';
      let method = 'PUT';
      if (selectedOrder.type === 'online_order') {
        url = `https://napi.bharatmedicalhallplus.com/online-orders/${selectedOrder.id}/assign-delivery`;
      } else if (selectedOrder.type === 'sales_order') {
        url = `https://napi.bharatmedicalhallplus.com/sales-order/${selectedOrder.id}/assign-delivery`;
      } else if (selectedOrder.type === 'sales_invoice') {
        url = `https://napi.bharatmedicalhallplus.com/sales-invoice-list/${selectedOrder.id}/assign-delivery`;
      } else if (selectedOrder.type === 'purchase_order') {
        url = `https://napi.bharatmedicalhallplus.com/ecogreen-purchase-orders/assign/${selectedOrder.id}`;
        method = 'POST';
      }

      await executeAssignReq(url, payload, method);
      
      alert('Delivery Assigned Successfully!');
      setSelectedOrder(null);
      fetchData();
    } catch (err) {
      alert("Error assigning delivery: " + err.message);
    }
  };


  const openAssignModal = (order) => {
    setSelectedOrder(order);
    setAddress(order.address || '');
    setGpsLocation(order.map_lat && order.map_lng ? `${order.map_lat},${order.map_lng}` : '');
    setDeliveryType(order.delivery_type || 'Local');
    setSelectedBoyId(order.delivery_boy_id || '');
    if (order.bus_details) {
      try {
        setBusDetails(typeof order.bus_details === 'string' ? JSON.parse(order.bus_details) : order.bus_details);
      } catch (e) {
        // ignore
      }
    }
  };

  const filteredOrders = orders.filter(o => {
    if (filterType !== 'All' && o.type !== filterType) return false;
    
    if (assignmentFilter === 'Unassigned') {
       if (o.delivery_boy_id || o.status === 'DELIVERED') return false;
    } else if (assignmentFilter === 'Assigned') {
       if (!o.delivery_boy_id || o.status === 'DELIVERED') return false;
    } else if (assignmentFilter === 'Completed') {
       if (o.status !== 'DELIVERED') return false;
    }

    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      return (
        (o.id && o.id.toString().includes(searchLower)) ||
        (o.patient_name && o.patient_name.toLowerCase().includes(searchLower)) ||
        (o.mobile_no && o.mobile_no.includes(searchLower))
      );
    }
    return true;
  });

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  const getTypeColor = (type) => {
    switch (type) {
      case 'online_order': return '#f59e0b';
      case 'sales_order': return '#3b82f6';
      case 'sales_invoice': return '#10b981';
      case 'purchase_order': return '#8b5cf6';
      default: return '#64748b';
    }
  };
  const getTypeLabel = (type) => {
    switch (type) {
      case 'online_order': return 'Online Order';
      case 'sales_order': return 'Sales Order';
      case 'sales_invoice': return 'Sales Invoice';
      case 'purchase_order': return 'Purchase Order';
      default: return type;
    }
  };

  if (!mounted) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Dispatch Center</Text>
        <Text style={styles.subtitle}>Assign and track deliveries across all channels</Text>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <View style={styles.searchBox}>
          <Search size={20} color="#94a3b8" />
          <TextInput 
            style={styles.searchInput}
            placeholder="Search by ID, Name, or Mobile..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 12, marginBottom: 12 }}>
          {/* Channel Filter Dropdown */}
          <View style={styles.dropdownWrapper}>
            <Picker
              selectedValue={filterType}
              onValueChange={(itemValue) => setFilterType(itemValue)}
              style={styles.picker}
            >
              <Picker.Item label="All Channels" value="All" />
              <Picker.Item label="Online Orders" value="online_order" />
              <Picker.Item label="Sales Orders" value="sales_order" />
              <Picker.Item label="Purchase Orders" value="purchase_order" />
            </Picker>
          </View>

          {/* Status Filter Dropdown */}
          <View style={styles.dropdownWrapper}>
            <Picker
              selectedValue={assignmentFilter}
              onValueChange={(itemValue) => setAssignmentFilter(itemValue)}
              style={styles.picker}
            >
              <Picker.Item label="All Statuses" value="All" />
              <Picker.Item label="Unassigned" value="Unassigned" />
              <Picker.Item label="Assigned" value="Assigned" />
              <Picker.Item label="Completed" value="Completed" />
            </Picker>
          </View>
        </View>
        
        <View style={styles.dateFilterContainer}>
          <Calendar size={18} color="#64748b" style={{marginRight: 8}} />
          <TextInput
            style={styles.dateInput}
            placeholder="Date: YYYY-MM-DD"
            value={selectedDate}
            onChangeText={setSelectedDate}
          />
          <TouchableOpacity style={styles.applyDateBtn} onPress={fetchData}>
            <Text style={styles.applyDateText}>Apply</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Orders List */}
      <FlatList 
        data={filteredOrders}
        keyExtractor={item => `${item.type}-${item.id}`}
        contentContainerStyle={styles.listContainer}
        numColumns={isDesktop ? 3 : isTablet ? 2 : 1}
        key={isDesktop ? 3 : isTablet ? 2 : 1} // Force re-render on grid change
        renderItem={({ item }) => (
          <View style={[styles.orderCard, isDesktop || isTablet ? { flex: 1, margin: 8 } : { marginBottom: 16 }]}>
            <View style={[styles.cardHeader, { borderBottomColor: getTypeColor(item.type) }]}>
              <View style={styles.typeBadgeContainer}>
                <View style={[styles.typeBadgeDot, { backgroundColor: getTypeColor(item.type) }]} />
                <Text style={[styles.typeBadgeText, { color: getTypeColor(item.type) }]}>{getTypeLabel(item.type)}</Text>
              </View>
              <Text style={styles.orderId}>#{item.id}</Text>
            </View>

            <View style={styles.cardBody}>
              <Text style={styles.patientName}>{item.patient_name || 'N/A'}</Text>
              <Text style={styles.patientMobile}>{item.mobile_no || 'N/A'}</Text>

              <View style={styles.detailsRow}>
                <MapPin size={16} color="#64748b" style={{ marginTop: 2 }} />
                <Text style={styles.addressText}>{item.address || 'No Address Provided'}</Text>
              </View>

              <View style={styles.statusRow}>
                 <Text style={styles.statusLabel}>Status: <Text style={styles.statusValue}>{item.status || 'PENDING'}</Text></Text>
                 <Text style={styles.amountText}>₹{item.total_amount || '0'}</Text>
              </View>
              
              {item.delivery_boy_id && (
                 <View style={styles.assignedBadge}>
                   <CheckCircle size={14} color="#10b981" style={{ marginRight: 4 }}/>
                   <Text style={styles.assignedBadgeText}>Assigned ({item.delivery_type})</Text>
                 </View>
              )}
            </View>

            <TouchableOpacity 
              style={[styles.assignBtn, item.delivery_boy_id && styles.assignBtnSuccess]} 
              onPress={() => openAssignModal(item)}
            >
              <Bus size={18} color="#fff" />
              <Text style={styles.assignBtnText}>
                {item.delivery_boy_id ? 'Reassign Delivery' : 'Assign Delivery'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
             <Package size={48} color="#cbd5e1" />
             <Text style={styles.emptyText}>No orders found matching your criteria</Text>
          </View>
        }
      />

      {/* Assignment Modal */}
      {selectedOrder && (
        <Modal transparent animationType="slide" visible={!!selectedOrder} onRequestClose={() => setSelectedOrder(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Assign Delivery (Order #{selectedOrder.id})</Text>
              
              <ScrollView style={styles.modalScroll}>
                <Text style={styles.label}>Delivery Type</Text>
                <View style={styles.typeSelectorRow}>
                  {['Local', 'Bus', 'Store'].map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[styles.typeOption, deliveryType === type && styles.typeOptionActive]}
                      onPress={() => setDeliveryType(type)}
                    >
                      {type === 'Local' && <MapPin size={18} color={deliveryType === type ? '#0ea5e9' : '#64748b'} />}
                      {type === 'Bus' && <Bus size={18} color={deliveryType === type ? '#0ea5e9' : '#64748b'} />}
                      {type === 'Store' && <Package size={18} color={deliveryType === type ? '#0ea5e9' : '#64748b'} />}
                      <Text style={[styles.typeOptionText, deliveryType === type && styles.typeOptionTextActive]}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {deliveryType !== 'Store' && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Select Delivery Boy</Text>
                    <View style={styles.dropdownWrapper}>
                      <Picker
                        selectedValue={selectedBoyId}
                        onValueChange={(itemValue) => setSelectedBoyId(itemValue)}
                        style={styles.picker}
                      >
                        <Picker.Item label="Select a delivery boy..." value="" />
                        {deliveryBoys.map(boy => (
                          <Picker.Item key={boy.id} label={boy.full_name || boy.name} value={boy.id} />
                        ))}
                      </Picker>
                    </View>
                  </View>
                )}

                {deliveryType === 'Local' && (
                  <>
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Delivery Address</Text>
                      <TextInput 
                        style={styles.textInput}
                        value={address}
                        onChangeText={setAddress}
                        placeholder="Enter full address"
                        multiline
                      />
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Map Coordinates (Lat,Lng)</Text>
                      <TextInput 
                        style={styles.textInput}
                        value={gpsLocation}
                        onChangeText={setGpsLocation}
                        placeholder="e.g. 17.3850,78.4867"
                      />
                    </View>
                  </>
                )}

                {deliveryType === 'Bus' && (
                  <View style={styles.busDetailsGrid}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Bus Number</Text>
                      <TextInput style={styles.textInput} value={busDetails.bus_number} onChangeText={(v) => setBusDetails({...busDetails, bus_number: v})} placeholder="AP 39 X 1234"/>
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Driver Name</Text>
                      <TextInput style={styles.textInput} value={busDetails.driver_name} onChangeText={(v) => setBusDetails({...busDetails, driver_name: v})} placeholder="John Doe"/>
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Driver Number</Text>
                      <TextInput style={styles.textInput} value={busDetails.driver_number} onChangeText={(v) => setBusDetails({...busDetails, driver_number: v})} placeholder="9876543210"/>
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Waybill/LR No.</Text>
                      <TextInput style={styles.textInput} value={busDetails.waybill_number} onChangeText={(v) => setBusDetails({...busDetails, waybill_number: v})} placeholder="LR12345"/>
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Arrival/Departure Time</Text>
                      <TextInput style={styles.textInput} value={busDetails.arrival_time} onChangeText={(v) => setBusDetails({...busDetails, arrival_time: v})} placeholder="10:00 AM"/>
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Drop Location</Text>
                      <TextInput style={styles.textInput} value={busDetails.drop_location} onChangeText={(v) => setBusDetails({...busDetails, drop_location: v})} placeholder="City Center Bus Stand"/>
                    </View>
                  </View>
                )}

              </ScrollView>
              
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setSelectedOrder(null)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleAssignV2}>
                  <Text style={styles.saveBtnText}>Confirm Assignment</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
  },
  header: {
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  filtersContainer: {
    marginBottom: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: '#1e293b',
    outlineStyle: 'none'
  },
  typeFilters: {
    flexDirection: 'row',
  },
  typeFilterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    marginRight: 8,
  },
  dropdownWrapper: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#fff',
    height: 40,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  picker: {
    height: 40,
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 8,
    color: '#1e293b',
    ...Platform.select({ web: { outlineStyle: 'none' } })
  },
  typeFilterBtnActive: {
    borderColor: '#0f172a',
    backgroundColor: '#0f172a',
  },
  typeFilterText: {
    color: '#64748b',
    fontWeight: '600',
    fontSize: 13,
  },
  typeFilterTextActive: {
    color: '#fff',
  },
  dateFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
  },
  dateInput: {
    flex: 1,
    fontSize: 14,
    color: '#1e293b'
  },
  applyDateBtn: {
    backgroundColor: '#0ea5e9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 12,
  },
  applyDateText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  listContainer: {
    paddingBottom: 40,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    marginBottom: 12,
  },
  typeBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  orderId: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  cardBody: {
    marginBottom: 16,
  },
  patientName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  patientMobile: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
    marginBottom: 8,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  addressText: {
    fontSize: 13,
    color: '#475569',
    marginLeft: 6,
    flex: 1,
    lineHeight: 18,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 8,
  },
  statusLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  statusValue: {
    fontWeight: '700',
    color: '#1e293b',
  },
  amountText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  assignedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  assignedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
  },
  assignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0ea5e9',
    paddingVertical: 12,
    borderRadius: 10,
  },
  assignBtnSuccess: {
    backgroundColor: '#3b82f6',
  },
  assignBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#94a3b8',
    fontWeight: '500',
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    width: '100%',
    maxWidth: 600,
    maxHeight: '90%',
    borderRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 20,
  },
  modalScroll: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
    marginTop: 16,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  typeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginHorizontal: 4,
    borderRadius: 12,
  },
  typeOptionActive: {
    backgroundColor: '#f0f9ff',
    borderColor: '#0ea5e9',
  },
  typeOptionText: {
    marginLeft: 8,
    fontWeight: '600',
    color: '#64748b',
  },
  typeOptionTextActive: {
    color: '#0ea5e9',
  },
  inputGroup: {
    marginBottom: 16,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#1e293b',
    backgroundColor: '#f8fafc',
    minHeight: 48,
  },
  busDetailsGrid: {
    gap: 12,
  },
  boyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  boyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    width: '48%',
  },
  boyCardActive: {
    borderColor: '#0ea5e9',
    backgroundColor: '#f0f9ff',
  },
  boyName: {
    marginLeft: 8,
    fontWeight: '500',
    color: '#475569',
    fontSize: 13,
  },
  boyNameActive: {
    color: '#0ea5e9',
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 16,
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginRight: 12,
  },
  cancelBtnText: {
    color: '#64748b',
    fontWeight: '600',
    fontSize: 15,
  },
  saveBtn: {
    backgroundColor: '#0ea5e9',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
});
