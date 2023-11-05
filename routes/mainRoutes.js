const express = require('express');
const router = express.Router();
const mainController = require('../controllers/mainControllers');
const userController = require('../controllers/userControllers');
const transferController = require('../controllers/transferControllers');

router.get('/v1', mainController.getHello);
router.get('/testDb', mainController.testDb);

router.get('/hiUser', userController.hiUser);
router.post('/create-user', userController.createUser);

router.get('/hiTransfer', transferController.hiTransfer);
router.post('/transfer', transferController.transferCurrency);
router.post('/transfer-between-currency', transferController.transferDifferenceCurrency);
router.get('/total-balance-currency', transferController.getTotalBalanceCurrency);
router.put('/increase-balance', transferController.increaseBalance);
router.put('/decrease-balance', transferController.decreaseBalance);
router.post('/create-currency', transferController.createCurrency);
router.put('/update-exchange-rate', transferController.updateExchangeRate);


module.exports = router;