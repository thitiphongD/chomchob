const express = require('express');
const db = require('./db');
const app = express();
const bodyParser = require('body-parser');
app.use(bodyParser.json());

// Create a simple route
const mainRoutes = require('./routes/mainRoutes');
app.use('/', mainRoutes);

app.post('/todo', (req, res) => {
    const { description, completed } = req.body;

    db.query('INSERT INTO todo (description, completed) VALUES (?, ?)', [description, completed])
        .then((results) => {
            res.status(200).json({ message: 'Data inserted successfully!' });
        })
        .catch((error) => {
            console.error('Error inserting data into the database:', error);
            res.status(500).json({ error: 'Error inserting data into the database' });
        });
});

const port = 3000;
app.listen(port, () => {
    console.log(`⚡️[Server]: Server is running at http://localhost:${port}`);
});