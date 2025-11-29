const express = require('express');
const router = express.Router();
const { supabase } = require('../../supabaseClient.js');
const { requireManager } = require('../../middlewares/authMiddleware.js'); 

// ======================================================================
// ROUTE QUẢN LÝ NGƯỜI THUÊ (TENANT) - CHỈ MANAGER
// ======================================================================

// GET /api/tenants - XEM DANH SÁCH NGƯỜI THUÊ
router.get('/', requireManager, async (req, res) => {
    try {
        // Lấy danh sách hồ sơ người thuê (TenantProfile)
        const { data: tenants, error } = await supabase
            .from('TenantProfile')
            .select('*')
            .order('fullname', { ascending: true });

        if (error) {
            console.error("Lỗi DB khi lấy danh sách người thuê:", error.message);
            return res.status(500).json({ success: false, message: 'Lỗi hệ thống khi tải danh sách người thuê.' });
        }

        // Trả về thông tin Profile (user_id, fullname,...)
        return res.status(200).json({
            success: true,
            message: 'Tải danh sách người thuê thành công.',
            tenants: tenants,
            totalCount: tenants.length
        });
    } catch (error) {
        console.error("Lỗi hệ thống khi lấy danh sách người thuê:", error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
    }
});

// GET /api/tenants/:id - XEM CHI TIẾT NGƯỜI THUÊ KÈM HỢP ĐỒNG
router.get('/:id', requireManager, async (req, res) => {
    const tenantId = req.params.id;

    try {
        // 1. Lấy thông tin hồ sơ người thuê
        const { data: profile, error: profileError } = await supabase
            .from('TenantProfile')
            .select('*') 
            .eq('user_id', tenantId)
            .single();

        if (profileError) {
            if (profileError.code === 'PGRST116') {
                return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ người thuê này.' });
            }
            console.error("Lỗi DB khi lấy hồ sơ người thuê:", profileError.message);
            return res.status(500).json({ success: false, message: 'Lỗi hệ thống khi tải chi tiết người thuê.' });
        }

        // 2. Lấy danh sách Hợp đồng của người thuê đó (JOIN với Apartment)
        const { data: contracts, error: contractError } = await supabase
            .from('Contract')
            .select('*, Apartment(apartment_id, apartment_num, price)')
            .eq('tenant_id', tenantId)
            .order('start_date', { ascending: false }); // Sắp xếp hợp đồng mới nhất lên trước

        if (contractError) {
            console.error("Lỗi DB khi lấy hợp đồng:", contractError.message);
            // Vẫn trả về thông tin profile nếu lỗi hợp đồng không nghiêm trọng
        }
        
        return res.status(200).json({
            success: true,
            message: 'Tải chi tiết người thuê và lịch sử hợp đồng thành công.',
            tenant: {
                ...profile,
                contracts: contracts || []
            }
        });
    } catch (error) {
        console.error("Lỗi hệ thống khi lấy chi tiết người thuê:", error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
    }
});

// PATCH /api/tenants/:id - SỬA THÔNG TIN NGƯỜI THUÊ
router.patch('/:id', requireManager, async (req, res) => {
    const tenantId = req.params.id;
    const { fullname, phone_number, identity_card_number } = req.body; 
    
    const updatePayload = {};
    if (fullname !== undefined) updatePayload.fullname = fullname;
    if (phone_number !== undefined) updatePayload.phone_number = phone_number;
    if (identity_card_number !== undefined) updatePayload.identity_card_number = identity_card_number;

    if (Object.keys(updatePayload).length === 0) {
        return res.status(400).json({ success: false, message: 'Không có thông tin nào được gửi để cập nhật.' });
    }

    try {
        const { data, error } = await supabase
            .from('TenantProfile')
            .update(updatePayload)
            .eq('user_id', tenantId)
            .select();

        if (error) {
            console.error("Lỗi DB khi sửa hồ sơ người thuê:", error.message);
            return res.status(500).json({ success: false, message: 'Lỗi hệ thống khi sửa thông tin người thuê.' });
        }
        
        if (data.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ người thuê để sửa.' });
        }

        return res.status(200).json({
            success: true,
            message: 'Cập nhật thông tin người thuê thành công.',
            tenant: data[0]
        });
    } catch (error) {
        console.error("Lỗi hệ thống khi sửa hồ sơ người thuê:", error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
    }
});

// DELETE /api/tenants/:id - XOÁ NGƯỜI THUÊ
router.delete('/:id', requireManager, async (req, res) => {
    const tenantId = req.params.id;

    try {
        // BƯỚC 1: Kiểm tra xem người thuê có hợp đồng thuê NHIỆM KỲ DÀI đang hoạt động không
        const { data: activeContracts, error: contractError } = await supabase
            .from('Contract')
            .select('contract_id')
            .eq('tenant_id', tenantId)
            .eq('is_active', true); // Giả định trường is_active xác định hợp đồng đang hiệu lực

        if (contractError) {
             console.error("Lỗi DB khi kiểm tra hợp đồng:", contractError.message);
             return res.status(500).json({ success: false, message: 'Lỗi hệ thống khi kiểm tra hợp đồng.' });
        }
        
        if (activeContracts && activeContracts.length > 0) {
            // Không được xóa nếu còn hợp đồng đang hoạt động
            return res.status(409).json({ success: false, message: `Không thể xóa người thuê. Người này hiện có ${activeContracts.length} hợp đồng đang hoạt động.` });
        }

        // BƯỚC 2: Xóa tài khoản khỏi Supabase Auth (Điều này sẽ tự động xóa TenantProfile nếu có RLS/trigger/FK)
        // **Lưu ý:** Chỉ Admin API mới có quyền xóa user.
        const { error: authError } = await supabase.auth.admin.deleteUser(tenantId);

        if (authError) {
            if (authError.message.includes('not found')) {
                return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản người thuê để xóa.' });
            }
            console.error("Lỗi Auth Supabase (Xóa User):", authError.message);
            return res.status(500).json({ success: false, message: 'Lỗi hệ thống khi xóa tài khoản người thuê.' });
        }
        
        return res.status(200).json({
            success: true,
            message: `Người thuê UID ${tenantId} và hồ sơ liên quan đã được xóa thành công.`
        });
    } catch (error) {
        console.error("Lỗi hệ thống khi xóa người thuê:", error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
    }
});

module.exports = router;