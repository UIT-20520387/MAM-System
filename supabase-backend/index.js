const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3000;

const allowedOrigins = [
    'http://localhost:5500', 
    'http://127.0.0.1:5500',
];

// const corsOptions = {
//   origin: function (origin, callback) {
//     // Cho phép yêu cầu nếu origin nằm trong danh sách hoặc nếu không có origin
//     if (!origin || allowedOrigins.includes(origin)) {
//       callback(null, true)
//     } else {
//       callback(new Error('Not allowed by CORS'))
//     }
//   },
//   methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
//   credentials: true, // Cho phép gửi cookies/auth headers
//   optionsSuccessStatus: 204
// };

app.use(cors({
    origin: '*', // Cho phép tất cả các nguồn truy cập
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    credentials: true // Cho phép gửi cookies/auth headers nếu cần
}));


// Import routers
const authRoutes = require('./routes/auth/authRoutes');
const registerRoutes = require('./routes/auth/registerRoutes');


const userRoutes = require('./routes/admin/userRoutes');
const roomTypeRoutes = require('./routes/admin/roomTypeRoutes');

const apartmentRoutes = require('./routes/manager/apartmentRoutes');
const tenantRoutes = require('./routes/manager/tenantRoutes');
const contractRoutes = require('./routes/manager/contractRoutes');


// app.use(cors(corsOptions));

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

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});