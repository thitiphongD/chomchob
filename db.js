var mariadb = require('mariadb');

var db = mariadb.createPool({
    host: "127.0.0.1",
    port: 3304,
    user: "db_user",
    password: "db_password",
    database: "db"
});

db.getConnection()
    .then(conn => {
        console.log("Connection success");
        conn.release();
    })
    .catch(err => {
        console.error("Connection failed:", err);
    });

module.exports = {
    query: (sql, values, callback) => {
        return db.query(sql, values, callback);
    },
    close: () => {
        return db.close();
    }
};
