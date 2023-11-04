const express = require('express');
const router = express.Router();
const mainController = require('../controllers/mainControllers');
const userController = require('../controllers/userControllers');
const transferController = require('../controllers/transferControllers');

router.get('/v1', mainController.getHello);
router.get('/testDb', mainController.testDb);
router.post('/create-currency', mainController.createCurrency);

router.get('/hiUser', userController.hiUser);
router.post('/create-user', userController.createUser);

router.get('/hiTransfer', transferController.hiTransfer);
router.post('/transfer', transferController.transferCurrency);

module.exports = router;