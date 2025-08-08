const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticate } = require('../middleware/auth');

// Search clients by email
router.get('/search', authenticate, async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ error: 'Email parameter is required' });
    }

    console.log('DEBUG: Searching for email:', email);

    const result = await query(
      'SELECT id, name, email, phone, created_at FROM clients WHERE email ILIKE $1 AND is_active = true ORDER BY created_at DESC',
      [`%${email}%`]
    );

    console.log('DEBUG: Search results:', result.rows);

    // Debug: Also check if there are any forms for this email
    if (result.rows.length > 0) {
      for (const client of result.rows) {
        const formsCheck = await query(
          'SELECT COUNT(*) as form_count FROM forms WHERE client_id = $1',
          [client.id]
        );
        console.log(`DEBUG: Client ${client.id} (${client.email}) has ${formsCheck.rows[0].form_count} forms`);
      }
    }

    res.json({ clients: result.rows });
  } catch (error) {
    console.error('Error searching clients:', error);
    res.status(500).json({ error: 'Failed to search clients' });
  }
});

// Get last closeout date for a client
router.get('/:clientId/last-closeout', authenticate, async (req, res) => {
  try {
    const { clientId } = req.params;
    
    // Debug: First check if the client exists
    const clientCheck = await query(
      'SELECT id, name, email FROM clients WHERE id = $1',
      [clientId]
    );
    
    console.log('DEBUG: Client check result:', clientCheck.rows);
    
    // Debug: Check all forms to see what client_ids exist
    const allForms = await query(
      'SELECT id, client_id, created_at FROM forms ORDER BY created_at DESC LIMIT 5'
    );
    
    console.log('DEBUG: Recent forms:', allForms.rows);
    
    const result = await query(
      `SELECT created_at 
       FROM forms 
       WHERE client_id = $1 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [clientId]
    );

    console.log('DEBUG: Forms for client_id', clientId, ':', result.rows);

    if (result.rows.length > 0) {
      res.json({ 
        lastCloseoutDate: result.rows[0].created_at,
        debug: {
          clientFound: clientCheck.rows.length > 0,
          clientData: clientCheck.rows[0] || null,
          formsFound: result.rows.length,
          recentForms: allForms.rows
        }
      });
    } else {
      res.json({ 
        lastCloseoutDate: null,
        debug: {
          clientFound: clientCheck.rows.length > 0,
          clientData: clientCheck.rows[0] || null,
          formsFound: 0,
          recentForms: allForms.rows
        }
      });
    }
  } catch (error) {
    console.error('Error fetching last closeout date:', error);
    res.status(500).json({ error: 'Failed to fetch last closeout date' });
  }
});

// Get all clients
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, name, email, phone, created_at FROM clients WHERE is_active = true ORDER BY created_at DESC'
    );
    res.json({ clients: result.rows });
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

// Create new client
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    // Check if client already exists
    const existingClient = await query(
      'SELECT id FROM clients WHERE email = $1 AND is_active = true',
      [email]
    );

    if (existingClient.rows.length > 0) {
      return res.status(409).json({ error: 'Client with this email already exists' });
    }

    const result = await query(
      'INSERT INTO clients (name, email, phone, is_active, created_at, updated_at) VALUES ($1, $2, $3, true, NOW(), NOW()) RETURNING id, name, email, phone, created_at',
      [name, email, phone || null]
    );

    res.status(201).json({ client: result.rows[0] });
  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json({ error: 'Failed to create client' });
  }
});

module.exports = router;