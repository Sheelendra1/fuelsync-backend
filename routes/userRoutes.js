const express = require('express');
const router = express.Router();
const {
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  getTopCustomers
} = require('../controllers/userController');
const { protect, admin } = require('../middleware/auth');

router.get('/customers', protect, admin, getCustomers);
router.get('/top-customers', protect, admin, getTopCustomers);
router.route('/:id')
  .get(protect, admin, getCustomerById)
  .put(protect, admin, updateCustomer)
  .delete(protect, admin, deleteCustomer);

module.exports = router;