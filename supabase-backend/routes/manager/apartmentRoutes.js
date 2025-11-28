const express = require('express');
const router = express.Router();
const { supabase } = require('../../supabaseClient.js');
const {requireManager} = require('../../middlewares/authMiddleware.js');

// POST /api/apartments - THÊM CĂN HỘ MỚI
router.post('/', requireManager, async (req, res) => {
    // Lưu ý: Căn hộ được thêm phải gắn với manager_id của người tạo
    const { apartment_id, type_id, apartment_number, area, price, furniture, status } = req.body;
    const manager_id = req.user.id; // Lấy ID của Manager đang đăng nhập

    if (!apartment_id || !type_id || !apartment_number || !area || !price || !status) {
        return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc: apartment_id, type_id, apartment_number, area, price, status.' });
    }

    try {
        const { data, error } = await supabase
            .from('Apartment')
            .insert([{
                apartment_id,
                type_id,
                manager_id,
                apartment_number,
                area,
                price,
                furniture: furniture || '',
                status
            }])
            .select();

        if (error) {
            console.error("Lỗi DB khi thêm căn hộ:", error.message);
            if (error.code === '23505') { 
                return res.status(409).json({ success: false, message: 'Mã căn hộ này đã tồn tại.' });
            }
            // Thêm kiểm tra lỗi khóa ngoại (ví dụ: type_id không tồn tại)
            if (error.code === '23503') {
                 return res.status(400).json({ success: false, message: 'Loại phòng (type_id) không tồn tại. Vui lòng kiểm tra lại.' });
            }
            return res.status(500).json({ success: false, message: 'Lỗi hệ thống khi thêm căn hộ.' });
        }

        return res.status(201).json({ 
            success: true, 
            message: 'Thêm căn hộ thành công.',
            apartment: data[0]
        });
    } catch (error) {
        console.error("Lỗi hệ thống khi thêm căn hộ:", error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
    }
});

// GET /api/apartments - XEM DANH SÁCH TẤT CẢ CĂN HỘ
router.get('/', requireManager, async (req, res) => {
    try {
        // Lấy tất cả căn hộ và JOIN với thông tin loại phòng
        const { data, error } = await supabase
            .from('Apartment')
            .select('*, RoomType!inner(*), manager_id') 
            .order('apartment_num', { ascending: true }); 

        if (error) {
            console.error("Lỗi DB khi lấy danh sách căn hộ:", error.message);
            return res.status(500).json({ success: false, message: 'Lỗi hệ thống khi tải danh sách căn hộ.' });
        }

        return res.status(200).json({
            success: true,
            message: 'Tải danh sách căn hộ thành công.',
            apartments: data,
            totalCount: data.length
        });
    } catch (error) {
        console.error("Lỗi hệ thống khi lấy danh sách căn hộ:", error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
    }
});

// GET /api/apartments/:id - XEM CHI TIẾT CĂN HỘ
router.get('/:id', requireManager, async (req, res) => {
    const apartmentId = req.params.id;

    try {
        const { data, error } = await supabase
            .from('Apartment')
            .select('*, RoomType!inner(*), manager_id') 
            .eq('apartment_id', apartmentId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ success: false, message: 'Không tìm thấy căn hộ này.' });
            }
            console.error("Lỗi DB khi lấy chi tiết căn hộ:", error.message);
            return res.status(500).json({ success: false, message: 'Lỗi hệ thống khi tải chi tiết căn hộ.' });
        }

        return res.status(200).json({
            success: true,
            message: 'Tải chi tiết căn hộ thành công.',
            apartment: data
        });
    } catch (error) {
        console.error("Lỗi hệ thống khi lấy chi tiết căn hộ:", error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
    }
});

