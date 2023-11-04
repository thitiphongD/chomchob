const db = require('../db');
const { v4: uuidv4 } = require('uuid');

exports.hiTransfer = (req, res) => {
    res.send('Hi Transfer!');
};

const getUserDataWithCurrency = async (userId, currencyId) => {
    const query = `SELECT u.id AS user_id, u.username, u.email, u.balance AS user_balance, 
        c.id AS currency_id, c.symbol, er.rate_value, 
        uw.id AS wallet_id, uw.balance AS currency_balance
        FROM users u
        LEFT JOIN user_wallets uw ON u.id = uw.user_id
        LEFT JOIN currency c ON c.id = uw.currency_id
        LEFT JOIN exchange_rates er ON er.currency_id = c.id
        WHERE u.id = ? AND c.id = ?`;
    try {
        const result = await db.query(query, [userId, currencyId]);
        return result[0];
    } catch (error) {
        console.error('Error fetching user data:', error);
        throw new Error('Error fetching user data');
    }
};

const getExchangeRate = async (currencyId) => {
    try {
        const exchangeRateQuery = 'SELECT usd_exchange_rate, rate_value FROM exchange_rates WHERE currency_id = ?';
        const exchangeRateResult = await db.query(exchangeRateQuery, [currencyId]);
        return exchangeRateResult[0];
    } catch (error) {
        console.error('Error fetching exchange rate:', error);
        throw new Error('Error fetching exchange rate');
    }
};

exports.transferCurrency = async (req, res) => {
    try {
        const { sender_id, currency_id, amount, receiver_id } = req.body;
        const transactionId = uuidv4();

        const resultSender = await getUserDataWithCurrency(sender_id, currency_id);
        const dataSender = resultSender ? resultSender : null;

        const resultReceiver = await getUserDataWithCurrency(receiver_id, currency_id);
        const dataReceiver = resultReceiver ? resultReceiver : null;

        const exchangeRate = await getExchangeRate(currency_id);
        const usdExchangeRate = exchangeRate ? parseFloat(exchangeRate.usd_exchange_rate) : 0;
        const rateValue = exchangeRate ? parseFloat(exchangeRate.rate_value) : 0;

        console.log('resultSender', dataSender);
        console.log('resultReceiver', dataReceiver);

        console.log('usdExchangeRate', usdExchangeRate);
        console.log('rateValue', rateValue);

        return res.status(200).json({
            dataSender: dataSender,
            dataReceiver: dataReceiver
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            error: 'Internal server error'
        });
    }
};



// const updatedUserSenderBalance = dataSender.user_balance - amount;
// const updatedUserReceiverBalance = dataReceiver.user_balance + amount;

// console.log('updatedUserSenderBalance', updatedUserSenderBalance);
// console.log('updatedUserReceiverBalance', updatedUserReceiverBalance);

// await db.query('UPDATE user_wallets SET balance = ? WHERE id = ? AND currency_id = ?', [updatedSenderBalance, dataSender.wallet_id, currency_id]);
// await db.query('UPDATE user_wallets SET balance = ? WHERE id = ? AND currency_id = ?', [updatedReceiverBalance, dataReceiver.wallet_id, currency_id]);

// await db.query('INSERT INTO users_transaction (id, sender_id, receiver_id, currency_id, wallet_sender_id, wallet_receiver_id, amount) VALUES (?, ?, ?, ?, ?, ?, ?)',
//     [transactionId, sender_id, receiver_id, currency_id, dataSender.wallet_id, dataReceiver.wallet_id, amount]);