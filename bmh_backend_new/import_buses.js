require('dotenv').config();
const xlsx = require('xlsx');
const pool = require('./db');

function excelTimeToHHMM(excelTime) {
  if (!excelTime && excelTime !== 0) return null;
  if (typeof excelTime === 'string') return excelTime;
  const totalSeconds = Math.round(excelTime * 86400);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

async function importBuses() {
  const filePath = 'c:/Users/Lohitha Asish/Desktop/BMH/Bus ,Route,Time.xlsx';
  
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    // Data starts from the 2nd row (header is at index 1)
    const data = xlsx.utils.sheet_to_json(worksheet, { range: 1 });

    // 1. Create Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS buses (
        id SERIAL PRIMARY KEY,
        bus_id VARCHAR(50),
        bus_name VARCHAR(255),
        operator_name VARCHAR(255),
        bus_number VARCHAR(100),
        route_code VARCHAR(100),
        source VARCHAR(255),
        destination VARCHAR(255),
        selected_stop_via VARCHAR(255),
        stop_arrival_time VARCHAR(50),
        departure_time VARCHAR(50),
        arrival_time VARCHAR(50),
        reporting_time VARCHAR(50),
        travel_duration VARCHAR(100),
        frequency VARCHAR(100),
        days_of_operation VARCHAR(100),
        parcel_accepted VARCHAR(50),
        parcel_contact_person VARCHAR(255),
        mobile_no VARCHAR(50),
        booking_counter VARCHAR(255),
        gps_available VARCHAR(50),
        average_transit_time VARCHAR(100),
        status VARCHAR(50),
        remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('buses table created or already exists.');

    // 2. Clear existing (optional, but good for fresh import)
    await pool.query('TRUNCATE TABLE buses RESTART IDENTITY CASCADE');
    console.log('buses table truncated.');

    // 3. Insert Data
    let insertedCount = 0;
    for (const row of data) {
      if (!row['Bus ID'] && !row['Bus Name']) continue; // Skip empty rows

      await pool.query(`
        INSERT INTO buses (
          bus_id, bus_name, operator_name, bus_number, route_code, source, destination, 
          selected_stop_via, stop_arrival_time, departure_time, arrival_time, reporting_time,
          travel_duration, frequency, days_of_operation, parcel_accepted, parcel_contact_person,
          mobile_no, booking_counter, gps_available, average_transit_time, status, remarks
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
        )
      `, [
        row['Bus ID'] || null,
        row['Bus Name'] || null,
        row['Operator Name'] || null,
        row['Bus Number'] || null,
        row['Route Code'] || null,
        row['Source'] || null,
        row['Destination'] || null,
        row['Selected Stop (Via)'] || null,
        excelTimeToHHMM(row['Stop Arrival Time']),
        excelTimeToHHMM(row['Departure Time']),
        excelTimeToHHMM(row['Arrival Time']),
        excelTimeToHHMM(row['Reporting Time']),
        row['Travel Duration'] || null,
        row['Frequency'] || null,
        row['Days of Operation'] || null,
        row['Parcel Accepted'] || null,
        row['Parcel Contact Person'] || null,
        row['Mobile No.'] ? String(row['Mobile No.']) : null,
        row['Booking Counter'] || null,
        row['GPS Available'] || null,
        row['Average Transit Time'] || null,
        row['Status'] || 'Active',
        row['Remarks'] || null
      ]);
      insertedCount++;
    }

    console.log(`Successfully imported ${insertedCount} buses!`);
  } catch (error) {
    console.error('Error importing buses:', error);
  } finally {
    process.exit(0);
  }
}

importBuses();
