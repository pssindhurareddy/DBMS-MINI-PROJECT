const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const cors = require('cors'); // Import the cors middleware

const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors()); // Enable CORS for all origins (for development - you might want to restrict this in production)

// MySQL Connection Pool (for efficient database connection management)
const pool = mysql.createPool({
    host: 'localhost', // Your MySQL host
    user: 'root',     // Your MySQL username
    password: 'password',     // Your MySQL password
    database: 'BloodDonationDB',
    connectionLimit: 10 // Adjust as needed
});

// Helper function to execute database queries
const executeQuery = (sql, values) => {
    return new Promise((resolve, reject) => {
        pool.query(sql, values, (error, results) => {
            if (error) {
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
};

// --- Sign Up Endpoint ---
app.post('/signup', async (req, res) => {
    const { name, age, gender, bloodType, city, contactInfo, password } = req.body;

    try {
        // Check if the contact info already exists
        const existingUser = await executeQuery('SELECT * FROM Recipient WHERE ContactInfo = ?', [contactInfo]);
        if (existingUser.length > 0) {
            return res.status(409).json({ message: 'Contact info already exists.' });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert the new recipient into the database
        const result = await executeQuery(
            'INSERT INTO Recipient (Name, Age, Gender, BloodType, City, ContactInfo, Password, RequestStatus) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [name, age, gender, bloodType, city, contactInfo, hashedPassword, 'Pending']
        );

        res.status(201).json({ message: 'Sign up successful!', recipientId: result.insertId });
    } catch (error) {
        console.error('Error during sign up:', error);
        res.status(500).json({ message: 'Error signing up.' });
    }
});

// --- Login Endpoint ---
app.post('/login', async (req, res) => {
    const { contactInfo, password } = req.body;

    try {
        // Find the recipient by contact info
        const users = await executeQuery('SELECT * FROM Recipient WHERE ContactInfo = ?', [contactInfo]);
        if (users.length === 0) {
            return res.status(401).json({ message: 'Invalid contact info or password.' });
        }

        const user = users[0];

        // Compare the provided password with the hashed password in the database
        const passwordMatch = await bcrypt.compare(password, user.Password);
        if (!passwordMatch) {
            return res.status(401).json({ message: 'Invalid contact info or password.' });
        }

        // Fetch the user's request details and status
        const recipientDetails = await executeQuery(
            'SELECT Name, City, BloodType, RequestStatus FROM Recipient WHERE RecipientID = ?',
            [user.RecipientID]
        );

        res.status(200).json({
            message: 'Login successful!',
            userDetails: recipientDetails[0]
        });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ message: 'Error logging in.' });
    }
});

// --- Admin Login Endpoint ---
app.post('/admin/login', async (req, res) => {
    const { username, password } = req.body; // Assuming username is the city for simplicity

    try {
        // Find the blood bank admin by city (username)
        const admins = await executeQuery('SELECT BankID, City FROM BloodBank WHERE City = ?', [username]);
        if (admins.length === 0) {
            return res.status(401).json({ message: 'Invalid username or password.' });
        }

        const admin = admins[0];

        // In a real scenario, you would have a separate admin table with hashed passwords.
        // For this simplified example, we'll just check if the password matches the city (not secure!).
        if (password !== admin.City) {
            return res.status(401).json({ message: 'Invalid username or password.' });
        }

        // Fetch pending requests for the admin's city
        const pendingRequests = await executeQuery(
            'SELECT r.RecipientID, r.Name, r.BloodType, r.ContactInfo, r.RequestStatus FROM Recipient r WHERE r.City = ? AND r.RequestStatus = ?',
            [admin.City, 'Pending']
        );

        res.status(200).json({ message: 'Admin login successful!', city: admin.City, requests: pendingRequests });
    } catch (error) {
        console.error('Error during admin login:', error);
        res.status(500).json({ message: 'Error logging in as admin.' });
    }
});

// --- Get Pending Requests for a Specific City (for Admin Dashboard) ---
app.get('/admin/requests/:city', async (req, res) => {
    const { city } = req.params;

    try {
        const pendingRequests = await executeQuery(
            'SELECT r.RecipientID, r.Name, r.BloodType, r.ContactInfo, r.RequestStatus FROM Recipient r WHERE r.City = ? AND r.RequestStatus = ?',
            [city, 'Pending']
        );
        res.status(200).json({ requests: pendingRequests });
    } catch (error) {
        console.error('Error fetching pending requests:', error);
        res.status(500).json({ message: 'Error fetching pending requests.' });
    }
});

// --- Approve/Reject Request Endpoint (for Admin) ---
app.post('/admin/requests/:recipientId', async (req, res) => {
    const { recipientId } = req.params;
    const { status } = req.body; // Expected values: 'Approved' or 'Rejected'

    if (!['Approved', 'Rejected'].includes(status)) {
        return res.status(400).json({ message: 'Invalid request status.' });
    }

    try {
        const result = await executeQuery(
            'UPDATE Recipient SET RequestStatus = ? WHERE RecipientID = ?',
            [status, recipientId]
        );

        if (result.affectedRows > 0) {
            res.status(200).json({ message: `Request ${status} successfully.` });
        } else {
            res.status(404).json({ message: 'Recipient not found.' });
        }
    } catch (error) {
        console.error('Error updating request status:', error);
        res.status(500).json({ message: 'Error updating request status.' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});