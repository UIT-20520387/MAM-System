// routes/tenantRoutes.js
const express = require('express');
const router = express.Router();
const { supabase } = require('../../supabaseClient.js');

// Vai trò mặc định cho người dùng đăng ký qua API này
const TENANT_ROLE = 'tenant';

// Middleware để xác thực và chuyển đổi ngày tháng
const validateAndConvertDate = (req, res, next) => {
    const { email, password, fullName, gender, dob, phoneNumber, idCardNumber } = req.body;

    if (!email || !password || !fullName || !gender || !dob || !phoneNumber || !idCardNumber) {
        return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin bắt buộc.' });
    }

    // Kiểm tra định dạng dd/mm/yyyy
    const dobRegex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!dobRegex.test(dob)) {
        return res.status(400).json({ success: false, message: 'Ngày sinh phải ở định dạng dd/mm/yyyy hợp lệ.' });
    }

    // Chuyển đổi DOB từ DD/MM/YYYY sang YYYY-MM-DD (Định dạng DATE của PostgreSQL/Supabase)
    const parts = dob.split('/');
    const dobSupabaseFormat = `${parts[2]}-${parts[1]}-${parts[0]}`;
    
    // Lưu định dạng đã chuyển đổi vào body để service có thể sử dụng
    req.body.dobSupabaseFormat = dobSupabaseFormat;
    next();
};

// ----------------------------------------------------------------------
// POST /api/register - ĐĂNG KÝ TÀI KHOẢN CHO NGƯỜI THUÊ
// ----------------------------------------------------------------------
router.post('/', validateAndConvertDate, async (req, res) => {
    const { email, password, fullName, gender, dobSupabaseFormat, phoneNumber, idCardNumber } = req.body;

    try {
        // TẠO NGƯỜI DÙNG TRONG AUTHENTICATION
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true,
            user_metadata: { role: TENANT_ROLE } // Thiết lập vai trò là 'tenant'
        });

        if (authError) {
             // Thường là lỗi email đã tồn tại hoặc password quá yếu
            console.error('Lỗi Supabase Auth khi đăng ký:', authError.message);
            // Xử lý thông báo lỗi cho người dùng
            let errorMessage = 'Đăng ký thất bại. Vui lòng kiểm tra lại email và mật khẩu.';
            if (authError.message.includes('already exists')) {
                errorMessage = 'Địa chỉ Email này đã được đăng ký.';
            }
            return res.status(400).json({ success: false, message: errorMessage });
        }
        
        const uid = authData.user.id;
        
        // TẠO HỒ SƠ TRONG BẢNG TenantProfile
        
        const { error: profileError } = await supabase
            .from('TenantProfile') 
            .insert({
                user_id: uid,
                fullname: fullName,
                gender: gender,
                dob: dobSupabaseFormat,
                phone_number: phoneNumber,
                identity_card_number: idCardNumber, 
            });

        if (profileError) {
            // Nếu có lỗi DB, phải xoá User đã tạo trong Auth để tránh rác
            await supabase.auth.admin.deleteUser(uid); 
            console.error("Lỗi DB Supabase (Insert Tenant Profile):", profileError.message);
            return res.status(500).json({ success: false, message: `Lỗi DB khi tạo hồ sơ Tenant. Đã huỷ tạo User Auth. Chi tiết: ${dbError.message}` });
        }

        return res.status(200).json({ 
            success: true, 
            message: `Tài khoản người thuê ${fullName} đã được tạo thành công.`,
        });

    } catch (error) {
        console.error("Lỗi hệ thống khi đăng ký tài khoản Tenant:", error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống khi đăng ký tài khoản.' });
    }
});

module.exports = router;