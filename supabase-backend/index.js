const express = require('express');

// Import routers
const authRoutes = require('./routes/auth/authRoutes');
const tenantRoutes = require('./routes/auth/tenantRoutes');


const userRoutes = require('./routes/admin/userRoutes');
const roomTypeRoutes = require('./routes/admin/roomTypeRoutes');


const app = express();
app.use(express.json()); // Middleware để đọc JSON body

// Auth routes
app.use('/api/tenant', tenantRoutes);
app.use('/api/auth', authRoutes);

// Admin routes
app.use('/api/user', userRoutes);
app.use('/api/roomtype', roomTypeRoutes);

// Manager routes


// Tenant routes


const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});