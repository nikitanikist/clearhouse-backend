require('dotenv').config();
const { query } = require('./src/config/database');
const bcrypt = require('bcryptjs');

(async () => {
  try {
    const result = await query('SELECT email, password_hash FROM users WHERE email = $1', ['admin@clearhouse.ca']);
    console.log('User found:', result.rows[0].email);
    console.log('Password hash length:', result.rows[0].password_hash.length);
    
    const isValid = await bcrypt.compare('admin123', result.rows[0].password_hash);
    console.log('Password "admin123" is valid:', isValid);
    
    // Test with other users too
    const allUsers = await query('SELECT email, password_hash FROM users');
    for (const user of allUsers.rows) {
      let testPassword = '';
      if (user.email === 'admin@clearhouse.ca') testPassword = 'admin123';
      else if (user.email === 'admin.user@clearhouse.ca') testPassword = 'admin123';
      else if (user.email === 'preparer@clearhouse.ca') testPassword = 'preparer123';
      
      const valid = await bcrypt.compare(testPassword, user.password_hash);
      console.log(`${user.email} with password "${testPassword}": ${valid}`);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
