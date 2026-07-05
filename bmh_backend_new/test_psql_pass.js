const { execSync } = require('child_process');

try {
  process.env.PGPASSWORD = 'postgres'; // or whatever default is
  const result = execSync('psql -U postgres -d bmh -c "SELECT 1"', { encoding: 'utf-8' });
  console.log("Success with 'postgres':", result);
} catch (e) {
  console.log("Failed with 'postgres'");
  try {
    process.env.PGPASSWORD = 'StrivenestBMHPassword7869';
    const result2 = execSync('psql -U postgres -d bmh -c "SELECT 1"', { encoding: 'utf-8' });
    console.log("Success with 'StrivenestBMHPassword7869':", result2);
  } catch (e2) {
    console.log("Failed with both passwords.");
  }
}
