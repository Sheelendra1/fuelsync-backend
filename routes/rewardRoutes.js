const express = require('express');
const router = express.Router();
const {
  createRedemption,
  getRedemptions,
  getMyRedemptions,
  updateRedemptionStatus,
  getCustomerApprovedRedemptions
} = require('../controllers/rewardController');
const { protect, admin } = require('../middleware/auth');

router.post('/redeem', protect, createRedemption);
router.get('/', protect, admin, getRedemptions);
router.get('/my-redemptions', protect, getMyRedemptions);
router.put('/:id/status', protect, admin, updateRedemptionStatus);
router.get('/customer/:customerId/approved', protect, admin, getCustomerApprovedRedemptions);

module.exports = router;