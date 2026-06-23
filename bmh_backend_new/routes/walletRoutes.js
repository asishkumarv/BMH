const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');

router.get('/', walletController.getAllWallets); // Admin view all
router.get('/:employee_id', walletController.getWallet); // Employee view own

router.post('/request', walletController.requestAllocation); // Employee requests money
router.post('/allocate', walletController.allocateMoney); // Admin allocates money

router.put('/transaction/:id', walletController.approveTransaction); // Admin approves request OR Employee accepts allocation

router.post('/usage', walletController.logUsage); // Employee logs usage

module.exports = router;
