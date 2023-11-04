const db = require('../db');
const { v4: uuidv4 } = require('uuid');

exports.hiUser = (req, res) => {
    res.send('Hi User!');
};

exports.createUser = async (req, res) => {
    try {
        const { username, email, password, role } = req.body;
        const userId = uuidv4();

        const insertUser = 'INSERT INTO users (id, username, email, password, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)';
        await db.query(insertUser, [userId, username, email, password, role]);

        const getCurrenciesQuery = 'SELECT id FROM currency';
        const currencies = await db.query(getCurrenciesQuery);

        for (const currency of currencies) {
            const walletId = uuidv4();
            const currencyId = currency.id;

            const insertUserWallets = 'INSERT INTO user_wallets (id, user_id, currency_id, balance, createdAt, updatedAt) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)';
            await db.query(insertUserWallets, [walletId, userId, currencyId, 0]);
        }

        return res.status(200).json({
            message: 'User and wallets created successfully',
            userId,
            username,
            email,
            password,
            role
        });
    } catch (error) {
        console.error('Error creating user:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};


