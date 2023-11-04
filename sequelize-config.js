const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('db', 'my_user', 'my_password', {
    host: 'localhost',
    dialect: 'mariadb',
    dialectOptions: {
        allowPublicKeyRetrieval: true
    },
});

sequelize.sync().then(() => {
    console.log('Database synchronized');
}).catch((error) => {
    console.error('Database synchronization error:', error);
});


module.exports = sequelize;
