const { Pool } = require('pg');

// Direct database connection
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'clearhouse_crm',
  user: 'postgres',
  password: 'BalanceSheet',
});

async function updateAmitEmail() {
  try {
    console.log('Updating Amit\'s email...');

    // Update Amit's email
    const result = await pool.query(`
      UPDATE users 
      SET email = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE name = 'Amit' AND email = 'amit@123'
    `, ['amit@gmail.com']);

    if (result.rowCount > 0) {
      console.log('✅ Amit\'s email updated successfully!');
      console.log('Old email: amit@123');
      console.log('New email: amit@gmail.com');
    } else {
      console.log('❌ Amit not found or email already updated');
    }

    // Verify the update
    const user = await pool.query('SELECT email, name, role FROM users WHERE name = $1', ['Amit']);
    if (user.rows.length > 0) {
      console.log('\nUpdated user details:');
      console.log(`- ${user.rows[0].name} (${user.rows[0].email}) - ${user.rows[0].role}`);
    }

  } catch (error) {
    console.error('Error updating email:', error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

updateAmitEmail(); 