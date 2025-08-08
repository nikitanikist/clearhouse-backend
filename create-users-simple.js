const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

// Direct database connection (you can modify these values)
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'clearhouse_crm',
  user: 'postgres',
  password: 'BalanceSheet', // Your actual password
});

async function createUsers() {
  try {
    console.log('Creating users...');

    // Hash passwords
    const nikitaHash = await bcrypt.hash('Nikita@123', 10);
    const amitHash = await bcrypt.hash('Amit@123', 10);
    const madhurHash = await bcrypt.hash('Madhur@123', 10);

    // Check if users already exist
    const existingUsers = await pool.query('SELECT email FROM users WHERE email IN ($1, $2, $3)', [
      'nikita@gmail.com',
      'amit@123',
      'madhur@gmail.com'
    ]);

    if (existingUsers.rows.length > 0) {
      console.log('Some users already exist. Skipping creation.');
      console.log('Existing users:', existingUsers.rows.map(u => u.email));
      return;
    }

    // Create users
    await pool.query(`
      INSERT INTO users (email, password_hash, name, role, is_active) 
      VALUES ($1, $2, $3, $4, $5)
    `, ['nikita@gmail.com', nikitaHash, 'Nikita', 'preparer', true]);

    await pool.query(`
      INSERT INTO users (email, password_hash, name, role, is_active) 
      VALUES ($1, $2, $3, $4, $5)
    `, ['amit@123', amitHash, 'Amit', 'admin', true]);

    await pool.query(`
      INSERT INTO users (email, password_hash, name, role, is_active) 
      VALUES ($1, $2, $3, $4, $5)
    `, ['madhur@gmail.com', madhurHash, 'Madhur Trika', 'superadmin', true]);

    console.log('Users created successfully!');
    
    // Verify users
    const users = await pool.query('SELECT id, email, name, role, created_at FROM users ORDER BY role');
    console.log('\nCreated users:');
    users.rows.forEach(user => {
      console.log(`- ${user.name} (${user.email}) - ${user.role}`);
    });

  } catch (error) {
    console.error('Error creating users:', error.message);
    console.log('\nPlease check:');
    console.log('1. Is PostgreSQL running?');
    console.log('2. Is the database "clearhouse_crm" created?');
    console.log('3. Are the connection details correct?');
    console.log('4. Update the connection details in this script if needed');
  } finally {
    await pool.end();
    process.exit(0);
  }
}

createUsers(); 