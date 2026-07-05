const fs = require('fs');

const file = 'c:/Users/Lohitha Asish/Desktop/BMH/bmh_frontend_new/app/delivery/dashboard/index.tsx';
let content = fs.readFileSync(file, 'utf8');

// Update online_orders payload
content = content.replace(
  /await axios\.put\(`https:\/\/napi\.bharatmedicalhallplus\.com\/online-orders\/\$\{orderId\}\/status`, \{\s*status: 'DELIVERED',\s*delivery_otp: otp\s*\}\);/g,
  "await axios.put(`https://napi.bharatmedicalhallplus.com/online-orders/${orderId}/status`, {\n            status: 'DELIVERED',\n            delivery_otp: otp,\n            pod_payment_mode: currentOrder.payment_mode === 'POD' ? paymentMode : null\n          });"
);

// Update manual_orders payload
content = content.replace(
  /delivery_otp: otp,\s*payment_mode: paymentMode,\s*paid_amount: paidAmount,\s*payment_txn_id: paymentTxnId/,
  "delivery_otp: otp,\n            pod_payment_mode: currentOrder.payment_mode === 'POD' ? paymentMode : null,\n            paid_amount: paidAmount,\n            payment_txn_id: paymentTxnId"
);

fs.writeFileSync(file, content, 'utf8');
console.log('index.tsx patched for pod_payment_mode.');
