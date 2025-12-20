const axios = require('axios');

const testRegister = async () => {
    try {
        const userData = {
            name: 'Test User',
            email: `test${Date.now()}@example.com`,
            phone: '1234567890',
            password: 'password123',
            vehicleNumber: 'MH12TEST',
            role: 'customer'
        };

        console.log('Attempting to register:', userData);

        // Assuming server is running on port 5000
        const response = await axios.post('http://localhost:5000/api/auth/register', userData);

        console.log('Registration successful!');
        console.log('Response:', response.data);

    } catch (error) {
        console.error('Registration failed!');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error('Error:', error.message);
        }
    }
};

testRegister();
