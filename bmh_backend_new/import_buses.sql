
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

