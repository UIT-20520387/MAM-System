const express = require('express');
const router = express.Router();
const { supabase } = require('../supabaseClient.js');

// API (POST /api/manager) cho Admin tạo Manager
router.post('/', async (req, res) => {
    const { email, password, fullName, phoneNumber, identityCardNumber } = req.body;

    // Kiểm tra dữ liệu đầu vào cơ bản
    if (!email || !password || !fullName) {
        return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc.' });
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

// DELETE /api/manager/:uid: Xoá một tài khoản bất kỳ (Manager hoặc Tenant)
router.delete('/:uid', async (req, res) => {
    const userIdToDelete = req.params.uid;

    try {
        // Xóa người dùng khỏi Supabase Authentication
        // Lệnh này sẽ xóa bản ghi khỏi auth.users
        const { error: authError } = await supabase.auth.admin.deleteUser(userIdToDelete);

        if (authError) {
            // Xử lý nếu người dùng không tồn tại
            if (authError.message.includes('not found')) {
                return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản để xóa.' });
            }
            console.error("Lỗi Auth Supabase (Xóa User):", authError.message);
            throw new Error(`Auth Error: ${authError.message}`);
        }
        
        return res.status(200).json({ 
            success: true, 
            message: `Tài khoản UID ${userIdToDelete} đã được xóa thành công.` 
        });

    } catch (error) {
        console.error("Lỗi hệ thống khi xóa tài khoản:", error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống khi xóa tài khoản.' });
    }
});

// PUT /api/manager/role/:uid: Thiết lập một người dùng hiện tại thành Manager
// Lưu ý: Cần xử lý việc chuyển hồ sơ nếu người dùng đó là Tenant
// router.put('/role/:uid', async (req, res) => {
//     const userIdToPromote = req.params.uid;
//     const { fullName, phoneNumber, identityCardNumber } = req.body;

//     try {
//         // Cập nhật Metadata Auth (Thiết lập vai trò Manager)
//         const { error: authError } = await supabase.auth.admin.updateUserById(
//             userIdToPromote,
//             { user_metadata: { role: 'manager' } }
//         );

//         if (authError) {
//             console.error("Lỗi Auth Supabase (Cập nhật role):", authError.message);
//             throw new Error(`Auth Error: ${authError.message}`);
//         }

//         // Kiểm tra và Cập nhật hồ sơ ManagerProfile
//         // Người dùng được cấp quyền Manager PHẢI có hồ sơ ManagerProfile.
        
//         // (a: Xóa hồ sơ Tenant nếu có - nếu bạn có bảng TenantProfile)
//         // await supabase.from('TenantProfile').delete().eq('user_id', userIdToPromote); 

//         // (b: Upsert (Insert/Update) vào ManagerProfile)
//         const { error: profileError } = await supabase
//             .from('ManagerProfile')
//             .upsert({
//                 user_id: userIdToPromote,
//                 full_name: fullName, // Cần truyền lại các thông tin này nếu chưa có hồ sơ
//                 phone_number: phoneNumber,
//                 cccd: identityCardNumber,
//                 // Các cột khác cần thiết, ví dụ: hire_date
//             }, { 
//                 onConflict: 'user_id', // Nếu user_id đã tồn tại, cập nhật
//                 ignoreDuplicates: false 
//             });

//         if (profileError) {
//             console.error("Lỗi DB Supabase (Upsert Profile):", profileError.message);
//             throw new Error(`DB Error: ${profileError.message}`);
//         }

//         return res.status(200).json({ 
//             success: true, 
//             message: `Tài khoản UID ${userIdToPromote} đã được cấp quyền Manager thành công.` 
//         });

//     } catch (error) {
//         console.error("Lỗi hệ thống khi phân quyền Manager:", error);
//         res.status(500).json({ success: false, message: 'Lỗi hệ thống khi phân quyền Manager.' });
//     }
// });

module.exports = router;