const axios = require("axios");

// In-memory cache implementation to avoid external dependencies
const cacheStore = {};
const cache = {
  get: (key) => {
    const entry = cacheStore[key];
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      delete cacheStore[key];
      return null;
    }
    return entry.value;
  },
  set: (key, value, ttlSeconds) => {
    cacheStore[key] = {
      value,
      expiry: Date.now() + (ttlSeconds || 3600) * 1000
    };
  }
};

// In-memory data store for dashboard
let db = {
    items: [],
    stock: [],
    customers: [],
    po: [],
    orderStatus: [],
    webhooks: []
};

let lastUpdated = {
    items: null,
    stock: null,
    customers: null,
    po: null,
    orderStatus: null,
    webhooks: null
};

let latestOrderNo = null;

const getLocalDateString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getFormattedDateTime = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

function parseConcatenatedJson(str) {
    if (!str) return [];
    if (typeof str !== 'string') return [];
    const results = [];
    let braceCount = 0;
    let startIdx = 0;
    let inString = false;
    let escape = false;

    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        if (escape) {
            escape = false;
            continue;
        }
        if (char === '\\') {
            escape = true;
            continue;
        }
        if (char === '"') {
            inString = !inString;
            continue;
        }
        if (!inString) {
            if (char === '{') {
                if (braceCount === 0) {
                    startIdx = i;
                }
                braceCount++;
            } else if (char === '}') {
                braceCount--;
                if (braceCount === 0) {
                    const jsonStr = str.substring(startIdx, i + 1);
                    try {
                        results.push(JSON.parse(jsonStr));
                    } catch (e) {
                        // ignore malformed chunks
                    }
                }
            }
        }
    }
    return results;
}

function countConcatenatedJson(str) {
    if (!str) return 0;
    if (typeof str !== 'string') return 0;
    let count = 0;
    let braceCount = 0;
    let inString = false;
    let escape = false;

    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        if (escape) {
            escape = false;
            continue;
        }
        if (char === '\\') {
            escape = true;
            continue;
        }
        if (char === '"') {
            inString = !inString;
            continue;
        }
        if (!inString) {
            if (char === '{') {
                braceCount++;
            } else if (char === '}') {
                braceCount--;
                if (braceCount === 0) {
                    count++;
                }
            }
        }
    }
    return count;
}

let dashboardDataCache = {
    items: { stats: { today: 0, week: 0, total: 0 }, lastUpdated: null },
    stock: { stats: { today: 0, week: 0, total: 0 }, lastUpdated: null },
    customers: { stats: { today: 0, week: 0, total: 0 }, lastUpdated: null },
    po: { stats: { today: 0, week: 0, total: 0 }, lastUpdated: null },
    lastUpdated: null
};

