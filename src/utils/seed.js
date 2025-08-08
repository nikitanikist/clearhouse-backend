// src/utils/seed.js
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const logger = require('./logger');

const seedDatabase = async () => {
  try {
    logger.info('Starting database seed...');

    // Check if admin user already exists
    const adminCheck = await query(
      'SELECT id FROM users WHERE email = $1',
      ['admin@clearhouse.ca']
    );

    if (adminCheck.rows.length === 0) {
      // Create admin user
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);

      await query(
        `INSERT INTO users (email, password_hash, name, role) 
         VALUES ($1, $2, $3, $4)`,
        ['admin@clearhouse.ca', hashedPassword, 'System Admin', 'superadmin']
      );
      logger.info('Created admin user: admin@clearhouse.ca (password: admin123)');
    } else {
      logger.info('Admin user already exists');
    }

    // Create demo preparer and admin users
    const demoUsers = [
      {
        email: 'preparer@clearhouse.ca',
        password: 'preparer123',
        name: 'Demo Preparer',
        role: 'preparer'
      },
      {
        email: 'admin.user@clearhouse.ca',
        password: 'admin123',
        name: 'Demo Admin',
        role: 'admin'
      }
    ];

    for (const user of demoUsers) {
      const userCheck = await query(
        'SELECT id FROM users WHERE email = $1',
        [user.email]
      );

      if (userCheck.rows.length === 0) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(user.password, salt);

        await query(
          `INSERT INTO users (email, password_hash, name, role) 
           VALUES ($1, $2, $3, $4)`,
          [user.email, hashedPassword, user.name, user.role]
        );
        logger.info(`Created ${user.role} user: ${user.email}`);
      }
    }

    // Create demo clients
    const demoClients = [
      { name: 'John Smith', email: 'john.smith@example.com' },
      { name: 'Sarah Johnson', email: 'sarah.johnson@example.com' },
      { name: 'Michael Brown', email: 'michael.brown@example.com' },
      { name: 'Emily Davis', email: 'emily.davis@example.com' },
      { name: 'Robert Wilson', email: 'robert.wilson@example.com' }
    ];

    for (const client of demoClients) {
      const clientCheck = await query(
        'SELECT id FROM clients WHERE email = $1',
        [client.email]
      );

      if (clientCheck.rows.length === 0) {
        await query(
          `INSERT INTO clients (name, email) VALUES ($1, $2)`,
          [client.name, client.email]
        );
        logger.info(`Created client: ${client.name}`);
      }
    }

    logger.info('Database seed completed successfully!');
    logger.info('\nYou can now login with:');
    logger.info('Super Admin: admin@clearhouse.ca / admin123');
    logger.info('Admin: admin.user@clearhouse.ca / admin123');
    logger.info('Preparer: preparer@clearhouse.ca / preparer123');
    
    process.exit(0);
  } catch (error) {
    logger.error('Seed error:', error);
    process.exit(1);
  }
};

// Run seed
seedDatabase();