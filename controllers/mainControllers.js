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

exports.createCurrency = async (req, res) => {

    const { name, symbol } = req.body;
    const id = uuidv4();

    const insertCurrency = 'INSERT INTO currency (id, name, symbol, createdAt, updatedAt) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)';
    db.query(insertCurrency, [id, name, symbol])
        .then(() => {
            res.status(200).json({ message: 'Currency created successfully', id, name, symbol });
        })
        .catch((error) => {
            console.error('Error creating currency:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        });
}