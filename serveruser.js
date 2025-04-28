const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');
const cors = require('cors');
const path = require('path');

const app = express();
const port = 3000;

// Enable CORS for all routes
app.use(cors());
// Use body-parser middleware to parse request bodies
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Set up express-session
app.use(session({
    secret: 'your-secret-key', // Change this to a strong, random key
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true in production with HTTPS
        httpOnly: true, // Prevents client-side JS from accessing the cookie
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// MySQL database connection configuration
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'BloodDonationDB',
    connectionLimit: 10
};

const db = mysql.createPool(dbConfig);

// Function to test the database connection
function testDBConnection() {
    db.getConnection((err, connection) => {
        if (err) {
            console.error('Error establishing database connection:', err);
            if (err.code === 'ER_ACCESS_DENIED_ERROR') {
                console.error('Check your database credentials (username, password, host).');
            } else if (err.code === 'ECONNREFUSED') {
                console.error('Ensure that the MySQL server is running and listening on the specified host and port.');
            } else {
                console.error('Verify that the database server is accessible from this machine.');
            }
            // IMPORTANT:  Terminate the application if the database connection fails.
            process.exit(1);
        } else {
            console.log('Successfully connected to MySQL database');
            connection.release(); // Release the connection back to the pool
        }
    });
}
// Call the function to test the connection
testDBConnection();

// Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// --- Helper Functions ---
/**
 * Checks if an email is valid.
 * @param {string} email - The email address to check.
 * @returns {boolean} - True if the email is valid, false otherwise.
 */
function isValidEmail(email) {
    const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
    return emailRegex.test(email);
}

// --- Routes ---
// Signup route
app.post('/signup', async (req, res) => {
    const { name, email, password, age, gender, blood_type, city, contact_info } = req.body;

    // Validate input
    if (!name || !email || !password || !age || !gender || !blood_type || !city || !contact_info) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    if (!isValidEmail(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }
    if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }
    if (isNaN(age) || parseInt(age) <= 0) {
        return res.status(400).json({ error: 'Invalid age' });
    }

    try {
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Check if the email is already registered in the Users table
        const checkEmailQuery = 'SELECT * FROM Users WHERE email = ?';
        db.execute(checkEmailQuery, [email], (err, results) => {
            if (err) {
                console.error('Error checking email:', err);
                return res.status(500).json({ error: 'Internal server error' });
            }

            if (results.length > 0) {
                return res.status(409).json({ error: 'Email already exists' });
            } else {
                // Insert the new user into the Users table
                const insertUserQuery = 'INSERT INTO Users (Name, Email, Password, Age, Gender, BloodType, City, ContactInfo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
                db.execute(insertUserQuery, [name, email, hashedPassword, age, gender, blood_type, city, contact_info], (err, result) => {
                    if (err) {
                        console.error('Error inserting user:', err);
                        return res.status(500).json({ error: 'Internal server error' });
                    }
                    console.log('User inserted successfully');
                    return res.status(201).json({ message: 'User created successfully' });
                });
            }
        });
    } catch (error) {
        console.error('Error hashing password:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// Login route
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }
    if (!isValidEmail(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }

    // Query the database to find the user by email in the Users table
    const query = 'SELECT * FROM Users WHERE LOWER(email) = LOWER(?)'; //email is not case sensitive.
    db.execute(query, [email.toLowerCase()], async (err, results) => {
        if (err) {
            console.error('Error querying database:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }

        if (results.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = results[0];
        // Compare the provided password with the hashed password from the database
        try {
            const passwordMatch = await bcrypt.compare(password, user.Password);
            if (!passwordMatch) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            // Store user information in the session
            req.session.user = {
                UserID: user.UserID,
                Name: user.Name,
                Email: user.Email,
                Age: user.Age,
                Gender: user.Gender,
                BloodType: user.BloodType,
                City: user.City,
                ContactInfo: user.ContactInfo,
            };
            req.session.isLoggedIn = true;
            console.log('Login successful');
            return res.status(200).json({ message: 'Login successful', user: req.session.user });
        } catch (error) {
            console.error("Error comparing passwords", error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    });
});

// Dashboard route
app.get('/dashboard', (req, res) => {
    // Check if the user is logged in
    if (!req.session.isLoggedIn || !req.session.user) {
        return res.status(401).json({ error: 'Not logged in' });
    }

    const user = req.session.user;

    //  Check Donor table
    const donorQuery = 'SELECT * FROM Donor WHERE Name = ? AND Age = ? AND Gender = ? AND BloodType = ? AND City = ? AND ContactInfo = ?';
    db.execute(donorQuery, [user.Name, user.Age, user.Gender, user.BloodType, user.City, user.ContactInfo], (donorErr, donorResult) => {
        if (donorErr) {
            console.error('Error querying Donor table:', donorErr);
            return res.status(500).json({ error: 'Internal server error' });
        }
        if (donorResult.length > 0) {
            const donorInfo = donorResult[0];
            return res.status(200).json({
                user: user,
                donorInfo: {
                    DonorID: donorInfo.DonorID,
                    LastDonationDate: donorInfo.LastDonationDate,
                    EligibilityStatus: donorInfo.EligibilityStatus
                }
            }); //send donor info
        } else {
            // Check Recipient table
            const recipientQuery = 'SELECT * FROM Recipient WHERE Name = ? AND Age = ? AND Gender = ? AND BloodType = ? AND City = ? AND ContactInfo = ?';
            db.execute(recipientQuery, [user.Name, user.Age, user.Gender, user.BloodType, user.City, user.ContactInfo], (recipientErr, recipientResult) => {
                if (recipientErr) {
                    console.error('Error querying Recipient table:', recipientErr);
                    return res.status(500).json({ error: 'Internal server error' });
                }
                if (recipientResult.length > 0) {
                    const recipientInfo = recipientResult[0];
                    return res.status(200).json({
                        user: user,
                        recipientInfo: {
                            RecipientID: recipientInfo.RecipientID,
                            RequestStatus: recipientInfo.RequestStatus
                        }
                    }); // Send recipient info
                } else {
                    return res.status(200).json({ user: user }); //send user
                }
            });
        }
    });
});

// Logout route
app.post('/logout', (req, res) => {
    // Destroy the session
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        console.log('Logged out');
        res.status(200).json({ message: 'Logged out successfully' });
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error("Global error handler:", err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
