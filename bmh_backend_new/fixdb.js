const pool = require('./db');
Promise.all([
pool.query("UPDATE attendance SET image_url = REPLACE(image_url, 'data:image/jpeg;base64,data:', 'data:') WHERE image_url LIKE 'data:image/jpeg;base64,data:%'"),
pool.query("UPDATE attendance SET checkout_image_url = REPLACE(checkout_image_url, 'data:image/jpeg;base64,data:', 'data:') WHERE checkout_image_url LIKE 'data:image/jpeg;base64,data:%'"),
pool.query("UPDATE break_logs SET image_url = REPLACE(image_url, 'data:image/jpeg;base64,data:', 'data:') WHERE image_url LIKE 'data:image/jpeg;base64,data:%'")
]).then(() => { console.log('Fixed DB URLs'); process.exit(0); }).catch(e => { console.error(e); process.exit(1); })
