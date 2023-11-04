const express = require('express');
const router = express.Router();
const mainController = require('../controllers/mainControllers')

router.get('/v1', mainController.getHello);

module.exports = router;