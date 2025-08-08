const express = require('express');
const router = express.Router();
const { getAllUsers, getAdmins, createUser, deleteUser, updateUser, updateProfile } = require('../controllers/usersController');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, getAllUsers);
router.get('/admins', authenticate, getAdmins);
router.post('/', authenticate, createUser);
router.put('/profile', authenticate, updateProfile); // Profile route must come before /:id
router.put('/:id', authenticate, updateUser);
router.delete('/:id', authenticate, deleteUser);

module.exports = router;