async function fetchDashboardStats(apiKey) {
    try {
        console.log("🔄 Fetching dashboard stats with custom date/time parameters...");
        const today = new Date();
        
        // Format dates for Master & Stock
        const todayStart = new Date(today);
        todayStart.setHours(0, 0, 0, 0);
        const todayStr = getFormattedDateTime(todayStart);

        const oneWeekAgo = new Date(today);
        oneWeekAgo.setDate(today.getDate() - 7);
        oneWeekAgo.setHours(0, 0, 0, 0);
        const oneWeekAgoStr = getFormattedDateTime(oneWeekAgo);

        const totalStr = "2010-01-01 00:00:00";

        // Format dates for Customers & PO
        const todayYMD = getLocalDateString(today);
        const oneWeekAgoYMD = getLocalDateString(oneWeekAgo);
        const totalYMD = "2010-01-01";

        // 1. Fetch Item Master stats
        let itemsToday = 0;
        let itemsWeek = 0;
        let itemsTotal = 0;
        try {
            const resToday = await axios.post("http://117.211.64.158:21000/ws_c2_services_get_master_data", {
                "c2Code": "P00000", "storeId": "001", "prodCode": "02", "inputDateTime": todayStr, "apiKey": apiKey
            }, { timeout: 15000 });
            itemsToday = (resToday.data && resToday.data.data) ? resToday.data.data.length : 0;
        } catch(e) { console.error("Error fetching itemsToday stats:", e.message); }

        try {
            const resWeek = await axios.post("http://117.211.64.158:21000/ws_c2_services_get_master_data", {
                "c2Code": "P00000", "storeId": "001", "prodCode": "02", "inputDateTime": oneWeekAgoStr, "apiKey": apiKey
            }, { timeout: 15000 });
            itemsWeek = (resWeek.data && resWeek.data.data) ? resWeek.data.data.length : 0;
        } catch(e) { console.error("Error fetching itemsWeek stats:", e.message); }

        try {
            const resTotal = await axios.post("http://117.211.64.158:21000/ws_c2_services_get_master_data", {
                "c2Code": "P00000", "storeId": "001", "prodCode": "02", "inputDateTime": totalStr, "apiKey": apiKey
            }, { timeout: 30000 });
            itemsTotal = (resTotal.data && resTotal.data.data) ? resTotal.data.data.length : 0;
            resTotal.data = null; // Help GC
        } catch(e) { console.error("Error fetching itemsTotal stats:", e.message); }

        // 2. Fetch Stock Details stats
        let stockToday = 0;
        let stockWeek = 0;
        let stockTotal = 0;
        try {
            const resToday = await axios.post("http://117.211.64.158:21000/ws_c2_services_get_stock_data", {
                "c2Code": "P00000", "storeId": "001", "prodCode": "02", "inputDateTime": todayStr, "itemCodes": [], "apiKey": apiKey
            }, { timeout: 15000 });
            stockToday = (resToday.data && resToday.data.data) ? resToday.data.data.length : 0;
        } catch(e) { console.error("Error fetching stockToday stats:", e.message); }

        try {
            const resWeek = await axios.post("http://117.211.64.158:21000/ws_c2_services_get_stock_data", {
                "c2Code": "P00000", "storeId": "001", "prodCode": "02", "inputDateTime": oneWeekAgoStr, "itemCodes": [], "apiKey": apiKey
            }, { timeout: 15000 });
            stockWeek = (resWeek.data && resWeek.data.data) ? resWeek.data.data.length : 0;
        } catch(e) { console.error("Error fetching stockWeek stats:", e.message); }

        try {
            const resTotal = await axios.post("http://117.211.64.158:21000/ws_c2_services_get_stock_data", {
                "c2Code": "P00000", "storeId": "001", "prodCode": "02", "inputDateTime": totalStr, "itemCodes": [], "apiKey": apiKey
            }, { timeout: 45000 });
            stockTotal = (resTotal.data && resTotal.data.data) ? resTotal.data.data.length : 0;
            resTotal.data = null; // Help GC
        } catch(e) { console.error("Error fetching stockTotal stats:", e.message); }

        // 3. Fetch Local Customers stats
        let customersToday = 0;
        let customersWeek = 0;
        let customersTotal = 0;
        try {
            const resToday = await axios.post("http://117.211.64.158:21000/ws_c2_services_fetch_local_customer", {
                "c2Code": "P00000", "storeId": "001", "prodCode": "02", "apiKey": apiKey, "fromDate": todayYMD, "toDate": todayYMD
            }, { timeout: 15000 });
            const data = resToday.data;
            const parsed = Array.isArray(data) ? data : (data.data || []);
            customersToday = parsed.length;
        } catch(e) { console.error("Error fetching customersToday stats:", e.message); }

        try {
            const resWeek = await axios.post("http://117.211.64.158:21000/ws_c2_services_fetch_local_customer", {
                "c2Code": "P00000", "storeId": "001", "prodCode": "02", "apiKey": apiKey, "fromDate": oneWeekAgoYMD, "toDate": todayYMD
            }, { timeout: 15000 });
            const data = resWeek.data;
            const parsed = Array.isArray(data) ? data : (data.data || []);
            customersWeek = parsed.length;
        } catch(e) { console.error("Error fetching customersWeek stats:", e.message); }

        try {
            const resTotal = await axios.post("http://117.211.64.158:21000/ws_c2_services_fetch_local_customer", {
                "c2Code": "P00000", "storeId": "001", "prodCode": "02", "apiKey": apiKey, "fromDate": totalYMD, "toDate": todayYMD
            }, { timeout: 30000 });
            const data = resTotal.data;
            const parsed = Array.isArray(data) ? data : (data.data || []);
            customersTotal = parsed.length;
            resTotal.data = null; // Help GC
        } catch(e) { console.error("Error fetching customersTotal stats:", e.message); }

        // 4. Fetch Purchase Orders stats
        let poToday = 0;
        let poWeek = 0;
        let poTotal = 0;
        try {
            const resToday = await axios.post("http://117.211.64.158:21000/ws_c2_services_po_fetch", {
                "c2Code": "P00000", "storeId": "001", "prodCode": "02", "apiKey": apiKey, "fromDate": todayYMD, "toDate": todayYMD
            }, { responseType: 'text', timeout: 15000 });
            poToday = parseConcatenatedJson(resToday.data).length;
        } catch(e) { console.error("Error fetching poToday stats:", e.message); }

        try {
            const resWeek = await axios.post("http://117.211.64.158:21000/ws_c2_services_po_fetch", {
                "c2Code": "P00000", "storeId": "001", "prodCode": "02", "apiKey": apiKey, "fromDate": oneWeekAgoYMD, "toDate": todayYMD
            }, { responseType: 'text', timeout: 15000 });
            poWeek = parseConcatenatedJson(resWeek.data).length;
        } catch(e) { console.error("Error fetching poWeek stats:", e.message); }

        try {
            const resTotal = await axios.post("http://117.211.64.158:21000/ws_c2_services_po_fetch", {
                "c2Code": "P00000", "storeId": "001", "prodCode": "02", "apiKey": apiKey, "fromDate": totalYMD, "toDate": todayYMD
            }, { responseType: 'text', timeout: 30000 });
            poTotal = countConcatenatedJson(resTotal.data);
            resTotal.data = null; // Help GC
        } catch(e) { console.error("Error fetching poTotal stats:", e.message); }

        const timestamp = new Date().toISOString();
        dashboardDataCache = {
            items: { stats: { today: itemsToday, week: itemsWeek, total: itemsTotal }, lastUpdated: timestamp },
            stock: { stats: { today: stockToday, week: stockWeek, total: stockTotal }, lastUpdated: timestamp },
            customers: { stats: { today: customersToday, week: customersWeek, total: customersTotal }, lastUpdated: timestamp },
            po: { stats: { today: poToday, week: poWeek, total: poTotal }, lastUpdated: timestamp },
            lastUpdated: timestamp
        };
        console.log("✅ Dashboard stats successfully updated!");
    } catch(err) {
        console.error("fetchDashboardStats failed:", err.message);
    }
}

