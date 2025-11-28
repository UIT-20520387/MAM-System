// routes/tenantRoutes.js
const express = require('express');
const router = express.Router();
const { supabase } = require('../../supabaseClient.js');

// Vai trò mặc định cho người dùng đăng ký qua API này
const TENANT_ROLE = 'tenant';

// ----------------------------------------------------------------------
// POST /api/tenant/register - ĐĂNG KÝ TÀI KHOẢN CHO NGƯỜI THUÊ
// ----------------------------------------------------------------------
router.post('/register', async (req, res) => {
    const { email, password, fullName, phoneNumber, identityCardNumber } = req.body;
    
    if (!email || !password || !fullName || !phoneNumber) {
        return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc (email, password, fullName, phoneNumber).' });
    }

    try {
        // TẠO NGƯỜI DÙNG TRONG AUTHENTICATION
        const { data: userData, error: authError } = await supabase.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true,
            user_metadata: { role: TENANT_ROLE } // Thiết lập vai trò là 'tenant'
        });

        if (authError) {
            if (authError.message.includes('already registered')) {
                return res.status(409).json({ success: false, message: 'Email này đã được đăng ký.' });
            }
            console.error("Lỗi Auth Supabase (Tạo User):", authError.message);
            throw new Error(`Auth Error: ${authError.message}`);
        }
        
        const uid = userData.user.id;
        
        // TẠO HỒ SƠ TRONG BẢNG TenantProfile
        
        const { error: dbError } = await supabase
            .from('TenantProfile') 
            .insert({
                user_id: uid,
                fullname: fullName,
                phone_number: phoneNumber,
                identity_card_number: identityCardNumber, 
            });

        if (dbError) {
            // Nếu có lỗi DB, phải xoá User đã tạo trong Auth để tránh rác
            await supabase.auth.admin.deleteUser(uid); 
            console.error("Lỗi DB Supabase (Insert Tenant Profile):", dbError.message);
            return res.status(500).json({ success: false, message: `Lỗi DB khi tạo hồ sơ Tenant. Đã huỷ tạo User Auth. Chi tiết: ${dbError.message}` });
        }

        return res.status(200).json({ 
            success: true, 
            message: `Tài khoản người thuê ${fullName} đã được tạo thành công.`,
            userId: uid
        });

    } catch (error) {
        console.error("Lỗi hệ thống khi đăng ký tài khoản Tenant:", error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống khi đăng ký tài khoản Tenant.' });
    }
});

module.exports = router;