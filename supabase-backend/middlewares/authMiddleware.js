const { supabase } = require('../supabaseClient.js');

// ----------------------------------------------------------------------
// BASE MIDDLEWARE: Xác thực token và lấy thông tin user
// ----------------------------------------------------------------------
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Yêu cầu token xác thực.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        // Sử dụng Supabase Client để xác thực token và lấy thông tin người dùng
        const { data: userData, error: authError } = await supabase.auth.getUser(token);

        if (authError || !userData.user) {
            return res.status(401).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn.' });
        }
        
        // Lưu thông tin người dùng và vai trò vào request để các route tiếp theo sử dụng
        req.user = userData.user; 
        req.userRole = userData.user.user_metadata?.role;
        next();

    } catch (e) {
        console.error("Lỗi hệ thống trong Base Auth Middleware:", e);
        return res.status(500).json({ success: false, message: 'Lỗi hệ thống xác thực.' });
    }
};

// ----------------------------------------------------------------------
// ROLE-BASED MIDDLEWARES: Phân quyền cụ thể
// ----------------------------------------------------------------------

// Middleware chỉ dành cho Admin
const requireAdmin = [authenticateToken, (req, res, next) => {
    if (req.userRole === 'admin') {
        next();
    } else {
        return res.status(403).json({ success: false, message: 'Quyền bị từ chối. Chỉ Admin được phép.' });
    }
}];

// Middleware chỉ dành cho Manager
const requireManager = [authenticateToken, (req, res, next) => {
    if (req.userRole === 'manager') {
        next();
    } else {
        return res.status(403).json({ success: false, message: 'Quyền bị từ chối. Chỉ Manager được phép.' });
    }
}];

// Middleware chỉ dành cho Tenant (Người thuê)
const requireTenant = [authenticateToken, (req, res, next) => {
    if (req.userRole === 'tenant') {
        next();
    } else {
        return res.status(403).json({ success: false, message: 'Quyền bị từ chối. Chỉ Tenant được phép.' });
    }
}];


module.exports = {
    authenticateToken,
    requireAdmin,
    requireManager,
    requireTenant,
};