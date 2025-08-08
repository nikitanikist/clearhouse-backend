const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

// Import the controller
const formsController = require('../controllers/formsController');

// Real GET route for fetching all forms
router.get('/', authenticate, formsController.getAllForms);

// POST route for creating a form
router.post('/', authenticate, formsController.createForm);

// GET route for fetching admin users for reassignment
router.get('/admin-users', authenticate, formsController.getAdminUsers);

// PUT route for reassigning a form
router.put('/:formId/reassign', authenticate, formsController.reassignForm);

// PUT route for updating form status (including amendment requests)
router.put('/:formId/status', authenticate, formsController.updateFormStatus);

// PUT route for updating form data
router.put('/:formId', authenticate, formsController.updateForm);

module.exports = router;