async function fetchToken() {
    try {
        const payload = { "c2Code": "P00000", "storeId": "001", "prodCode": "02", "securityKey": "VURBd01ESXdNakU9" };
        const res = await axios.post("http://117.211.64.158:21000/ws_c2_services_generate_token", payload, {timeout: 10000});
        cache.set("default_token", res.data.apiKey, 10800); // Cache for 3 hours
        return res.data;
    } catch(err) {
        console.error("fetchToken failed:", err.message);
        throw err;
    }
}

async function fetchMasterData(apiKey) {
    try {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        const oneWeekAgoStr = d.toISOString().slice(0, 19).replace("T", " ");
        const payload = { "c2Code": "P00000", "storeId": "001", "prodCode": "02", "inputDateTime": oneWeekAgoStr, "apiKey": apiKey };
        const res = await axios.post("http://117.211.64.158:21000/ws_c2_services_get_master_data", payload, {timeout: 10000});
        if (res.data && res.data.data) {
            db.items = res.data.data;
            lastUpdated.items = new Date().toISOString();
        }
    } catch(err) {
        console.error("fetchMasterData failed:", err.message);
    }
}

async function fetchStockData(apiKey) {
    try {
        const payload = { 
            "c2Code": "P00000", 
            "storeId": "001", 
            "prodCode": "02", 
            "inputDateTime": new Date().toISOString().slice(0, 19).replace("T", " "),
            "itemCodes": [], 
            "apiKey": apiKey 
        };
        const res = await axios.post("http://117.211.64.158:21000/ws_c2_services_get_stock_data", payload, {timeout: 10000});
        if (res.data && res.data.data) {
            db.stock = res.data.data;
            lastUpdated.stock = new Date().toISOString();
        }
    } catch(err) {
        console.error("fetchStockData failed:", err.message);
    }
}

async function fetchCustomersData(apiKey) {
    try {
        const todayStr = getLocalDateString(new Date());
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const oneWeekAgoStr = getLocalDateString(oneWeekAgo);

        const payload = { 
            "c2Code": "P00000", 
            "storeId": "001", 
            "prodCode": "02", 
            "apiKey": apiKey, 
            "fromDate": oneWeekAgoStr, 
            "toDate": todayStr 
        };
        const res = await axios.post("http://117.211.64.158:21000/ws_c2_services_fetch_local_customer", payload, {timeout: 10000});
        if (res.data && Array.isArray(res.data)) {
            db.customers = res.data;
            lastUpdated.customers = new Date().toISOString();
        } else if (res.data && res.data.data) {
            db.customers = res.data.data;
            lastUpdated.customers = new Date().toISOString();
        }
    } catch(err) {
        console.error("fetchCustomersData failed:", err.message);
    }
}

