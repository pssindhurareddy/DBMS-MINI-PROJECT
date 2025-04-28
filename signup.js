document.getElementById('signupForm').addEventListener('submit', function (e) {
    e.preventDefault();
  
    const formData = {
        Name: document.querySelector('[name="name"]').value,
        Age: document.querySelector('[name="age"]').value,
        Gender: document.querySelector('[name="gender"]').value,
        BloodType: document.querySelector('[name="bloodType"]').value,
        City: document.querySelector('[name="city"]').value,
        ContactInfo: document.querySelector('[name="contactInfo"]').value,        
        RequestStatus: 'Pending', // Default value for new requests
        Password: document.querySelector('[name="password"]').value,
      };
  
    fetch('/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    })
      .then((res) => res.json())
      .then((data) => alert(data.message))
      .catch((err) => console.error('Error:', err));
  });