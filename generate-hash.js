const bcrypt = require('bcryptjs');

(async () => {
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash('admin123', salt);
  console.log('Proper bcrypt hash for "admin123":', hash);
})();
