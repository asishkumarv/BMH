const fs = require('fs');
const data = fs.readFileSync("raw_sales_data.txt", "utf8");
console.log("Characters around 53642:");
console.log(data.substring(53642 - 100, 53642 + 200));
