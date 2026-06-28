CREATE TABLE IF NOT EXISTS delivery_addresses (
  id SERIAL PRIMARY KEY,
  patient_id VARCHAR(255),
  name VARCHAR(255),
  mobile VARCHAR(255),
  pincode VARCHAR(255),
  flat VARCHAR(255),
  street VARCHAR(255),
  city VARCHAR(255),
  state VARCHAR(255),
  landmark VARCHAR(255),
  address_type VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS delivery_boys (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  phone VARCHAR(255),
  email VARCHAR(255),
  address VARCHAR(255),
  profile_pic VARCHAR(255),
  bike_number VARCHAR(255),
  bike_photo VARCHAR(255),
  password VARCHAR(255),
  status VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cash_handovers (
  id SERIAL PRIMARY KEY,
  deliveryboy_id VARCHAR(255),
  date VARCHAR(255),
  total_cash VARCHAR(255),
  total_digital VARCHAR(255),
  cash_returned VARCHAR(255),
  cashier_photo VARCHAR(255),
  signature VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS delivery_boy_locations (
  id SERIAL PRIMARY KEY,
  delivery_boy_id VARCHAR(255),
  latitude VARCHAR(255),
  longitude VARCHAR(255),
  status VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS deliverylocations_orders (
  id SERIAL PRIMARY KEY,
  order_id VARCHAR(255),
  delivery_boy_id VARCHAR(255),
  latitude VARCHAR(255),
  longitude VARCHAR(255),
  updated_at VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS item_master (
  id SERIAL PRIMARY KEY,
  item_code VARCHAR(255),
  item_name VARCHAR(255),
  item_short_name VARCHAR(255),
  item_full_name VARCHAR(255),
  brand_code VARCHAR(255),
  brand_name VARCHAR(255),
  category_code VARCHAR(255),
  category_name VARCHAR(255),
  content_code VARCHAR(255),
  content_name VARCHAR(255),
  pack_code VARCHAR(255),
  pack_name VARCHAR(255),
  item_qty_per_box VARCHAR(255),
  item_added_date VARCHAR(255),
  item_updated_date VARCHAR(255),
  hsn_sac_code VARCHAR(255),
  hsn_sac_name VARCHAR(255),
  minSaleQty VARCHAR(255),
  note VARCHAR(255),
  mfacName VARCHAR(255),
  mfacCode VARCHAR(255),
  packTypCode VARCHAR(255),
  packTypName VARCHAR(255),
  scheduleCode VARCHAR(255),
  scheduleName VARCHAR(255),
  categoryHeadCode VARCHAR(255),
  categoryHeadName VARCHAR(255),
  categoryClassCode VARCHAR(255),
  categoryClassName VARCHAR(255),
  allowDisc VARCHAR(255),
  gstCode VARCHAR(255),
  parentItemCode VARCHAR(255),
  parentItemName VARCHAR(255),
  molecule_info VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_batches (
  id SERIAL PRIMARY KEY,
  c_item_code VARCHAR(255),
  item_name VARCHAR(255),
  item_qty_per_box VARCHAR(255),
  batch_no VARCHAR(255),
  stock_bal_qty VARCHAR(255),
  expiry_date VARCHAR(255),
  mrp VARCHAR(255),
  mrpbox VARCHAR(255),
  sale_rate VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS local_customers (
  id SERIAL PRIMARY KEY,
  brcode VARCHAR(255),
  lc_code VARCHAR(255),
  lc_name VARCHAR(255),
  added_date VARCHAR(255),
  age VARCHAR(255),
  gender VARCHAR(255),
  address1 VARCHAR(255),
  address2 VARCHAR(255),
  address3 VARCHAR(255),
  city VARCHAR(255),
  pin VARCHAR(255),
  mobile_no VARCHAR(255),
  mail_id VARCHAR(255),
  parent_code VARCHAR(255),
  parent_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ecogreenpurchase_orders (
  id SERIAL PRIMARY KEY,
  br_code VARCHAR(255),
  year VARCHAR(255),
  prefix VARCHAR(255),
  srno VARCHAR(255),
  custcode VARCHAR(255),
  custname VARCHAR(255),
  refcode VARCHAR(255),
  refname VARCHAR(255),
  total VARCHAR(255),
  details VARCHAR(255),
  createDateTime VARCHAR(255),
  createUser VARCHAR(255),
  modifyDateTime VARCHAR(255),
  modifiedUser VARCHAR(255),
  remarks VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_bus_details (
  id SERIAL PRIMARY KEY,
  order_id VARCHAR(255),
  bus_no VARCHAR(255),
  driver_name VARCHAR(255),
  driver_contact VARCHAR(255),
  delivery_boy_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  patient_id VARCHAR(255),
  patient_name VARCHAR(255),
  patient_email VARCHAR(255),
  mobile_no VARCHAR(255),
  address_id VARCHAR(255),
  address VARCHAR(255),
  payment_method VARCHAR(255),
  expected_delivery VARCHAR(255),
  subtotal VARCHAR(255),
  delivery_fee VARCHAR(255),
  tax VARCHAR(255),
  total VARCHAR(255),
  order_summary VARCHAR(255),
  status VARCHAR(255),
  otp VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ecogreensales_orders (
  id SERIAL PRIMARY KEY,
  order_id VARCHAR(255),
  order_no VARCHAR(255),
  createduser VARCHAR(255),
  invoice_id VARCHAR(255),
  payment_status VARCHAR(255),
  total_price VARCHAR(255),
  total_discount VARCHAR(255),
  order_for VARCHAR(255),
  delivered_by VARCHAR(255),
  shipping_charge VARCHAR(255),
  patient_name VARCHAR(255),
  patient_contact_no VARCHAR(255),
  patient_address VARCHAR(255),
  pharmacy VARCHAR(255),
  order_items VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ecogreensales_invoices (
  id SERIAL PRIMARY KEY,
  order_id VARCHAR(255),
  order_no VARCHAR(255),
  invoice_id VARCHAR(255),
  created_at_system VARCHAR(255),
  createduser VARCHAR(255),
  order_type VARCHAR(255),
  payment_status VARCHAR(255),
  total_price VARCHAR(255),
  total_discount VARCHAR(255),
  order_for VARCHAR(255),
  delivered_by VARCHAR(255),
  shipping_charge VARCHAR(255),
  patient_name VARCHAR(255),
  patient_contact_no VARCHAR(255),
  patient_address VARCHAR(255),
  pharmacy VARCHAR(255),
  store_id VARCHAR(255),
  order_items VARCHAR(255),
  user_email VARCHAR(255),
  reminder_date VARCHAR(255),
  d_remind_date VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ecogreensales_order_status (
  id SERIAL PRIMARY KEY,
  order_id VARCHAR(255),
  cust_code VARCHAR(255),
  from_gst_no VARCHAR(255),
  to_gst_no VARCHAR(255),
  customer_type VARCHAR(255),
  doctor_name VARCHAR(255),
  invoices VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS salesorders (
  id SERIAL PRIMARY KEY,
  order_id VARCHAR(255),
  order_no VARCHAR(255),
  createduser VARCHAR(255),
  payment_status VARCHAR(255),
  total_price VARCHAR(255),
  total_discount VARCHAR(255),
  order_for VARCHAR(255),
  delivered_by VARCHAR(255),
  patient_name VARCHAR(255),
  patient_contact_no VARCHAR(255),
  store_id VARCHAR(255),
  user_email VARCHAR(255),
  pharmacy VARCHAR(255),
  patient_address VARCHAR(255),
  status VARCHAR(255),
  order_items VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS slaesinvoices (
  id SERIAL PRIMARY KEY,
  invoice_id VARCHAR(255),
  createduser VARCHAR(255),
  order_type VARCHAR(255),
  payment_status VARCHAR(255),
  total_price VARCHAR(255),
  total_discount VARCHAR(255),
  shipping_charge VARCHAR(255),
  order_for VARCHAR(255),
  delivered_by VARCHAR(255),
  patient_address VARCHAR(255),
  pharmacy VARCHAR(255),
  invoice_items VARCHAR(255),
  status VARCHAR(255),
  order_id VARCHAR(255),
  order_no VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id SERIAL PRIMARY KEY,
  supplier VARCHAR(255),
  purchase_no VARCHAR(255),
  delivery_type VARCHAR(255),
  received_date VARCHAR(255),
  status VARCHAR(255),
  assignedto VARCHAR(255),
  receivedby VARCHAR(255),
  purchase_items VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hidden_fields (
  id SERIAL PRIMARY KEY,
  field_name VARCHAR(255),
  hidden VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sales_orders (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sales_order_invoices (
  id SERIAL PRIMARY KEY,
  invoice_no VARCHAR(255),
  order_id VARCHAR(255),
  customer_name VARCHAR(255),
  customer_mobile VARCHAR(255),
  address VARCHAR(255),
  medicines VARCHAR(255),
  total_amount VARCHAR(255),
  payment_mode VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS address_change_requests (
  id SERIAL PRIMARY KEY,
  order_id VARCHAR(255),
  delivery_boy_id VARCHAR(255),
  old_address VARCHAR(255),
  new_address VARCHAR(255),
  new_landmark VARCHAR(255),
  new_pincode VARCHAR(255),
  reason VARCHAR(255),
  status VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

