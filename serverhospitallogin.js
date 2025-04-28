const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// MySQL connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'BloodDonationDB',
    charset: 'utf8mb4'
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL DB:', err);
        process.exit(1);
    }
    console.log('Connected to MySQL DB');
});

app.get('/test', (req, res) => {
    res.send('Server is reachable!');
});

// Route to handle Hospital login
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    console.log('--- LOGIN ATTEMPT START ---');
    console.log('Received username:', username);
    console.log('Received password:', password);

    if (!username || !password) {
        console.log('Login failed: Username or password missing');
        console.log('--- LOGIN ATTEMPT END (Missing Credentials) ---');
        return res.status(400).json({ message: 'Username and password are required.' });
    }

    const query = 'SELECT * FROM Hospital WHERE ContactInfo = ?';
    db.query(query, [username], (err, results) => {
        if (err) {
            console.error('Database error during login:', err);
            console.log('--- LOGIN ATTEMPT END (Database Error) ---');
            return res.status(500).json({ message: 'Database error during login.', error: err.message });
        }

        console.log('Database query results:', JSON.stringify(results));

        if (results.length === 1) {
            const hospital = results[0];
            console.log('Found hospital record:', JSON.stringify(hospital));
            console.log('Stored hashed password:', hospital.Password);
            console.log('Password to compare:', password);

            bcrypt.compare(password, hospital.Password, (compareErr, isMatch) => {
                console.log('--- DEBUGGING COMPARE ---');
                console.log('Entered Password:', password);
                console.log('Stored Hash:', hospital.Password);
                console.log('Compare Error:', compareErr);
                console.log('Is Match:', isMatch);
                console.log('--- DEBUGGING COMPARE END ---');

                if (compareErr) {
                    console.error('Error comparing passwords:', compareErr);
                    console.log('--- LOGIN ATTEMPT END (Comparison Error) ---');
                    return res.status(500).json({ message: 'Error comparing passwords.', error: compareErr.message });
                }

                if (isMatch) {
                    const hospitalInfo = {
                        HospitalID: hospital.HospitalID,
                        Name: hospital.Name,
                        City: hospital.City,
                        ContactInfo: hospital.ContactInfo,
                    };
                    console.log('Login successful for hospital ID:', hospital.HospitalID);
                    console.log('--- LOGIN ATTEMPT END (Success) ---');
                    return res.status(200).json({ message: 'Login successful', hospital: hospitalInfo });
                } else {
                    console.log('Login failed: Invalid username or password - Comparison failed');
                    console.log('--- LOGIN ATTEMPT END (Comparison Failed) ---');
                    return res.status(401).json({ message: 'Invalid username or password.' });
                }
            });
        } else {
            console.log('Login failed: Invalid username or password - User not found');
            console.log('--- LOGIN ATTEMPT END (User Not Found) ---');
            return res.status(401).json({ message: 'Invalid username or password.' });
        }
    });
});

// --- DASHBOARD RELATED API ENDPOINTS ---

// Endpoint to fetch recent requests for a hospital
app.get('/api/hospitals/:hospitalId/requests', (req, res) => {
    const hospitalId = req.params.hospitalId;
    const query = `
        SELECT 
            r.RequestID,
            r.BloodType,
            r.Quantity,
            r.RequestDate,
            r.Status,
            rec.Name AS RecipientName, 
            hosp.City AS RecipientCity -- Assuming Recipient table might not have city, joining Hospital
        FROM 
            Request r
        JOIN 
            Recipient rec ON r.RecipientID = rec.RecipientID 
        JOIN
            Hospital hosp ON r.HospitalID = hosp.HospitalID
        WHERE 
            r.HospitalID = ?
        ORDER BY 
            r.RequestDate DESC
        LIMIT 5;
    `;
    db.query(query, [hospitalId], (err, results) => {
        if (err) {
            console.error('Error fetching recent requests:', err);
            return res.status(500).json({ message: 'Error fetching recent requests.', error: err.message });
        }
        res.json(results);
    });
});

// Endpoint to fetch recent donations (potentially relevant to the region of the hospital)
app.get('/api/hospitals/:hospitalId/donations', (req, res) => {
    const hospitalId = req.params.hospitalId;
    const query = `
        SELECT 
            d.DonationID,
            d.Date AS DonationDate,
            d.Quantity,
            do.Name AS DonorName,
            do.BloodType AS BloodType, -- Assuming Donor table has BloodType
            bb.Name AS BloodBankName,
            bb.City AS BloodBankCity
        FROM 
            Donation d
        JOIN 
            Donor do ON d.DonorID = do.DonorID 
        JOIN
            BloodBank bb ON d.BankID = bb.BankID
        WHERE 
            bb.City IN (SELECT City FROM Hospital WHERE HospitalID = ?) -- Filter by hospitals in the same city
        ORDER BY 
            d.Date DESC
        LIMIT 5;
    `;

    db.query(query, [hospitalId], (err, results) => {
        if (err) {
            console.error('Error fetching recent donations:', err);
            return res.status(500).json({ message: 'Error fetching recent donations.', error: err.message });
        }
        res.json(results);
    });
});

