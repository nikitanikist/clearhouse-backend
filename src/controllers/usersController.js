const { query } = require('../config/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// GET /api/users - Only for superadmin
const getAllUsers = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const result = await query(
      'SELECT id, name, email, role, is_active, created_at FROM users ORDER BY created_at DESC'
    );
    res.json({ users: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// GET /api/admins - Get all admin users for form assignment
const getAdmins = async (req, res) => {
  try {
    const result = await query(
      'SELECT id, name, email, role FROM users WHERE role = $1 AND is_active = $2 ORDER BY name',
      ['admin', true]
    );
    res.json({ admins: result.rows });
  } catch (error) {
    console.error('Error fetching admins:', error);
    res.status(500).json({ error: 'Failed to fetch admins' });
  }
};

// POST /api/users - Create new user (superadmin only)
const createUser = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { name, email, password, role } = req.body;

    // Validate required fields
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Name, email, password, and role are required' });
    }

    // Validate role
    const validRoles = ['preparer', 'admin', 'superadmin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be preparer, admin, or superadmin' });
    }

    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1 AND is_active = true',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    // Create user
    const result = await query(
      'INSERT INTO users (id, name, email, password_hash, role, is_active, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING id, name, email, role, is_active, created_at',
      [userId, name, email, hashedPassword, role, req.body.is_active !== undefined ? req.body.is_active : true]
    );

    res.status(201).json({ user: result.rows[0] });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
};

// DELETE /api/users/:id - Delete user (superadmin only)
const deleteUser = async (req, res) => {
  console.log('DEBUG: Delete user request received:', { 
    userId: req.user?.id, 
    userRole: req.user?.role, 
    targetId: req.params.id 
  });
  
  try {
    if (!req.user || req.user.role !== 'superadmin') {
      console.log('DEBUG: Access denied - not superadmin');
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { id } = req.params;
    console.log('DEBUG: Attempting to delete user with ID:', id);

    // Validate user ID
    if (!id) {
      console.log('DEBUG: No user ID provided');
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Check if user exists and is not the current user
    const existingUser = await query(
      'SELECT id, name, email, role FROM users WHERE id = $1',
      [id]
    );

    console.log('DEBUG: Existing user check result:', existingUser.rows);

    if (existingUser.rows.length === 0) {
      console.log('DEBUG: User not found');
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent deleting yourself
    if (id === req.user.id) {
      console.log('DEBUG: Attempted to delete own account');
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Hard delete - completely remove user from database
    console.log('DEBUG: Performing hard delete for user:', id);
    const deleteResult = await query(
      'DELETE FROM users WHERE id = $1 RETURNING id, name, email',
      [id]
    );

    console.log('DEBUG: Delete result:', deleteResult.rows);
    console.log('DEBUG: Rows affected:', deleteResult.rowCount);

    if (deleteResult.rowCount === 0) {
      console.log('DEBUG: No rows were deleted - user may not exist');
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('DEBUG: User permanently deleted successfully');
    res.json({ message: 'User permanently deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

// PUT /api/users/:id - Update user (superadmin only)
const updateUser = async (req, res) => {
  console.log('DEBUG: Update user request received:', { 
    userId: req.user?.id, 
    userRole: req.user?.role, 
    targetId: req.params.id 
  });
  
  try {
    if (!req.user || req.user.role !== 'superadmin') {
      console.log('DEBUG: Access denied - not superadmin');
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { id } = req.params;
    const { name, email, password, role, is_active } = req.body;
    
    console.log('DEBUG: Attempting to update user with ID:', id);
    console.log('DEBUG: Update data:', { name, email, role, is_active, hasPassword: !!password });

    // Validate user ID
    if (!id) {
      console.log('DEBUG: No user ID provided');
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Validate required fields
    if (!name || !email || !role) {
      return res.status(400).json({ error: 'Name, email, and role are required' });
    }

    // Validate role
    const validRoles = ['preparer', 'admin', 'superadmin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be preparer, admin, or superadmin' });
    }

    // Check if user exists
    const existingUser = await query(
      'SELECT id, name, email, role, is_active FROM users WHERE id = $1',
      [id]
    );

    console.log('DEBUG: Existing user check result:', existingUser.rows);

    if (existingUser.rows.length === 0) {
      console.log('DEBUG: User not found');
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if email is already taken by another user
    const emailCheck = await query(
      'SELECT id FROM users WHERE email = $1 AND id != $2',
      [email, id]
    );

    if (emailCheck.rows.length > 0) {
      return res.status(409).json({ error: 'Email is already taken by another user' });
    }

    // Build update query
    let updateQuery = 'UPDATE users SET name = $1, email = $2, role = $3, is_active = $4, updated_at = NOW()';
    let queryParams = [name, email, role, is_active, id];
    let paramIndex = 5;

    // Add password update if provided
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateQuery += `, password_hash = $${paramIndex}`;
      queryParams.splice(paramIndex - 1, 0, hashedPassword);
      paramIndex++;
    }

    updateQuery += ` WHERE id = $${paramIndex} RETURNING id, name, email, role, is_active, created_at`;

    console.log('DEBUG: Performing update for user:', id);
    const updateResult = await query(updateQuery, queryParams);

    console.log('DEBUG: Update result:', updateResult.rows);
    console.log('DEBUG: Rows affected:', updateResult.rowCount);

    if (updateResult.rowCount === 0) {
      console.log('DEBUG: No rows were updated');
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('DEBUG: User updated successfully');
    res.json({ user: updateResult.rows[0] });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

// PUT /api/users/profile - Update own profile (any authenticated user)
const updateProfile = async (req, res) => {
  console.log('DEBUG: Update profile request received:', { 
    userId: req.user?.id, 
    userRole: req.user?.role
  });
  
  try {
    const { name, email, phone, department, bio, password } = req.body;
    
    console.log('DEBUG: Attempting to update profile for user:', req.user.id);
    console.log('DEBUG: Update data:', { name, email, phone, department, bio, hasPassword: !!password });

    // Validate required fields
    if (!name || !email || !phone) {
      return res.status(400).json({ error: 'Name, email, and phone number are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address' });
    }

    // Check if email is already taken by another user
    const emailCheck = await query(
      'SELECT id FROM users WHERE email = $1 AND id != $2',
      [email, req.user.id]
    );

    if (emailCheck.rows.length > 0) {
      return res.status(409).json({ error: 'Email is already taken by another user' });
    }

    // Build update query
    let updateQuery = 'UPDATE users SET name = $1, email = $2, phone = $3, department = $4, bio = $5, updated_at = NOW()';
    let queryParams = [name, email, phone || '', department || '', bio || '', req.user.id];
    let paramIndex = 6;

    // Add password update if provided
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateQuery += `, password_hash = $${paramIndex}`;
      queryParams.splice(paramIndex - 1, 0, hashedPassword);
      paramIndex++;
    }

    updateQuery += ` WHERE id = $${paramIndex} RETURNING id, name, email, phone, department, bio, avatar, role, is_active, created_at`;

    console.log('DEBUG: Performing profile update for user:', req.user.id);
    const updateResult = await query(updateQuery, queryParams);

    console.log('DEBUG: Update result:', updateResult.rows);
    console.log('DEBUG: Rows affected:', updateResult.rowCount);

    if (updateResult.rowCount === 0) {
      console.log('DEBUG: No rows were updated');
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('DEBUG: Profile updated successfully');
    res.json({ user: updateResult.rows[0] });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

module.exports = { getAllUsers, getAdmins, createUser, deleteUser, updateUser, updateProfile }; 