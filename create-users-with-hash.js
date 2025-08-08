const bcrypt = require('bcryptjs');
const { query } = require('./src/config/database');

async function createUsers() {
  try {
    console.log('Creating users...');

    // Hash passwords
    const nikitaHash = await bcrypt.hash('Nikita@123', 10);
    const amitHash = await bcrypt.hash('Amit@123', 10);
    const madhurHash = await bcrypt.hash('Madhur@123', 10);

    // Check if users already exist
    const existingUsers = await query('SELECT email FROM users WHERE email IN ($1, $2, $3)', [
      'nikita@gmail.com',
      'amit@123',
      'madhur@gmail.com'
    ]);

    if (existingUsers.rows.length > 0) {
      console.log('Some users already exist. Skipping creation.');
      return;
    }

    // Create users
    await query(`
      INSERT INTO users (email, password_hash, name, role, is_active) 
      VALUES ($1, $2, $3, $4, $5)
    `, ['nikita@gmail.com', nikitaHash, 'Nikita', 'preparer', true]);

    await query(`
      INSERT INTO users (email, password_hash, name, role, is_active) 
      VALUES ($1, $2, $3, $4, $5)
    `, ['amit@123', amitHash, 'Amit', 'admin', true]);

    await query(`
      INSERT INTO users (email, password_hash, name, role, is_active) 
      VALUES ($1, $2, $3, $4, $5)
    `, ['madhur@gmail.com', madhurHash, 'Madhur Trika', 'superadmin', true]);

    console.log('Users created successfully!');
    
    // Verify users
    const users = await query('SELECT id, email, name, role, created_at FROM users ORDER BY role');
    console.log('\nCreated users:');
    users.rows.forEach(user => {
      console.log(`- ${user.name} (${user.email}) - ${user.role}`);
    });

  } catch (error) {
    console.error('Error creating users:', error);
  } finally {
    process.exit(0);
  }
}

createUsers(); 