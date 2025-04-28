const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

app.use(express.static('public'));

// MySQL connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'BloodDonationDB',
});

db.connect((err) => {
    if (err) throw err;
    console.log('Connected to MySQL DB');
});

// Route to handle Hospital registration
app.post('/register_hospital', async (req, res) => {
    const { Name, City, ContactInfo, Password, confirmPassword } = req.body;

    console.log('Received hospital data:', req.body);

    // Check if password and confirmPassword match
    if (Password !== confirmPassword) {
        return res.status(400).json({ message: "Passwords do not match" });
    }

    try {
        // Hash the password and confirmPassword
        const hashedPassword = await bcrypt.hash(Password, 10);
        const hashedConfirmPassword = await bcrypt.hash(confirmPassword, 10);

        const sql = 'INSERT INTO Hospital (Name, City, ContactInfo, Password, confirmPassword) VALUES (?, ?, ?, ?, ?)';

        // Store the hashed password AND the hashed confirmPassword
        db.query(sql, [Name, City, ContactInfo, hashedPassword, hashedConfirmPassword], (err, result) => {
            if (err) {
                console.error('Hospital insert error:', err);
                res
                    .status(500)
                    .json({ message: 'Database error', error: err.message });
            } else {
                console.log('Hospital insert success:', result);
                res.json({ message: 'Hospital registered successfully!' });
            }
        });
    } catch (error) {
        console.error('Error hashing password:', error);
        res.status(500).json({ message: 'Error hashing password', error: error.message });
    }
});

app.listen(port, () => console.log(`Server running at http://localhost:${port}`));
