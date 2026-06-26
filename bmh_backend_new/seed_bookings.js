const axios = require('axios');

async function seedBookings() {
  try {
    console.log("Logging in as employee...");
    const loginRes = await axios.post('https://bmh-eitu.onrender.com/employees/login', {
      email: 'asishkumarv@gmail.com',
      password: '123456'
    });
    
    if (!loginRes.data.success) {
      console.error("Login failed", loginRes.data);
      return;
    }
    
    const token = null;
    const employeeId = loginRes.data.data.id;
    console.log("Logged in successfully. Employee ID:", employeeId);
    
    const today = new Date().toISOString().split('T')[0];
    console.log("Fetching slots for today:", today);
    const slotsRes = await axios.get('https://bmh-eitu.onrender.com/doctors/slots');
    const allSlots = slotsRes.data.data;
    
    const targetDoctors = ['CARD001', 'CARD002', 'CARD003'];
    
    const slotsToBook = allSlots.filter(s => 
      targetDoctors.includes(s.doctor_id) && s.date.startsWith(today)
    );
    
    if (slotsToBook.length === 0) {
      console.log("No slots found today for the specified doctors.");
      return;
    }
    
    console.log(`Found ${slotsToBook.length} slots for the target doctors. Booking 20 tokens each...`);
    
    for (const slot of slotsToBook) {
      console.log(`Booking for Doctor ${slot.doctor_name} (Slot ID: ${slot.id})`);
      for (let i = 1; i <= 20; i++) {
        try {
          const bookingData = {
            slot_id: slot.id,
            patient_name: `Test Patient ${i} for ${slot.doctor_name}`,
            mobile: `99999000${i.toString().padStart(2, '0')}`,
            email: `test${i}@example.com`,
            age: 25 + i,
            gender: i % 2 === 0 ? 'Female' : 'Male',
            booked_by: employeeId,
            payment_mode: 'Cash',
            token_number: i,
            blood_group: 'O+',
            reason_for_visit: 'Routine Checkup',
            city: 'Hyderabad',
            pin_code: '500001',
            guardian_name: 'Test Guardian'
          };
          
          await axios.post('https://bmh-eitu.onrender.com/bookings/create', bookingData, {
            headers: { Authorization: `Bearer ${token}` }
          });
          console.log(` - Booked token #${i} for Doctor ${slot.doctor_name}`);
        } catch (err) {
          if (err.response && err.response.data.message === 'This token is already booked') {
            console.log(` - Token #${i} is already booked. Skipping...`);
          } else {
            console.error(`Failed to book token #${i}`, err.response ? err.response.data : err.message);
          }
        }
      }
    }
    
    console.log("Seeding complete!");
  } catch (error) {
    console.error("Error seeding bookings:", error.message);
  }
}

seedBookings();
