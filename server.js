// server.js
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
  if (err) throw err;
  console.log('Connected to MySQL DB');
});

//app.get('*', function(req, res) {
//    res.redirect('/');
//});


app.post('/submit', (req, res) => {
    const { name, age, gender, bloodType, lastDonationDate, city, contactInfo, eligibility } = req.body;
    console.log('Received data:', req.body); // ADD THIS
  
    const sql = 'INSERT INTO Donor (name, age, gender, bloodType, lastDonationDate, city, contactInfo, eligibilitystatus) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    
    db.query(sql, [name, age, gender, bloodType, lastDonationDate, city, contactInfo, eligibility], (err, result) => {
      if (err) {
        console.error('Insert error:', err); // ERROR DETAILS
        res.status(500).json({ message: 'Database error', error: err.message });
      } else {
        console.log('Insert success:', result); // SUCCESS LOG
        res.json({ message: 'Registered as Donor!' });
      }
    });
  });

 

  app.listen(port, () => console.log(`Server running at http://localhost:${port}`));