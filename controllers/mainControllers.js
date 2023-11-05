const db = require('../db');
const { v4: uuidv4 } = require('uuid');

exports.getHello = (req, res) => {
    res.send('Hi Bro!');
};

exports.testDb = async (req, res) => {
    try {
        const result = await db.query("select * from currency");
        res.send(result);
    } catch (err) {
        throw err;
    }
}
