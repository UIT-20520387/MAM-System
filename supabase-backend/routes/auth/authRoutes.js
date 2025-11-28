// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { supabase } = require('../../supabaseClient.js');

// ----------------------------------------------------------------------
// POST /api/auth/login - ĐĂNG NHẬP CHUNG
// ----------------------------------------------------------------------
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Vui lòng cung cấp email và password.' });
    }

    try {
        // Đăng nhập bằng Supabase Client-Side Auth (không dùng admin)
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            // Xử lý lỗi đăng nhập (ví dụ: sai mật khẩu, tài khoản không tồn tại)
            console.error("Lỗi đăng nhập Auth Supabase:", error.message);
            return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không chính xác.' });
        }

        const user = data.user;

        // Lấy Vai trò (Role) từ User Metadata
        const userRole = user.user_metadata?.role;
        
        if (!userRole) {
            return res.status(403).json({ success: false, message: 'Tài khoản không có vai trò được gán. Vui lòng liên hệ Admin.' });
        }
        
        // Lấy Profile Data tương ứng (Manager hoặc Tenant)
        let profileData = null;
        let profileTable = null;

        if (userRole === 'admin' || userRole === 'manager') {
            profileTable = 'Manager';
        } else if (userRole === 'tenant') {
            profileTable = 'TenantProfile';
        }

        if (profileTable) {
            // Chỉ chọn user_id cho Manager/Admin
            const selectColumns = (userRole === 'tenant') ? '*' : 'user_id'; 

            const { data: profile, error: profileError } = await supabase
                .from(profileTable)
                .select(selectColumns)
                .eq('user_id', user.id)
                .single();

            // Xử lý lỗi: Nếu lỗi là do không tìm thấy dòng (hoặc nhiều hơn 1 dòng)
            if (profileError) {
                if (profileError.code === 'PGRST116') {
                     // Mã lỗi PGRST116 thường là "không tìm thấy dòng nào" khi dùng .single()
                    console.warn(`Cảnh báo: Không tìm thấy hồ sơ (${profileTable}) cho UID: ${user.id}.`);
                    // Vẫn cho phép đăng nhập nếu Auth thành công, chỉ thiếu profile
                    profileData = null; 
                } else {
                    // Lỗi DB nghiêm trọng khác (ví dụ: lỗi kết nối, lỗi schema)
                    console.error(`Lỗi DB nghiêm trọng khi lấy hồ sơ ${profileTable}:`, profileError.message);
                    return res.status(500).json({ success: false, message: 'Lỗi hệ thống khi tải hồ sơ người dùng.' });
                }
            }
            profileData = profile;
        }

        // Trả về thông tin đăng nhập thành công
        return res.status(200).json({
            success: true,
            message: 'Đăng nhập thành công.',
            token: data.session.access_token,
            user: {
                uid: user.id,
                email: user.email,
                role: userRole,
                profile: profileData
            }
        });

    } catch (error) {
        console.error("Lỗi hệ thống khi đăng nhập:", error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống khi đăng nhập.' });
    }
});

module.exports = router;