// Endpoint to handle blood request submission
app.post('/make_blood_request', (req, res) => {
    const { RecipientID, HospitalID, BloodType, Quantity } = req.body;
    const requestDate = new Date();
    const status = 'Pending';

    console.log("Received request data:", req.body);

    // Input validation
    if (!RecipientID || !HospitalID || !BloodType || !Quantity) {
        return res.status(400).json({ message: 'All fields are required.' });
    }
    if (Quantity <= 0) {
        return res.status(400).json({ message: 'Quantity must be greater than zero.' });
    }

    const query = `
        INSERT INTO Request (RecipientID, HospitalID, BloodType, Quantity, Status, RequestDate)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(
        query,
        [RecipientID, HospitalID, BloodType, Quantity, status, requestDate],
        (err, results) => {
            if (err) {
                console.error('Error inserting blood request:', err);
                return res.status(500).json({ message: 'Error inserting blood request.', error: err.message });
            }
            console.log('Blood request inserted successfully.  Results:', results);
            res.status(201).json({ message: 'Blood request submitted successfully!' });
        }
    );
});

// Endpoint to fetch blood inventory for a specific hospital's city
app.get('/api/hospitals/:hospitalId/inventory', (req, res) => {
    const hospitalId = req.params.hospitalId;
    const query = `
        SELECT bs.BloodType, bs.Quantity
        FROM BloodStock bs
        JOIN BloodBank bb ON bs.BankID = bb.BankID
        WHERE bb.City = (SELECT City FROM Hospital WHERE HospitalID = ?)
    `;
    db.query(query, [hospitalId], (err, results) => {
        if (err) {
            console.error('Error fetching blood inventory:', err);
            return res.status(500).json({ message: 'Error fetching blood inventory.', error: err.message });
        }
        res.json(results);
    });
});

// Endpoint to update blood inventory (assuming a single blood bank per city for simplicity)
app.post('/api/inventory', (req, res) => {
    const { BankID, BloodType, Quantity } = req.body; // You might want to fetch BankID based on hospital city
    const query = `
        INSERT INTO BloodStock (BankID, BloodType, Quantity, LastUpdatedDate)
        VALUES (?, ?, ?, CURDATE())
        ON DUPLICATE KEY UPDATE Quantity = Quantity + ?, LastUpdatedDate = CURDATE();
    `;
    db.query(query, [BankID, BloodType, Quantity, Quantity], (err, results) => {
        if (err) {
            console.error('Error updating blood inventory:', err);
            return res.status(500).json({ message: 'Error updating blood inventory.', error: err.message });
        }
        res.json({ message: 'Blood inventory updated successfully.' });
    });
});

// Endpoint to fetch all donors
app.get('/api/donors', (req, res) => {
    const query = `
        SELECT DonorID, Name, BloodType, ContactNumber
        FROM Donor;
    `;
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching donors:', err);
            return res.status(500).json({ message: 'Error fetching donors.', error: err.message });
        }
        res.json(results);
    });
});

// Endpoint to add a new donor
app.post('/api/donors', (req, res) => {
    const { Name, BloodType, ContactNumber } = req.body;
    const query = `
        INSERT INTO Donor (Name, BloodType, ContactNumber)
        VALUES (?, ?, ?);
    `;
    db.query(query, [Name, BloodType, ContactNumber], (err, results) => {
        if (err) {
            console.error('Error adding donor:', err);
            return res.status(500).json({ message: 'Error adding donor.', error: err.message });
        }
        res.json({ message: 'Donor added successfully.', insertId: results.insertId });
    });
});

// Endpoint to delete a donor
app.delete('/api/donors/:donorId', (req, res) => {
    const donorId = req.params.donorId;
    const query = `
        DELETE FROM Donor WHERE DonorID = ?;
    `;
    db.query(query, [donorId], (err, results) => {
        if (err) {
            console.error('Error deleting donor:', err);
            return res.status(500).json({ message: 'Error deleting donor.', error: err.message });
        }
        res.json({ message: `Donor with ID ${donorId} deleted successfully.` });
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});