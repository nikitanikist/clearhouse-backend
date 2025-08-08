const fetch = require('node-fetch');

async function testRoleValidation() {
  const baseUrl = 'http://localhost:5005/api';
  
  console.log('Testing role validation...\n');

  // Test 1: Amit (admin) trying to login as preparer
  console.log('Test 1: Amit (admin) trying to login as preparer');
  try {
    const response = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'amit@gmail.com',
        password: 'Amit@123',
        requestedRole: 'preparer'
      }),
    });

    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', data);
    console.log('---\n');
  } catch (error) {
    console.error('Error:', error.message);
  }

  // Test 2: Amit (admin) logging in as admin (should succeed)
  console.log('Test 2: Amit (admin) logging in as admin');
  try {
    const response = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'amit@gmail.com',
        password: 'Amit@123',
        requestedRole: 'admin'
      }),
    });

    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', data);
    console.log('---\n');
  } catch (error) {
    console.error('Error:', error.message);
  }

  // Test 3: Nikita (preparer) trying to login as admin
  console.log('Test 3: Nikita (preparer) trying to login as admin');
  try {
    const response = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'nikita@gmail.com',
        password: 'Nikita@123',
        requestedRole: 'admin'
      }),
    });

    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', data);
    console.log('---\n');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testRoleValidation(); 