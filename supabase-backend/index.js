const express = require('express');

// Import routers
const userRoutes = require('./routes/admin/userRoutes');
const roomTypeRoutes = require('./routes/admin/roomTypeRoutes');

const app = express();
app.use(express.json()); // Middleware để đọc JSON body

app.use('/api/user', userRoutes);
app.use('/api/roomtype', roomTypeRoutes);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});