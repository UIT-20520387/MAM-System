const express = require('express');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

// Import routers
const roomTypeRoutes = require('./routes/roomTypeRoutes');

dotenv.config();
const app = express();
app.use(express.json()); // Middleware để đọc JSON body

// Khởi tạo Supabase Client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY, // Sử dụng service_role key để bypass RLS
  { auth: { persistSession: false } } 
);

module.exports = { supabase };

// API (POST /api/manager) cho Admin tạo Manager
app.post('/api/manager', async (req, res) => {
    const { email, password, fullName, phoneNumber, identityCardNumber } = req.body;

    // Kiểm tra dữ liệu đầu vào cơ bản
    if (!email || !password || !fullName) {
        return res.status(400).send({ success: false, message: 'Thiếu thông tin bắt buộc.' });
    }

    try {
        // TẠO USER TRONG AUTH SERVICE CỦA SUPABASE
        const { data: userData, error: authError } = await supabase.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true,
            user_metadata: { role: 'manager' }
        });

        if (authError) {
            console.error("Lỗi Auth Supabase (Tạo User):", authError.message);
            
            // Xử lý lỗi Email đã tồn tại
            if (authError.message.includes('already registered')) {
                return res.status(409).send({ success: false, message: 'Email này đã được đăng ký.' });
            }
            
            // Xử lý lỗi Auth chung
            throw new Error(`Auth Error: ${authError.message}`);
        }

        const uid = userData.user.id;

        await new Promise(resolve => setTimeout(resolve, 50));

        // LƯU HỒ SƠ VÀO BẢNG PostgreSQL ManagerProfile
        const { error: dbError } = await supabase
            .from('ManagerProfile') // Tên bảng PostgreSQL
            .insert({
                user_id: uid,
                fullname: fullName,
                phone_number: phoneNumber,
                identity_card_number: identityCardNumber
            });

        if (dbError) {
            console.error("Lỗi DB Supabase (Insert Profile):", dbError.message);
            // **Đây là nơi lỗi Foreign Key xuất hiện**
            throw new Error(`DB Error: ${dbError.message}`);
        }

        // Trả về thành công
        return res.status(200).send({ 
            success: true, 
            message: `Manager ${fullName} tạo thành công.` 
        });

    } catch (error) {
        console.error("Lỗi khi tạo Manager:", error);
        res.status(500).send({ success: false, message: 'Lỗi hệ thống khi tạo tài khoản.' });
    }
});

app.use('/api/roomtype', roomTypeRoutes);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});