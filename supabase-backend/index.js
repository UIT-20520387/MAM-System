const express = require('express');

// Import routers
const authRoutes = require('./routes/auth/authRoutes');
const registerRoutes = require('./routes/auth/registerRoutes');


const userRoutes = require('./routes/admin/userRoutes');
const roomTypeRoutes = require('./routes/admin/roomTypeRoutes');

const apartmentRoutes = require('./routes/manager/apartmentRoutes');
const tenantRoutes = require('./routes/manager/tenantRoutes');
const contractRoutes = require('./routes/manager/contractRoutes');

const app = express();
app.use(express.json()); // Middleware để đọc JSON body

// Auth routes
app.use('/api/register', registerRoutes);
app.use('/api/auth', authRoutes);

// Admin routes
app.use('/api/user', userRoutes);
app.use('/api/roomtype', roomTypeRoutes);

// Manager routes
app.use('/api/apartments', apartmentRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/contracts', contractRoutes);

// Tenant routes


const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});