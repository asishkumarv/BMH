const fs = require('fs');
const filePath = 'c:/Users/Lohitha Asish/Desktop/BMH/bmh_frontend_new/app/employee/dashboard/patient-booking.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const uiBlock = `
      ) : activeTab === 'Bookings' ? (
        <View style={styles.card}>
          <View style={[styles.headerRow, isMobile && { flexDirection: 'column', alignItems: 'flex-start', gap: 16 }]}>
            <Text style={{fontSize: 20, fontWeight: 'bold', color: '#1e293b'}}>All Bookings</Text>
            <TouchableOpacity style={styles.clearBtn} onPress={() => { setBDateFilter(''); setBDoctorFilter(''); setBPatientFilter(''); setBEmployeeFilter(''); setBStatusFilter(''); }}>
              <Text style={styles.clearBtnText}>Clear Filters</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.filterRow, isMobile && { flexDirection: 'column' }, {flexWrap: 'wrap'}]}>
            <View style={[styles.filterCol, {minWidth: 150}]}>
              <Text style={styles.label}>Patient Name/Mobile</Text>
              <TextInput style={styles.input} value={bPatientFilter} onChangeText={setBPatientFilter} placeholder="Search patient" />
            </View>
            <View style={[styles.filterCol, {minWidth: 150}]}>
              <Text style={styles.label}>Date Filter</Text>
              {Platform.OS === 'web' ? (
                <input type="date" value={bDateFilter} onChange={(e) => setBDateFilter(e.target.value)} style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 10, fontSize: 14, color: '#1e293b', width: '100%' } as any} />
              ) : (
                <TouchableOpacity onPress={() => setShowBDatePicker(true)}><TextInput style={styles.input} value={bDateFilter} editable={false} placeholder="Select Date" /></TouchableOpacity>
              )}
            </View>
            <View style={[styles.filterCol, {minWidth: 150}]}>
              <Text style={styles.label}>Doctor Filter</Text>
              <View style={styles.pickerContainer}>
                <Picker selectedValue={bDoctorFilter} onValueChange={setBDoctorFilter} style={styles.picker}>
                  <Picker.Item label="All Doctors" value="" />
                  {uniqueDoctors.map((d: any) => (<Picker.Item key={d.id} label={d.name} value={d.id} />))}
                </Picker>
              </View>
            </View>
            <View style={[styles.filterCol, {minWidth: 150}]}>
              <Text style={styles.label}>Employee Filter</Text>
              <View style={styles.pickerContainer}>
                <Picker selectedValue={bEmployeeFilter} onValueChange={setBEmployeeFilter} style={styles.picker}>
                  <Picker.Item label="All Employees" value="" />
                  {allEmployees.map((e: any) => (<Picker.Item key={e.id} label={e.full_name} value={e.id} />))}
                </Picker>
              </View>
            </View>
            <View style={[styles.filterCol, {minWidth: 150}]}>
              <Text style={styles.label}>Status Filter</Text>
              <View style={styles.pickerContainer}>
                <Picker selectedValue={bStatusFilter} onValueChange={setBStatusFilter} style={styles.picker}>
                  <Picker.Item label="All Status" value="" />
                  <Picker.Item label="Confirmed" value="Confirmed" />
                  <Picker.Item label="Completed" value="Completed" />
                </Picker>
              </View>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ minWidth: isMobile ? 1000 : '100%' }}>
              <View style={styles.tableRowHeader}>
                <Text style={[styles.tableCellHeader, {flex: 0.5}]}>Token</Text>
                <Text style={styles.tableCellHeader}>Patient</Text>
                <Text style={styles.tableCellHeader}>Doctor/Date</Text>
                <Text style={styles.tableCellHeader}>Booked By</Text>
                <Text style={styles.tableCellHeader}>Payment/Status</Text>
                <Text style={[styles.tableCellHeader, {flex: 0.5, textAlign: 'center'}]}>Actions</Text>
              </View>
              {allBookings.map((b, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={[styles.tableCell, {flex: 0.5, fontWeight: 'bold'}]}>#{b.token_number}</Text>
                  <View style={styles.tableCell}>
                    <Text style={{fontWeight: '500'}}>{b.patient_name}</Text>
                    <Text style={{fontSize: 12, color: '#64748b'}}>{b.mobile} | Age: {b.age}</Text>
                  </View>
                  <View style={styles.tableCell}>
                    <Text>{b.doctor_name}</Text>
                    <Text style={{fontSize: 12, color: '#64748b'}}>{new Date(b.date).toLocaleDateString('en-GB')} {b.start_time}</Text>
                  </View>
                  <View style={styles.tableCell}>
                    <Text>{b.booked_by_name}</Text>
                    <Text style={{fontSize: 12, color: '#64748b'}}>{b.booked_by_role || '-'}</Text>
                  </View>
                  <View style={styles.tableCell}>
                    <Text>₹{b.fee} ({b.payment_mode})</Text>
                    <Text style={{fontSize: 12, color: b.status === 'Cancelled' ? 'red' : 'green'}}>{b.status}</Text>
                  </View>
                  <View style={[styles.tableCell, {flex: 0.5, flexDirection: 'row', justifyContent: 'center', gap: 12}]}>
                    {b.status !== 'Cancelled' && (
                      <>
                        <TouchableOpacity onPress={() => {
                          setEditBookingSelected(b);
                          setEditForm({ patient_name: b.patient_name, mobile: b.mobile, age: String(b.age), gender: b.gender, blood_group: b.blood_group, city: b.city, pin_code: b.pin_code, guardian_name: b.guardian_name, reason_for_visit: b.reason_for_visit, reference: b.reference, pr: b.pr });
                        }}><Edit color="#eab308" size={20} /></TouchableOpacity>
                        <TouchableOpacity onPress={() => handleCancelBooking(b)}><XCircle color="#ef4444" size={20} /></TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>
              ))}
              {allBookings.length === 0 && <Text style={{padding: 20, textAlign: 'center', color: '#64748b'}}>No bookings found.</Text>}
            </View>
          </ScrollView>

          {/* Edit Booking Modal */}
          {editBookingSelected && (
            <View style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 1000}}>
              <View style={[styles.card, {width: isMobile ? '95%' : 600, maxHeight: '90%'}]}>
                <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16}}>
                  <Text style={{fontSize: 18, fontWeight: 'bold'}}>Edit Booking #{editBookingSelected.token_number}</Text>
                  <TouchableOpacity onPress={() => setEditBookingSelected(null)}><XCircle color="#64748b" size={24} /></TouchableOpacity>
                </View>
                <ScrollView>
                  <View style={styles.grid}>
                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Patient Name*</Text>
                      <TextInput style={styles.input} value={editForm.patient_name} onChangeText={(v) => setEditForm({...editForm, patient_name: v})} />
                    </View>
                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Mobile*</Text>
                      <TextInput style={styles.input} value={editForm.mobile} onChangeText={(v) => setEditForm({...editForm, mobile: v})} />
                    </View>
                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Age*</Text>
                      <TextInput style={styles.input} value={editForm.age} onChangeText={(v) => setEditForm({...editForm, age: v})} />
                    </View>
                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Gender</Text>
                      <View style={styles.pickerContainer}>
                        <Picker selectedValue={editForm.gender} onValueChange={(v) => setEditForm({...editForm, gender: v})} style={styles.picker}>
                          <Picker.Item label="Male" value="Male" /><Picker.Item label="Female" value="Female" />
                        </Picker>
                      </View>
                    </View>
                    <View style={styles.formGroup}><Text style={styles.label}>Address</Text><TextInput style={styles.input} value={editForm.city} onChangeText={(v) => setEditForm({...editForm, city: v})} /></View>
                  </View>
                  <TouchableOpacity style={styles.confirmBtn} onPress={handleEditSave} disabled={editLoading}>
                    <Text style={styles.confirmBtnText}>{editLoading ? 'Saving...' : 'Save Changes'}</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </View>
          )}
        </View>
`;

if (!content.includes("activeTab === 'Bookings' ? (")) {
  content = content.replace("      ) : activeTab === 'Reschedule' ? (", uiBlock + "      ) : activeTab === 'Reschedule' ? (");
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Bookings UI injected successfully!');
} else {
  console.log('Bookings UI already exists.');
}