// PATCH /api/apartments/:id - SỬA THÔNG TIN CĂN HỘ
router.patch('/:id', requireManager, async (req, res) => {
    const apartmentId = req.params.id;
    // Bỏ qua trường manager_id và status
    const { type_id, apartment_number, area, price, furniture } = req.body; 
    
    const updatePayload = {};
    if (type_id !== undefined) updatePayload.type_id = type_id;
    if (apartment_number !== undefined) updatePayload.apartment_number = apartment_number;
    if (area !== undefined) updatePayload.area = area;
    if (price !== undefined) updatePayload.price = price;
    if (furniture !== undefined) updatePayload.furniture = furniture;

    if (Object.keys(updatePayload).length === 0) {
        return res.status(400).json({ success: false, message: 'Không có thông tin nào được gửi để cập nhật.' });
    }

    try {
        const { data, error } = await supabase
            .from('Apartment')
            .update(updatePayload)
            .eq('apartment_id', apartmentId)
            .select();

        if (error) {
            console.error("Lỗi DB khi sửa căn hộ:", error.message);
             // Kiểm tra lỗi khóa ngoại
            if (error.code === '23503') {
                 return res.status(400).json({ success: false, message: 'Loại phòng (type_id) không tồn tại. Vui lòng kiểm tra lại.' });
            }
            return res.status(500).json({ success: false, message: 'Lỗi hệ thống khi sửa thông tin căn hộ.' });
        }
        
        if (data.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy căn hộ để sửa.' });
        }

        return res.status(200).json({
            success: true,
            message: 'Cập nhật thông tin căn hộ thành công.',
            apartment: data[0]
        });
    } catch (error) {
        console.error("Lỗi hệ thống khi sửa căn hộ:", error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
    }
});

// PATCH /api/apartments/:id/status - CẬP NHẬT TRẠNG THÁI CĂN HỘ (API riêng biệt, chỉ Manager)
router.patch('/:id/status', requireManager, async (req, res) => {
    const apartmentId = req.params.id;
    const { status } = req.body; 
    
    if (!status) {
        return res.status(400).json({ success: false, message: 'Vui lòng cung cấp trạng thái mới (status).' });
    }

    try {
        const { data, error } = await supabase
            .from('Apartment')
            .update({ status })
            .eq('apartment_id', apartmentId)
            .select();

        if (error) {
            console.error("Lỗi DB khi cập nhật trạng thái:", error.message);
            return res.status(500).json({ success: false, message: 'Lỗi hệ thống khi cập nhật trạng thái.' });
        }
        
        if (data.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy căn hộ để cập nhật trạng thái.' });
        }

        return res.status(200).json({
            success: true,
            message: `Cập nhật trạng thái căn hộ thành công. Trạng thái mới: ${status}`,
            apartment: data[0]
        });
    } catch (error) {
        console.error("Lỗi hệ thống khi cập nhật trạng thái:", error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
    }
});

// DELETE /api/apartments/:id - XOÁ CĂN HỘ
router.delete('/:id', requireManager, async (req, res) => {
    const apartmentId = req.params.id;

    try {
        const { error, data } = await supabase
            .from('Apartment')
            .delete()
            .eq('apartment_id', apartmentId)
            .select(); // Dùng select để biết có bản ghi nào bị xóa không

        if (error) {
            console.error("Lỗi DB khi xóa căn hộ:", error.message);
            if (error.code === '23503') {
                return res.status(409).json({ success: false, message: 'Không thể xóa căn hộ vì nó đang liên kết với dữ liệu khác (ví dụ: Hợp đồng thuê). Cần xóa các liên kết trước.' });
            }
            return res.status(500).json({ success: false, message: 'Lỗi hệ thống khi xóa căn hộ.' });
        }
        
        if (data.length === 0) {
             return res.status(404).json({ success: false, message: 'Không tìm thấy căn hộ để xóa.' });
        }
        
        return res.status(200).json({
            success: true,
            message: `Căn hộ ID ${apartmentId} đã được xóa thành công.`
        });
    } catch (error) {
        console.error("Lỗi hệ thống khi xóa căn hộ:", error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
    }
});

module.exports = router;
