const xlsx = require('xlsx');
const fs = require('fs');

function excelTimeToHHMM(excelTime) {
  if (!excelTime && excelTime !== 0) return 'NULL';
  if (typeof excelTime === 'string') return `'${excelTime.replace(/'/g, "''")}'`;
  const totalSeconds = Math.round(excelTime * 86400);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `'${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}'`;
}

function escapeSql(str) {
  if (!str) return 'NULL';
  return `'${String(str).replace(/'/g, "''")}'`;
}

async function generateSql() {
  const filePath = 'c:/Users/Lohitha Asish/Desktop/BMH/Bus ,Route,Time.xlsx';
  const outPath = 'c:/Users/Lohitha Asish/Desktop/BMH/bmh_backend_new/import_buses.sql';
  
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet, { range: 3 });

    let sql = `
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
);
TRUNCATE TABLE buses RESTART IDENTITY CASCADE;

`;

    for (const row of data) {
      if (!row['Bus ID'] && !row['Bus Name']) continue;

      sql += `INSERT INTO buses (
        bus_id, bus_name, operator_name, bus_number, route_code, source, destination, 
        selected_stop_via, stop_arrival_time, departure_time, arrival_time, reporting_time,
        travel_duration, frequency, days_of_operation, parcel_accepted, parcel_contact_person,
        mobile_no, booking_counter, gps_available, average_transit_time, status, remarks
      ) VALUES (
        ${escapeSql(row['Bus ID'])}, ${escapeSql(row['Bus Name'])}, ${escapeSql(row['Operator Name'])}, 
        ${escapeSql(row['Bus Number'])}, ${escapeSql(row['Route Code'])}, ${escapeSql(row['Source'])}, 
        ${escapeSql(row['Destination'])}, ${escapeSql(row['Selected Stop (Via)'])}, 
        ${excelTimeToHHMM(row['Stop Arrival Time'])}, ${excelTimeToHHMM(row['Departure Time'])}, 
        ${excelTimeToHHMM(row['Arrival Time'])}, ${excelTimeToHHMM(row['Reporting Time'])},
        ${escapeSql(row['Travel Duration'])}, ${escapeSql(row['Frequency'])}, ${escapeSql(row['Days of Operation'])}, 
        ${escapeSql(row['Parcel Accepted'])}, ${escapeSql(row['Parcel Contact Person'])}, 
        ${escapeSql(row['Mobile No.'])}, ${escapeSql(row['Booking Counter'])}, ${escapeSql(row['GPS Available'])}, 
        ${escapeSql(row['Average Transit Time'])}, ${escapeSql(row['Status'] || 'Active')}, ${escapeSql(row['Remarks'])}
      );\n`;
    }

    fs.writeFileSync(outPath, sql);
    console.log('Generated import_buses.sql');
  } catch (error) {
    console.error('Error generating sql:', error);
  }
}

generateSql();
