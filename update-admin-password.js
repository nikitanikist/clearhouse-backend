require('dotenv').config();
const { query } = require('./src/config/database');

(async () => {
  try {
    const newHash = '$2a$10$7zv2OU/Zo.BlX6ncmYakuupu0K0Xt5lbRbfx8gmm4OufbEVUGEJLC';
    await query('UPDATE users SET password_hash = $1 WHERE email = $2', [newHash, 'admin@clearhouse.ca']);
    console.log('Admin password updated successfully');
  } catch (error) {
    console.error('Error updating password:', error.message);
  }
})();
