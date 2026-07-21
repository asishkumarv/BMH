const fs = require('fs');
let data = fs.readFileSync("raw_sales_data.txt", "utf8");

// Escape raw backslashes globally first
let backslashEscaped = data.replace(/\\/g, '\\\\');

// Sanitize control characters next
let sanitized = backslashEscaped.replace(/[\x00-\x1F\x7F-\x9F]/g, (match) => {
    if (match === '\n') return '\\n';
    if (match === '\r') return '\\r';
    if (match === '\t') return '\\t';
    return '';
});

// Clean up decimal points with no leading zeros (including negative numbers, e.g. -.04 to -0.04)
let cleaned = sanitized.replace(/(:\s*|,\s*|\[\s*|-)\.(\d+)/g, "$10.$2");

// Escape unescaped double quotes inside values of string fields
let quoteCleaned = cleaned.replace(/("(?:medicine_name|patient_name|address|locality|landmark|pharmacy_name|createduser|deliver_name|city|state|country|invoice_id|order_no|order_for|payment_status|order_type)")\s*:\s*"(.*?)"\s*([,}])/g, (match, key, val, suffix) => {
    const escapedVal = val.replace(/(?<!\\)"/g, '\\"');
    return `${key}:"${escapedVal}"${suffix}`;
});

try {
  const parsed = JSON.parse(quoteCleaned);
  console.log("Successfully parsed! Total invoices:", parsed.invoiceDetails.length);
} catch (e) {
  console.error("Parsing failed:", e.message);
  // Find where it failed again
  const pos = e.message.match(/at position (\d+)/);
  if (pos) {
    const idx = parseInt(pos[1]);
    console.log("Context around error:", quoteCleaned.substring(idx - 100, idx + 200));
  }
}
