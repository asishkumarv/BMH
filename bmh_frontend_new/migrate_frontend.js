const fs = require('fs');
const path = require('path');

const OLD_SRC = path.join(__dirname, '../hospital-management-system');
const NEW_SRC = path.join(__dirname, 'app');

const mappings = [
  // Delivery Boy
  { src: 'DeliveryBoy/DeliveryBoyDashboard.js', dest: 'delivery/dashboard/index.tsx' },
  { src: 'DeliveryBoy/DleiveryBoyOrders.js', dest: 'delivery/dashboard/orders.tsx' },
  { src: 'DeliveryBoy/DeliveryBoyProfileScreen.js', dest: 'delivery/dashboard/profile.tsx' },
  { src: 'DeliveryBoy/InduvidualOrderScreen.js', dest: 'delivery/dashboard/individual-order.tsx' },
  { src: 'DeliveryBoy/DeliveryBoyEdit.js', dest: 'delivery/dashboard/edit-profile.tsx' },
  { src: 'DeliveryBoy/CashHandoverScreen.js', dest: 'delivery/dashboard/cash-handover.tsx' },
  { src: 'DeliveryBoy/AddressesChangeRequestForm.js', dest: 'delivery/dashboard/address-change.tsx' },
  
  // Admin Ecogreen
  { src: 'Admin/AdminItemMaster.js', dest: 'admin/dashboard/pharmacy/items.tsx' },
  { src: 'Admin/AdminStockDetailedScreen.js', dest: 'admin/dashboard/pharmacy/stock.tsx' },
  { src: 'Admin/AdminCustomerMasterDataa.js', dest: 'admin/dashboard/pharmacy/customers.tsx' },
  { src: 'Admin/AdminPurchaseorder.js', dest: 'admin/dashboard/pharmacy/purchase-order.tsx' },
  { src: 'Admin/CreateSalesOrderform.js', dest: 'admin/dashboard/pharmacy/create-order.tsx' },
  { src: 'Admin/EcogreenSalesorderStatus.js', dest: 'admin/dashboard/pharmacy/order-status.tsx' },
  { src: 'Admin/Ecogreensalesorderdata.js', dest: 'admin/dashboard/pharmacy/ecogreen-sales-orders.tsx' },
  { src: 'Admin/EcogreenSalesinvoicedata.js', dest: 'admin/dashboard/pharmacy/ecogreen-invoices.tsx' },
  { src: 'Admin/EcogreeenSalesOrderTable.js', dest: 'admin/dashboard/pharmacy/sales-list.tsx' },
  { src: 'Admin/AdminPurchaseOrderlist.js', dest: 'admin/dashboard/pharmacy/purchase-list.tsx' },
  { src: 'Admin/EcoGreenStockData.js', dest: 'admin/dashboard/pharmacy/ecogreen-stock.tsx' },
  { src: 'Admin/AdminLocalMasterecogreen.js', dest: 'admin/dashboard/pharmacy/local-master.tsx' },
  
  // Employee Ecogreen (map to the exact names from sidebar)
  { src: 'Admin/AdminPurchaseorder.js', dest: 'employee/dashboard/pharmacy/purchase-orders.tsx' },
  { src: 'Admin/AdminPurchaseOrderlist.js', dest: 'employee/dashboard/pharmacy/purchase-orderlist.tsx' },
  { src: 'Admin/CreateSalesOrderform.js', dest: 'employee/dashboard/pharmacy/sales-order.tsx' },
  { src: 'Admin/EcogreeenSalesOrderTable.js', dest: 'employee/dashboard/pharmacy/sales-invoices.tsx' },
  { src: 'Admin/EcogreenSalesinvoicedata.js', dest: 'employee/dashboard/pharmacy/ecogreen-invoices.tsx' },
];

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function processFile(srcPath, destPath) {
  if (!fs.existsSync(srcPath)) {
    console.log(`Source missing: ${srcPath}`);
    return;
  }
  let content = fs.readFileSync(srcPath, 'utf8');

  // Replace navigation with router
  content = content.replace(/import\s+\{.*useNavigation.*\}\s+from\s+['"]@react-navigation\/native['"];?/g, "import { useRouter } from 'expo-router';");
  content = content.replace(/const\s+navigation\s*=\s*useNavigation\(\);/g, "const router = useRouter();");
  content = content.replace(/navigation\.navigate\(/g, "router.push(");
  content = content.replace(/navigation\.goBack\(\)/g, "router.back()");

  ensureDir(destPath);
  fs.writeFileSync(destPath, content);
  console.log(`Copied and transformed to: ${destPath}`);
}

mappings.forEach(m => {
  processFile(path.join(OLD_SRC, m.src), path.join(NEW_SRC, m.dest));
});
