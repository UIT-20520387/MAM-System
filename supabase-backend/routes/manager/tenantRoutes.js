const express = require('express');
const router = express.Router();
const { supabase } = require('../../supabaseClient.js');
const { requireManager } = require('../../middlewares/authMiddleware.js'); 

// ======================================================================
// ROUTE QUẢN LÝ NGƯỜI THUÊ (TENANT) - CHỈ MANAGER
// ======================================================================

// Lấy hơp đồng đang hoạt động của Tenant
const getActiveContractDetails = async (tenantId) => {
    // Tìm hợp đồng đang hoạt động (is_active = true)
    const { data: contract, error } = await supabase
        .from('Contract')
        .select(`
            contract_id, 
            apartment_id, 
            start_date, 
            end_date, 
            deposit_amount, 
            is_active,
            Apartment(apartment_number, price)
        `)
        .eq('tenant_id', tenantId)
        .eq('is_active', true) 
        .maybeSingle(); // Sử dụng maybeSingle để tránh lỗi nếu không tìm thấy

    if (error) {
        console.error(`Lỗi DB khi tìm hợp đồng đang hoạt động cho UID ${tenantId}:`, error.message);
        return null;
    }

    if (!contract) {
        return null; // Không có hợp đồng đang hoạt động
    }
    
    // Tách thông tin căn hộ ra khỏi đối tượng hợp đồng
    const apartmentDetails = contract.Apartment;
    delete contract.Apartment; // Xóa đối tượng Apartment lồng nhau
    
    return {
        ...contract,
        apartment_number: apartmentDetails ? apartmentDetails.apartment_number : null,
        price: apartmentDetails ? apartmentDetails.price : null
    };
};

// GET /api/tenants - XEM DANH SÁCH NGƯỜI THUÊ
router.get('/', requireManager, async (req, res) => {
    try {
        // Lấy danh sách hồ sơ người thuê (TenantProfile)
        const { data: profiles, error } = await supabase
            .from('TenantProfile')
            .select('*')
            .order('fullname', { ascending: true });

        if (error) {
            console.error("Lỗi DB khi lấy danh sách người thuê:", error.message);
            return res.status(500).json({ success: false, message: 'Lỗi hệ thống khi tải danh sách người thuê.' });
        }

        // Map qua profiles để lấy thông tin hợp đồng đang hoạt động
        const tenantsWithContractInfo = await Promise.all(profiles.map(async (tenant) => {
            const activeContract = await getActiveContractDetails(tenant.user_id);

            if (activeContract) {
                // Trả về thông tin Tenant + thông tin Hợp đồng quan trọng
                return {
                    ...tenant,
                    apartment_number: activeContract.apartment_number,
                    apartment_id: activeContract.apartment_id,
                    start_date: activeContract.start_date,
                    end_date: activeContract.end_date,
                    is_currently_tenant: activeContract.is_active 
                };
            }
            
            // Nếu không có hợp đồng đang hoạt động
            return {
                ...tenant,
                apartment_number: null,
                apartment_id: null,
                start_date: null,
                end_date: null,
                is_currently_tenant: false
            };
        }));

        // Trả về thông tin Profile (user_id, fullname,...)
        return res.status(200).json({
            success: true,
            message: 'Tải danh sách người thuê thành công.',
            tenants: tenantsWithContractInfo,
            totalCount: tenantsWithContractInfo.length
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
        // Lấy thông tin hồ sơ người thuê
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

        // Lấy danh sách Hợp đồng của người thuê đó (JOIN với Apartment)
        const activeContractDetails = await getActiveContractDetails(tenantId);

        const { data: historyContracts, error: contractError } = await supabase
            .from('Contract')
            .select(`
                contract_id,
                tenant_id,
                apartment_id,
                start_date,
                end_date,
                deposit_amount,
                is_active,
                Apartment(apartment_number, price)
            `)
            .eq('tenant_id', tenantId)
            .order('start_date', { ascending: false });

        if (contractError) {
            console.error("Lỗi DB khi lấy hợp đồng:", contractError.message);
            // Vẫn trả về thông tin profile nếu lỗi hợp đồng không nghiêm trọng
        }

        // Kết hợp dữ liệu và trả về
        const responseData = {
            success: true,
            message: 'Tải chi tiết người thuê và lịch sử hợp đồng thành công.',
            tenant: {
                ...profile,
                
                // THÔNG TIN HỢP ĐỒNG ĐANG HOẠT ĐỘNG
                current_contract: activeContractDetails || null,
                
                // LỊCH SỬ HỢP ĐỒNG (Tất cả hợp đồng)
                contract_history: historyContracts ? historyContracts.map(c => ({
                    ...c,
                    // Đưa thông tin apartment lên cùng cấp
                    apartment_number: c.Apartment ? c.Apartment.apartment_number : null,
                    price: c.Apartment ? c.Apartment.price : null,
                    Apartment: undefined // Loại bỏ đối tượng lồng nhau ban đầu
                })) : []
            }
        };
        
        return res.status(200).json(responseData);
        
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