async function fetchPOData(apiKey) {
    try {
        const todayStr = getLocalDateString(new Date());
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const oneWeekAgoStr = getLocalDateString(oneWeekAgo);

        const payload = { 
            "c2Code": "P00000", 
            "storeId": "001", 
            "prodCode": "02", 
            "apiKey": apiKey, 
            "fromDate": oneWeekAgoStr, 
            "toDate": todayStr 
        };
        const res = await axios.post("http://117.211.64.158:21000/ws_c2_services_po_fetch", payload, {responseType: 'text', timeout: 10000});
        const parsedList = parseConcatenatedJson(res.data);
        db.po = parsedList;
        lastUpdated.po = new Date().toISOString();
    } catch(err) {
        console.error("fetchPOData failed:", err.message);
    }
}

async function fetchOrderStatusData(apiKey, orderNo) {
    if (!orderNo) return;
    try {
        const res = await axios.get(`http://117.211.64.158:21000/ws_c2_services_sale_order_status?order_no=${orderNo}&apikey=${apiKey}`, {timeout: 10000});
        if (res.data && res.data.invoices) {
            db.orderStatus = [res.data];
            lastUpdated.orderStatus = new Date().toISOString();
        }
    } catch(err) {
        console.error("fetchOrderStatusData failed:", err.message);
    }
}

// Global initialization function to start the auto-fetch timers
exports.initPharmacySync = () => {
    console.log("🚀 Initializing EcoGreen Pharmacy Background Sync...");
    
    const autoFetchAll = async () => {
        try {
            const tokenData = await fetchToken();
            const apiKey = tokenData?.apiKey;
            if(apiKey) {
                await fetchDashboardStats(apiKey);
                await fetchMasterData(apiKey);
                await fetchStockData(apiKey);
                await fetchCustomersData(apiKey);
                await fetchPOData(apiKey);
                await fetchOrderStatusData(apiKey, latestOrderNo);
            }
        } catch(err) {
            console.error("Auto fetch error:", err.message);
        }
    };

    // Automatically fetch on startup after 2 seconds
    setTimeout(autoFetchAll, 2000);

    // Auto fetch every 3 hours
    setInterval(() => {
        console.log("⏰ Running scheduled auto-fetch every 3 hours...");
        autoFetchAll();
    }, 10800000);
};

exports.getDashboard = (req, res) => {
    const calcStats = (arr, dateField) => {
        if(!arr || arr.length === 0) return { today: 0, week: 0, total: 0 };
        const today = new Date();
        const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        let todayCount = 0;
        let weekCount = 0;
        arr.forEach(item => {
            if (!item[dateField]) return;
            const d = new Date(item[dateField]);
            if (isNaN(d.getTime())) return;
            
            if (d.toDateString() === today.toDateString()) todayCount++;
            if (d >= oneWeekAgo && d <= today) weekCount++;
        });
        return { today: todayCount, week: weekCount, total: arr.length };
    };

    res.status(200).json({
        items: dashboardDataCache.items,
        stock: dashboardDataCache.stock,
        customers: dashboardDataCache.customers,
        po: dashboardDataCache.po,
        orderStatus: { stats: calcStats(db.orderStatus, 'docDate'), lastUpdated: lastUpdated.orderStatus },
        webhooks: { stats: calcStats(db.webhooks, 'receivedAt'), lastUpdated: lastUpdated.webhooks }
    });
};

exports.manualFetch = async (req, res) => {
    try {
        const tokenData = await fetchToken();
        const apiKey = tokenData?.apiKey;
        if(apiKey) {
            await fetchDashboardStats(apiKey);
            await fetchMasterData(apiKey);
            await fetchStockData(apiKey);
            await fetchCustomersData(apiKey);
            await fetchPOData(apiKey);
            await fetchOrderStatusData(apiKey, latestOrderNo);
        }
        res.status(200).json({ message: "Fetched successfully", lastUpdated });
    } catch (err) {
        console.error("Manual fetch error:", err.message);
        res.status(500).json({ error: err.message });
    }
};

exports.generateToken = async (req, res) => {
    try {
        const data = await fetchToken();
        res.status(200).json(data);
    } catch (err) {
        res.status(500).json({ error: "Failed to generate token" });
    }
};

