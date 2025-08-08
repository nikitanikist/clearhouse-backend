const https = require('https');

// Test login with proper error handling
const testLogin = (email, password) => {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ email, password });
    
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length
      }
    };

    const req = require('http').request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({ status: res.statusCode, data: response });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.write(postData);
    req.end();
  });
};

(async () => {
  console.log('Testing login endpoints...\n');
  
  const credentials = [
    { email: 'admin@clearhouse.ca', password: 'admin123' },
    { email: 'admin.user@clearhouse.ca', password: 'admin123' },
    { email: 'preparer@clearhouse.ca', password: 'preparer123' },
    { email: 'admin@clearhouse.ca', password: 'wrong-password' }
  ];
  
  for (const cred of credentials) {
    try {
      const result = await testLogin(cred.email, cred.password);
      console.log(`${cred.email} with "${cred.password}":`);
      console.log(`Status: ${result.status}`);
      if (result.status === 200) {
        console.log('✅ SUCCESS - Token received');
        console.log(`User: ${result.data.user.name} (${result.data.user.role})`);
      } else {
        console.log('❌ FAILED');
        console.log(`Error: ${result.data.error || result.data}`);
      }
      console.log('');
    } catch (error) {
      console.log(`❌ ERROR testing ${cred.email}: ${error.message}\n`);
    }
  }
})();
