const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');

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
    if (err) {
        console.error('Error connecting to MySQL:', err);
        // It's critical to handle this error properly, maybe exit the process
        throw err;
    }
    console.log('Connected to MySQL DB');
});

// Route to handle blood requests
app.post('/make_blood_request', (req, res) => {
    const { RecipientID, HospitalID, BloodType, Quantity } = req.body;

    console.log('Received blood request data:', req.body);

    // Input validation:  Comprehensive and clear error messages
    if (!RecipientID) {
        return res.status(400).json({ message: 'Recipient ID is required' });
    }
    const recipientIdNum = Number(RecipientID);
    if (isNaN(recipientIdNum) || !Number.isInteger(recipientIdNum) || recipientIdNum <= 0) {
        return res.status(400).json({ message: 'Invalid Recipient ID' });
    }

    if (!HospitalID) {
        return res.status(400).json({ message: 'Hospital ID is required' });
    }
    const hospitalIdNum = Number(HospitalID);
    if (isNaN(hospitalIdNum) || !Number.isInteger(hospitalIdNum) || hospitalIdNum <= 0) {
        return res.status(400).json({ message: 'Invalid Hospital ID' });
    }

    if (!BloodType) {
        return res.status(400).json({ message: 'Blood Type is required' });
    }
    if (!['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].includes(BloodType)) {
        return res.status(400).json({ message: 'Invalid Blood Type' });
    }
    if (!Quantity) {
        return res.status(400).json({ message: 'Quantity is required' });
    }
    if (typeof Quantity !== 'number' || Quantity <= 0 || !Number.isInteger(Quantity)) {
        return res.status(400).json({ message: 'Invalid Quantity (must be a positive integer)' });
    }

    const sql = 'INSERT INTO Request (RecipientID, HospitalID, BloodType, Quantity, Status, RequestDate) VALUES (?, ?, ?, ?, ?, ?)';
    const status = 'Pending';
    const requestDate = new Date();

    db.query(sql, [recipientIdNum, hospitalIdNum, BloodType, Quantity, status, requestDate], (err, result) => {
        if (err) {
            console.error('Blood request insert error:', err);
            return res.status(500).json({ message: 'Database error', error: err.message });
        } else {
            console.log('Blood request inserted successfully:', result);
            return res.json({ message: 'Blood request submitted successfully!', result: { insertId: result.insertId } }); // Include insertId
        }
    });
});

app.listen(port, () => console.log(`Server running at http://localhost:${port}`));
