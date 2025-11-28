const express = require("express");
const router = express.Router();
const { supabase } = require("../../supabaseClient.js");
const {requireAdmin} = require('../../middlewares/authMiddleware.js');

const DEFAULT_ROLE = "tenant";

// GET /api/manager/users - XEM DANH SÁCH TẤT CẢ TÀI KHOẢN (Chỉ Admin)
router.get('/users', requireAdmin, async (req, res) => {
    try {
        // Sử dụng hàm Admin để lấy danh sách tất cả người dùng
        const { data, error } = await supabase.auth.admin.listUsers();

        if (error) {
            console.error("Lỗi Supabase khi lấy danh sách người dùng:", error.message);
            return res.status(500).json({ success: false, message: 'Lỗi hệ thống khi tải danh sách tài khoản.' });
        }
        
        // Lọc và chuẩn hóa dữ liệu
        const usersList = data.users.map(user => ({
            id: user.id,
            email: user.email,
            role: user.user_metadata?.role || 'tenant', // Mặc định là tenant nếu role trống
            createdAt: user.created_at,
            lastSignInAt: user.last_sign_in_at
        }));

        return res.status(200).json({
            success: true,
            message: 'Tải danh sách tài khoản thành công.',
            users: usersList,
            totalCount: data.users.length
        });

    } catch (error) {
        console.error("Lỗi hệ thống khi xem danh sách tài khoản:", error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
    }
});

// API (POST /api/user) cho Admin tạo tài khoản
router.post("/", requireAdmin, async (req, res) => {
  const { email, password } = req.body;

  // Kiểm tra dữ liệu đầu vào cơ bản
  if (!email || !password) {
    return res
      .status(400)
      .json({ success: false, message: "Thiếu thông tin bắt buộc." });
  }

  try {
    // TẠO USER TRONG AUTH SERVICE CỦA SUPABASE
    const { data: userData, error: authError } =
      await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: { role: DEFAULT_ROLE },
      });

    if (authError) {
      console.error("Lỗi Auth Supabase (Tạo User):", authError.message);

      // Xử lý lỗi Email đã tồn tại
      if (authError.message.includes("already registered")) {
        return res
          .status(409)
          .send({ success: false, message: "Email này đã được đăng ký." });
      }

      // Xử lý lỗi Auth chung
      throw new Error(`Auth Error: ${authError.message}`);
    }

    const uid = userData.user.id;

    await new Promise((resolve) => setTimeout(resolve, 50));

    // LƯU HỒ SƠ VÀO BẢNG Manager
    const { error: dbError } = await supabase
      .from("Manager") // Tên bảng
      .insert({
        user_id: uid,
        email: email,
      });

    if (dbError) {
      await supabase.auth.admin.deleteUser(uid);
      console.error("Lỗi DB Supabase (Insert Manager):", dbError.message);
      return res
        .status(500)
        .json({
          success: false,
          message: `Lỗi DB khi tạo hồ sơ. Đã huỷ tạo User Auth. Chi tiết: ${dbError.message}`,
        });
    }

    // Trả về thành công
    return res.status(200).json({
      success: true,
      message: `Tài khoản ${email} tạo thành công.`,
      userId: uid,
    });

  } catch (error) {
    console.error("Lỗi hệ thống khi tạo tài khoản:", error);
    res.status(500).json({ success: false, message: 'Lỗi hệ thống khi tạo tài khoản.' });
  }
});

// DELETE /api/user/:uid: Xoá một tài khoản bất kỳ
router.delete("/:uid", requireAdmin, async (req, res) => {
  const userIdToDelete = req.params.uid;

  try {
    // Xóa người dùng khỏi Supabase Authentication
    // Lệnh này sẽ xóa bản ghi khỏi auth.users
    const { error: authError } = await supabase.auth.admin.deleteUser(
      userIdToDelete
    );

    if (authError) {
      // Xử lý nếu người dùng không tồn tại
      if (authError.message.includes("not found")) {
        return res
          .status(404)
          .json({
            success: false,
            message: "Không tìm thấy tài khoản để xóa.",
          });
      }
      console.error("Lỗi Auth Supabase (Xóa User):", authError.message);
      throw new Error(`Auth Error: ${authError.message}`);
    }

    return res.status(200).json({
      success: true,
      message: `Tài khoản UID ${userIdToDelete} đã được xóa thành công.`,
    });
  } catch (error) {
    console.error("Lỗi hệ thống khi xóa tài khoản:", error);
    res
      .status(500)
      .json({ success: false, message: "Lỗi hệ thống khi xóa tài khoản." });
  }
});

module.exports = router;
