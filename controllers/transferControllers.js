const db = require('../db');
const { v4: uuidv4 } = require('uuid');

exports.hiTransfer = (req, res) => {
    res.send('Hi Transfer!');
};

const checkAdmin = async (userId) => {
    const checkAdminQuery = 'SELECT role FROM users WHERE id = ? AND role = "admin"';
    const result = await db.query(checkAdminQuery, [userId]);
    return result.length > 0;
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

const getExchangeBetweenRate = async (payCurrencyId, buyCurrencyId) => {
    try {
        const payCurrencyRate = await getExchangeRate(payCurrencyId);
        const buyCurrencyRate = await getExchangeRate(buyCurrencyId);

        console.log(`payCurrencyRate ${payCurrencyRate.usd_exchange_rate} : buyCurrencyRate ${buyCurrencyRate.usd_exchange_rate}`);
        return {
            payCurrencyRate: payCurrencyRate.usd_exchange_rate,
            buyCurrencyRate: buyCurrencyRate.usd_exchange_rate
        };
    } catch (error) {
        console.error('Error fetching exchange rate:', error);
        throw new Error('Error fetching exchange rate');
    }
};

const calculateCrypto = async (senderBalance, senderWallet, amount, exchangeRate, receiverBalance, receiverWallet) => {
    if (amount > senderBalance) {
        return "Sender Not enough money";
    } else if (amount / exchangeRate > receiverWallet) {
        return "Receiver Not enough coins";
    } else {
        const result = amount / exchangeRate;
        senderBalance -= amount;
        senderWallet += result;
        receiverBalance += amount;
        receiverWallet -= result;
        return {
            amountResult: result,
            senderBalance: senderBalance,
            senderWallet: senderWallet,
            receiverBalance: receiverBalance,
            receiverWallet: receiverWallet
        };
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

        const updatedBalances = await calculateCrypto(
            parseFloat(dataSender.user_balance),
            parseFloat(dataSender.currency_balance),
            amount,
            usdExchangeRate,
            parseFloat(dataReceiver.user_balance),
            parseFloat(dataReceiver.currency_balance)
        );

        await db.query('UPDATE users SET balance = ? WHERE id = ?', [updatedBalances.senderBalance, dataSender.user_id]);
        await db.query('UPDATE users SET balance = ? WHERE id = ?', [updatedBalances.receiverBalance, dataReceiver.user_id]);

        await db.query('UPDATE user_wallets SET balance = ? WHERE id = ? AND currency_id = ?', [updatedBalances.senderWallet, dataSender.wallet_id, currency_id]);
        await db.query('UPDATE user_wallets SET balance = ? WHERE id = ? AND currency_id = ?', [updatedBalances.receiverWallet, dataReceiver.wallet_id, currency_id]);

        await db.query('INSERT INTO users_transaction (id, sender_id, receiver_id, currency_id, receiver_currency_id, wallet_sender_id, wallet_receiver_id, amount, currency_balance, symbol, amount_symbol) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [transactionId, sender_id, receiver_id, currency_id, currency_id, dataSender.wallet_id, dataReceiver.wallet_id, amount, updatedBalances.amountResult, dataReceiver.symbol, 'USD']);

        const transaction = {
            transactionId: transactionId,
            sender_id: sender_id,
            receiver_id: receiver_id,
            currency_id: currency_id,
            amount: amount,
            currency: updatedBalances.amountResult,
            symbol: dataSender.symbol
        };

        return res.status(200).json({
            result: transaction
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            error: 'Internal server error'
        });
    }
};

exports.transferDifferenceCurrency = async (req, res) => {
    try {
        const { sender_id, pay_currency_id, amount, buy_currency_id, receiver_id } = req.body;
        const transactionId = uuidv4();
        if (pay_currency_id === buy_currency_id) {
            return res.status(400).json({
                error: 'Currency types are the same.'
            });
        }

        const resultSender = await getUserDataWithCurrency(sender_id, pay_currency_id);
        const dataSender = resultSender ? resultSender : null;

        const resultReceiver = await getUserDataWithCurrency(receiver_id, buy_currency_id);
        const dataReceiver = resultReceiver ? resultReceiver : null;

        const exchangeRates = await getExchangeBetweenRate(pay_currency_id, buy_currency_id);

        const amountToPay = amount * exchangeRates.payCurrencyRate;
        const amountToBuy = amountToPay / exchangeRates.buyCurrencyRate;

        const updatedSenderBalance = dataSender.currency_balance - amountToPay;
        const updatedReceiverBalance = dataReceiver.currency_balance + amountToBuy;

        await db.query('UPDATE user_wallets SET balance = ? WHERE id = ? AND currency_id = ?', [updatedSenderBalance, dataSender.wallet_id, pay_currency_id]);
        await db.query('UPDATE user_wallets SET balance = ? WHERE id = ? AND currency_id = ?', [updatedReceiverBalance, dataSender.wallet_id, buy_currency_id]);

        await db.query('INSERT INTO users_transaction (id, sender_id, receiver_id, currency_id, receiver_currency_id, wallet_sender_id, wallet_receiver_id, amount, currency_balance, symbol, amount_symbol) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [transactionId, sender_id, receiver_id, pay_currency_id, buy_currency_id, dataSender.wallet_id, dataReceiver.wallet_id, amount, amountToBuy, dataReceiver.symbol, dataSender.symbol]);
        // const transaction = {
        //     transactionId: transactionId,
        //     sender_id: sender_id,
        //     receiver_id: receiver_id,
        //     currency_id: currency_id,
        //     amount: amount,
        //     currency: updatedBalances.amountResult,
        //     symbol: dataSender.symbol
        // };

        return res.status(200).json({
            dataSender: dataSender,
            dataReceiver: dataReceiver,
            amountToPay: amountToPay,
            amountToBuy: amountToBuy
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            error: 'Internal server error'
        });
    }
};


exports.getTotalBalanceCurrency = async (req, res) => {
    try {
        const { id } = req.body;
        const isAdmin = await checkAdmin(id);
        if (!isAdmin) {
            return res.status(403).json({
                error: 'Not an admin'
            });
        }
        const getTotalBalancesQuery = `
            SELECT c.name, c.symbol, er.usd_exchange_rate,
                SUM(uw.balance) AS total_coin, 
                SUM(uw.balance * er.usd_exchange_rate) AS total_balance
            FROM user_wallets uw
            JOIN exchange_rates er ON uw.currency_id = er.currency_id
            JOIN currency c ON c.id = er.currency_id
            GROUP BY 
                uw.currency_id, 
                er.usd_exchange_rate
        `;
        const totalBalances = await db.query(getTotalBalancesQuery);

        return res.status(200).json({
            result: totalBalances
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            error: 'Internal server error'
        });
    }
};

exports.increaseBalance = async (req, res) => {
    try {
        const { id, user_id, amount, currency_id } = req.body;
        const isAdmin = await checkAdmin(id);
        if (!isAdmin) {
            return res.status(403).json({
                error: 'Not an admin'
            });
        }

        const updateBalanceQuery = 'UPDATE user_wallets SET balance = balance + ? WHERE user_id = ? AND currency_id = ?';
        await db.query(updateBalanceQuery, [amount, user_id, currency_id]);

        return res.status(200).json({
            message: 'User balance increased successfully',
            currency_id: currency_id
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            error: 'Internal server error'
        });
    }
};


exports.decreaseBalance = async (req, res) => {
    try {
        const { id, user_id, amount, currency_id } = req.body;
        const isAdmin = await checkAdmin(id);
        if (!isAdmin) {
            return res.status(403).json({
                error: 'Not an admin'
            });
        }

        const updateBalanceQuery = 'UPDATE user_wallets SET balance = balance - ? WHERE user_id = ? AND currency_id = ?';
        await db.query(updateBalanceQuery, [amount, user_id, currency_id]);

        return res.status(200).json({
            message: 'User balance decreased successfully',
            currency_id: currency_id
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            error: 'Internal server error'
        });
    }
};

exports.createCurrency = (req, res) => {
    const { id, name, symbol, usd_exchange_rate } = req.body;
    let currency_id;
    let exchange_rate_id;

    checkAdmin(id)
        .then((isAdmin) => {
            if (!isAdmin) {
                return res.status(403).json({
                    error: 'Not an admin'
                });
            }
            currency_id = uuidv4();

            const insertCurrency = 'INSERT INTO currency (id, name, symbol, createdAt, updatedAt) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)';
            return db.query(insertCurrency, [currency_id, name, symbol])
                .catch((error) => {
                    throw error;
                });
        })
        .then(() => {
            exchange_rate_id = uuidv4();

            const insertExchangeRateQuery = 'INSERT INTO exchange_rates (id, currency_id, usd_exchange_rate, rate_value, createdAt, updatedAt) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)';
            return db.query(insertExchangeRateQuery, [exchange_rate_id, currency_id, usd_exchange_rate, 1])
                .catch((error) => {
                    throw error;
                });
        })
        .then(() => {
            return res.status(200).json({
                message: 'Currency and Exchange rate created successfully',
                currency_id,
                name,
                symbol,
                exchange_rate_id,
                usd_exchange_rate
            });
        })
        .catch((error) => {
            console.error('Error creating currency and exchange rate:', error);
            return res.status(500).json({
                error: 'Internal Server Error'
            });
        });
};

exports.updateExchangeRate = async (req, res) => {
    try {
        const { id, currency_id, rates } = req.body;
        const isAdmin = await checkAdmin(id);
        if (!isAdmin) {
            return res.status(403).json({
                error: 'Not an admin'
            });
        }
        const updateExchangeRate = 'UPDATE exchange_rates SET usd_exchange_rate = ? WHERE currency_id = ?';
        await db.query(updateExchangeRate, [rates, currency_id]);

        return res.status(200).json({
            message: "Update exchange rates successfully!"
        });
    } catch (error) {
        console.error('Error updating exchange rate:', error);
        return res.status(500).json({
            error: 'Internal Server Error'
        });
    }
};


class User {
    constructor(name, balance) {
        this.name = name;
        this.balance = balance;
    }
}

class Cryptocurrency {
    constructor(name, balance) {
        this.name = name;
        this.balance = balance;
    }
}

const exchangeRates = {
    Bitcoin: {
        Ethereum: 50,
        Litecoin: 30,
    },
    Ethereum: {
        Bitcoin: 0.02,
        Litecoin: 0.6,
    },
    Litecoin: {
        Bitcoin: 0.03,
        Ethereum: 1.7,
    },
};

// function getExchangeRateV2(fromCurrency, toCurrency) {
//     if (exchangeRates[fromCurrency] && exchangeRates[fromCurrency][toCurrency]) {
//         return exchangeRates[fromCurrency][toCurrency];
//     } else {
//         throw new Error("Exchange rate not found for the given currencies.");
//     }
// }

// Example usage
// const user1 = new User("Alice", 50);
// const user2 = new User("Bob", 30);
// const bitcoin = new Cryptocurrency("Bitcoin", 10);
// const ethereum = new Cryptocurrency("Ethereum", 20);

// console.log(
//     `Before transaction: ${user1.name} has ${user1.balance} ${bitcoin.name}, ${user2.name} has ${user2.balance} ${ethereum.name}.`
// );

// transferCrypto(user1, user2, 10, bitcoin.name, ethereum.name);

// console.log(
//     `After transaction: ${user1.name} has ${user1.balance} ${bitcoin.name}, ${user2.name} has ${user2.balance} ${ethereum.name}.`
// );




















