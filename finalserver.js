const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const path = require('path');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files (HTML, CSS, JS)

// MySQL Connection
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

// --- Routes ---

//  This route is to check if the server is running
app.get('/test', (req, res) => {
    res.send('Server is reachable!');
});



// --- Recipient Registration ---
app.post('/submit', (req, res) => {
    const {
        Name,
        Age,
        Gender,
        BloodType,
        City,
        ContactInfo,
        Password
    } = req.body;

    console.log('Received recipient data:', req.body);

    const sql =
        'INSERT INTO Recipient (Name, Age, Gender, BloodType, City, ContactInfo, RequestStatus, Password) ' +
        'VALUES (?, ?, ?, ?, ?, ?, ?, ?)';

    db.query(
        sql,
        [Name, Age, Gender, BloodType, City, ContactInfo, 'Pending', Password],
        (err, result) => {
            if (err) {
                console.error('Recipient insert error:', err);
                res
                    .status(500)
                    .json({ message: 'Database error', error: err.message });
            } else {
                console.log('Recipient insert success:', result);
                res.json({ message: 'Requested blood succesfully!' });
            }
        }
    );
});

// --- Hospital Registration ---
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

// --- Hospital Login ---
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

app.listen(port, () => console.log(`Server running at http://localhost:${port}`));
