const axios = require('axios');
const fs = require('fs');

async function dump() {
  try {
    const payload = {
      "c2Code": "P00000",
      "storeId": "001",
      "prodCode": "02",
      "inputDateTime": "2026-07-14 00:00:00.000",
      "apiKey": "UDAwMDAwMDAxXjIwMjYtMDctMTYgMTM6NTQ=" // Or fetch it
    };
    
    // We can import the actual token fetching logic to get a fresh apiKey
    const { fetchToken } = require('./controllers/pharmacyController');
    const tok = await fetchToken();
    payload.apiKey = tok.apiKey;

    console.log("Fetching raw API response...");
    const res = await axios.post("http://117.211.64.158:21000/ws_c2_services_get_sales_data", payload, { timeout: 30000 });
    const data = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    fs.writeFileSync("raw_sales_data.txt", data, "utf8");
    console.log("Dumped response to raw_sales_data.txt. Total length:", data.length);
  } catch(e) {
    console.error(e);
  }
}
dump();
