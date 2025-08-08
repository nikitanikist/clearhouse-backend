require('dotenv').config();
const { query } = require('./src/config/database');
const bcrypt = require('bcryptjs');

(async () => {
  try {
    console.log('=== AUTHENTICATION TROUBLESHOOTING ===\n');
    
    // Get all users
    const users = await query('SELECT email, role, is_active, password_hash FROM users');
    console.log('All users in database:');
    users.rows.forEach(user => {
      console.log(`- Email: ${user.email}`);
      console.log(`  Role: ${user.role}`);
      console.log(`  Active: ${user.is_active}`);
      console.log(`  Hash length: ${user.password_hash.length}`);
      console.log('');
    });
    
    // Test passwords for each user
    console.log('Testing passwords:');
    
    const testCreds = [
      { email: 'admin@clearhouse.ca', password: 'admin123' },
      { email: 'admin.user@clearhouse.ca', password: 'admin123' },
      { email: 'preparer@clearhouse.ca', password: 'preparer123' }
    ];
    
    for (const cred of testCreds) {
      const userResult = await query('SELECT password_hash, is_active FROM users WHERE email = $1', [cred.email]);
      if (userResult.rows.length > 0) {
        const user = userResult.rows[0];
        const isValid = await bcrypt.compare(cred.password, user.password_hash);
        console.log(`${cred.email} with "${cred.password}": ${isValid ? '✅ VALID' : '❌ INVALID'} (Active: ${user.is_active})`);
      } else {
        console.log(`${cred.email}: ❌ USER NOT FOUND`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
