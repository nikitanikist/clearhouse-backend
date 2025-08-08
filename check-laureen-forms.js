const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function checkLaureenForms() {
  try {
    console.log('Checking forms assigned to Laureen...\n');

    // First, get Laureen's user ID
    const laureenResult = await pool.query(
      'SELECT id, name, email, role FROM users WHERE email = $1',
      ['Laureen@clearhouse.ca']
    );

    if (laureenResult.rows.length === 0) {
      console.log('❌ Laureen user not found in database');
      return;
    }

    const laureen = laureenResult.rows[0];
    console.log(`✅ Found Laureen: ${laureen.name} (${laureen.email}) - Role: ${laureen.role}`);
    console.log(`   User ID: ${laureen.id}\n`);

    // Check how many forms are assigned to Laureen
    const formsAssignedToLaureen = await pool.query(
      'SELECT COUNT(*) as count FROM forms WHERE assigned_to = $1',
      [laureen.id]
    );

    console.log(`📊 Forms assigned to Laureen: ${formsAssignedToLaureen.rows[0].count}`);

    // Get details of forms assigned to Laureen
    const laureenForms = await pool.query(`
      SELECT f.id, f.form_number, f.status, f.created_at, c.name as client_name, c.email as client_email
      FROM forms f
      LEFT JOIN clients c ON f.client_id = c.id
      WHERE f.assigned_to = $1
      ORDER BY f.created_at DESC
    `, [laureen.id]);

    if (laureenForms.rows.length > 0) {
      console.log('\n📋 Forms assigned to Laureen:');
      laureenForms.rows.forEach((form, index) => {
        console.log(`   ${index + 1}. ${form.form_number} - ${form.client_name} (${form.client_email}) - Status: ${form.status} - Created: ${form.created_at}`);
      });
    } else {
      console.log('\n❌ No forms are currently assigned to Laureen');
    }

    // Check total forms in database
    const totalForms = await pool.query('SELECT COUNT(*) as count FROM forms');
    console.log(`\n📊 Total forms in database: ${totalForms.rows[0].count}`);

    // Check forms with null assigned_to
    const nullAssignedForms = await pool.query('SELECT COUNT(*) as count FROM forms WHERE assigned_to IS NULL');
    console.log(`📊 Forms with no assignment (assigned_to = NULL): ${nullAssignedForms.rows[0].count}`);

    // Show all form assignments
    const allFormAssignments = await pool.query(`
      SELECT f.id, f.form_number, f.assigned_to, u.name as assigned_to_name, u.email as assigned_to_email, c.name as client_name
      FROM forms f
      LEFT JOIN users u ON f.assigned_to = u.id
      LEFT JOIN clients c ON f.client_id = c.id
      ORDER BY f.created_at DESC
    `);

    console.log('\n📋 All form assignments:');
    allFormAssignments.rows.forEach((form, index) => {
      const assignment = form.assigned_to_name 
        ? `${form.assigned_to_name} (${form.assigned_to_email})`
        : 'NULL (No assignment)';
      console.log(`   ${index + 1}. ${form.form_number} - ${form.client_name} - Assigned to: ${assignment}`);
    });

  } catch (error) {
    console.error('Error checking Laureen forms:', error);
  } finally {
    await pool.end();
  }
}

checkLaureenForms(); 