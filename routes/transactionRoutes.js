const express = require('express');
const router = express.Router();
const {
  createTransaction,
  getTransactions,
  getMyTransactions,
  getTransactionById,
  getCustomersForTransaction
} = require('../controllers/transactionController');
const { protect, admin } = require('../middleware/auth');

router.route('/')
  .post(protect, admin, createTransaction)
  .get(protect, admin, getTransactions);

router.get('/customers', protect, admin, getCustomersForTransaction);
router.get('/my-transactions', protect, getMyTransactions);
router.get('/:id', protect, getTransactionById);

module.exports = router;