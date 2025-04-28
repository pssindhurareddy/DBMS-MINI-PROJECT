# DBMS Mini Project

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/MySQL-005C84?style=for-the-badge&logo=mysql&logoColor=white" />
 
</p>

---

## Project Title
**Blood Bank Management System**

## Description
This is a Database Management System (DBMS) mini project developed using **Node.js**, **Express.js**, and **MySQL**.  
The system manages blood donations by registering donors and recipients, maintaining blood stock in blood banks, handling hospitals, and facilitating donation and blood request transactions.

It demonstrates core DBMS concepts including:

- Database creation and management
- SQL queries, triggers, and stored procedures
- Backend API development using Node.js and Express.js
- CRUD (Create, Read, Update, Delete) operations

---

## Features
- Register and manage donor, recipient, hospital, blood bank, and user information
- Record blood donations and track blood stock levels
- Manage blood requests from recipients to hospitals
- Approve/reject blood requests
- Search and filter donors by blood type and city
- Backend authentication 
- Database integrity maintained through foreign key constraints

---

## Tech Stack
- **Backend**: Node.js, Express.js
- **Database**: MySQL
- **Tools**: MySQL Workbench 

---

## Database Structure

### Tables:

- **Donor**
  - DonorID (PK)
  - Name, Age, Gender
  - BloodType
  - LastDonationDate
  - City, ContactInfo
  - EligibilityStatus (boolean)

- **Recipient**
  - RecipientID (PK)
  - Name, Age, Gender
  - BloodType
  - City, ContactInfo
  - RequestStatus (Pending / Approved / Rejected)
  - Password (for authentication)

- **Hospital**
  - HospitalID (PK)
  - Name, City, ContactInfo

- **BloodBank**
  - BankID (PK)
  - Name, City, StockLevel

- **Donation**
  - DonationID (PK)
  - DonorID (FK to Donor)
  - BankID (FK to BloodBank)
  - Date, Quantity

- **Request**
  - RequestID (PK)
  - RecipientID (FK to Recipient)
  - HospitalID (FK to Hospital)
  - BloodType, Quantity
  - Status (Pending / Approved / Rejected)
  - RequestDate

- **BloodStock**
  - StockID (PK)
  - BankID (FK to BloodBank)
  - BloodType
  - Quantity
  - LastUpdatedDate

- **Users**
  - UserID (PK)
  - Name, Email (Unique), Password (hashed)
  - Age, Gender, BloodType
  - City, ContactInfo
  - SignUpDate (timestamp)

---

## How to Run

1. **Clone the Repository**
    ```bash
    git clone https://github.com/yourusername/dbms-mini-project.git
    cd dbms-mini-project
    ```

2. **Install Dependencies**
    ```bash
    npm install
    ```

3. **Set Up Database**
    - Create a database in MySQL named `BloodDonationDB`.
    - Import the provided SQL file (`schema.sql`) into your database.

4. **Configure Environment**
    - Create a `.env` file in the root folder:
      ```env
      DB_HOST=localhost
      DB_USER=your_mysql_username
      DB_PASSWORD=your_mysql_password
      DB_NAME=BloodDonationDB
      PORT=3000
      ```

5. **Run the Server**
    ```bash
    npm start
    ```
    or
    ```bash
    node app.js
    ```

6. **Access the Application**
    - Use Postman or any API client to test the endpoints at:
      ```
      http://localhost:3000/
      ```

---


## Contributors
- **Sindhura Reddy** 
- **Meghna Nair** 
- **Nissie Hasini** 