exports.createOrder = async (req, res) => {
    try {
        const payload = req.body;
        const token = cache.get("default_token") || (await fetchToken()).apiKey;
        payload.apiKey = token;
        const apiRes = await axios.post("http://117.211.64.158:21000/ws_c2_services_create_sale_order", payload, {timeout: 10000});
        
        const orderNoToTrack = apiRes.data?.orderId || payload.orderId;
        if (orderNoToTrack) {
            latestOrderNo = orderNoToTrack;
            await fetchOrderStatusData(token, latestOrderNo);
        }
        
        res.status(200).json(apiRes.data);
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getItems = async (req, res) => {
    try {
        const { inputDateTime } = req.body;
        if (inputDateTime) {
            const token = cache.get("default_token") || (await fetchToken()).apiKey;
            const payload = { "c2Code": "P00000", "storeId": "001", "prodCode": "02", "inputDateTime": inputDateTime, "apiKey": token };
            const apiRes = await axios.post("http://117.211.64.158:21000/ws_c2_services_get_master_data", payload, {timeout: 10000});
            return res.status(200).json({ data: apiRes.data.data || [], lastUpdated: new Date().toISOString() });
        }
        res.status(200).json({ data: db.items, lastUpdated: lastUpdated.items });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getStock = async (req, res) => {
    try {
        const { itemCodes, inputDateTime } = req.body;
        if ((itemCodes && itemCodes.length > 0) || inputDateTime) {
            const token = cache.get("default_token") || (await fetchToken()).apiKey;
            const payload = { 
                "c2Code": "P00000", 
                "storeId": "001", 
                "prodCode": "02", 
                "inputDateTime":"2023-01-01 10:10:00",
                "itemCodes": (itemCodes && itemCodes.length > 0) ? itemCodes : [],
                "apiKey": token 
            };

            const apiRes = await axios.post("http://117.211.64.158:21000/ws_c2_services_get_stock_data", payload, {timeout: 10000});
            return res.status(200).json({ data: apiRes.data.data || [], lastUpdated: new Date().toISOString() });
        }
        res.status(200).json({ data: db.stock, lastUpdated: lastUpdated.stock });
    } catch(err) {
         res.status(500).json({ error: err.message });
    }
};

exports.getCustomers = async (req, res) => {
    try {
        const { fromDate, toDate } = req.body;
        if (fromDate && toDate) {
            const token = cache.get("default_token") || (await fetchToken()).apiKey;
            const payload = { "c2Code": "P00000", "storeId": "001", "prodCode": "02", "apiKey": token, "fromDate": fromDate, "toDate": toDate };
            const apiRes = await axios.post("http://117.211.64.158:21000/ws_c2_services_fetch_local_customer", payload, {timeout: 10000});
            let parsedData = Array.isArray(apiRes.data) ? apiRes.data : (apiRes.data.data || []);
            return res.status(200).json({ data: parsedData, lastUpdated: new Date().toISOString() });
        }
        res.status(200).json({ data: db.customers, lastUpdated: lastUpdated.customers });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getPurchaseOrder = async (req, res) => {
    try {
        const { fromDate, toDate } = req.body;
        if (fromDate && toDate) {
            const token = cache.get("default_token") || (await fetchToken()).apiKey;
            const payload = { "c2Code": "P00000", "storeId": "001", "prodCode": "02", "apiKey": token, "fromDate": fromDate, "toDate": toDate };
            const apiRes = await axios.post("http://117.211.64.158:21000/ws_c2_services_po_fetch", payload, {responseType: 'text', timeout: 30000});
            const parsedList = parseConcatenatedJson(apiRes.data);
            return res.status(200).json({ data: parsedList, lastUpdated: new Date().toISOString() });
        }
        res.status(200).json({ data: db.po, lastUpdated: lastUpdated.po });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getOrderStatus = async (req, res) => {
    try {
        const { order_no } = req.query;
        if (order_no) {
             const token = cache.get("default_token") || (await fetchToken()).apiKey;
             const apiRes = await axios.get(`http://117.211.64.158:21000/ws_c2_services_sale_order_status?order_no=${order_no}&apikey=${token}`, {timeout: 10000});
             return res.status(200).json({ data: apiRes.data.invoices ? [apiRes.data] : [], lastUpdated: new Date().toISOString() });
        }
        res.status(200).json({ data: db.orderStatus, lastUpdated: lastUpdated.orderStatus });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getWebhooks = async (req, res) => {
    res.status(200).json({ data: db.webhooks, lastUpdated: lastUpdated.webhooks });
};
