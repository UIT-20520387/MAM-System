const express = require('express');
const router = express.Router();
const { supabase } = require('../../supabaseClient.js');
const {requireAdmin} = require('../../middlewares/authMiddleware.js');

// GET /api/roomtype: Lấy danh sách tất cả các loại phòng dành cho Admin
router.get('/', requireAdmin, async (req, res) => {
    try {
        // Lệnh .select('*') lấy tất cả các cột từ bảng RoomType
        const { data, error } = await supabase
            .from('RoomType')
            .select('*')
            .order('type_id', { ascending: true });

        if (error) {
            console.error("Lỗi DB khi lấy danh sách loại phòng:", error.message);
            return res.status(500).json({ success: false, message: 'Lỗi hệ thống khi tải danh sách loại phòng.' });
        }

        // Trả về dữ liệu thành công
        return res.status(200).json({
            success: true,
            message: 'Tải danh sách loại phòng thành công.',
            roomTypes: data
        });

    } catch (error) {
        console.error("Lỗi hệ thống khi lấy danh sách loại phòng:", error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
    }
});

// POST /api/roomtype: Tạo loại phòng mới cho admin
router.post('/', requireAdmin, async (req, res) => {
    // Nhận dữ liệu từ body request
    const { type_id, type_name, base_price, description } = req.body;

    if (!type_id || !type_name || base_price === undefined) {
        return res.status(400).send({ success: false, message: 'Thiếu thông tin bắt buộc: type_id, type_name, base_price.' });
    }

    try {
        // Lệnh .insert() để chèn dữ liệu vào bảng RoomType
        const { data, error } = await supabase
            .from('RoomType')
            .insert([{
                type_id: type_id,
                type_name: type_name,
                base_price: base_price,
                description: description || null 
            }])
            .select();

        if (error) {
            console.error("Lỗi DB khi thêm loại phòng:", error.message);
            // Xử lý lỗi trùng lặp (nếu bạn đặt type_name là Unique)
            if (error.code === '23505') { 
                return res.status(409).json({ success: false, message: 'Mã loại phòng (type_id) này đã tồn tại.' });
            }
            return res.status(500).json({ success: false, message: 'Lỗi hệ thống khi thêm loại phòng.' });
        }

        res.status(201).json({ 
            success: true, 
            message: `Loại phòng '${type_name}' đã được tạo thành công.`, 
            roomType: data[0]
        });

    } catch (error) {
        console.error("Lỗi hệ thống khi thêm loại phòng:", error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
    }
});

// GET /api/roomtype/:id: Xem chi tiết loại phòng
router.get('/:id', requireAdmin, async (req, res) => {
    const roomTypeId = req.params.id;

    try {
        // Sử dụng .select('*').eq() để lọc theo type_id
        const { data, error } = await supabase
            .from('RoomType')
            .select('*')
            .eq('type_id', roomTypeId) 
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ success: false, message: 'Không tìm thấy loại phòng này.' });
            }
            console.error("Lỗi DB khi lấy chi tiết loại phòng:", error.message);
            return res.status(500).json({ success: false, message: 'Lỗi hệ thống khi tải chi tiết loại phòng.' });
        }
        

        return res.status(200).json({
            success: true,
            message: 'Tải chi tiết loại phòng thành công.',
            roomType: data
        });

    } catch (error) {
        console.error("Lỗi hệ thống khi lấy chi tiết loại phòng:", error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
    }
});

// PATCH /api/roomtype/:id: Sửa thông tin loại phòng
router.patch('/:id', requireAdmin, async (req, res) => {
    const roomTypeId = req.params.id;
    const { type_name, description, base_price } = req.body; 

    const updatePayload = {};

    if (type_name !== undefined) updatePayload.type_name = type_name;
    if (description !== undefined) updatePayload.description = description;
    if (base_price !== undefined) updatePayload.base_price = base_price;

    // Kiểm tra xem body có dữ liệu để cập nhật không
    if (Object.keys(updatePayload).length === 0) {
        return res.status(400).json({ success: false, message: 'Không có thông tin nào được gửi để cập nhật.' });
    }


    try {
        // Lệnh .update(updateData).eq() để cập nhật và lọc theo type_id
        const {  data, error } = await supabase
            .from('RoomType')
            .update(updatePayload)
            .eq('type_id', roomTypeId)
            .select();

        if (error) {
            console.error("Lỗi DB khi sửa loại phòng:", error.message);
            return res.status(500).json({ success: false, message: 'Lỗi hệ thống khi sửa thông tin loại phòng.' });
        }

        if (data.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy loại phòng để sửa.' });
        }

        return res.status(200).json({
            success: true,
            message: 'Cập nhật loại phòng thành công.',
            roomType: data[0]
        });

    } catch (error) {
        console.error("Lỗi hệ thống khi cập nhật loại phòng:", error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
    }
});

// DELETE /api/roomtype/:id: Xoá loại phòng
router.delete('/:id', requireAdmin, async (req, res) => {
    const roomTypeId = req.params.id;

    try {
        // Lệnh .delete().eq() để xóa bản ghi và lọc theo type_id
        const { error, data } = await supabase
            .from('RoomType')
            .delete()
            .eq('type_id', roomTypeId)
            .select();

        if (error) {
            console.error("Lỗi DB khi xóa loại phòng:", error.message);
            if (error.code === '23503') {
                return res.status(409).json({ success: false, message: 'Không thể xóa loại phòng vì nó đang liên kết với dữ liệu khác (ví dụ: Apartment). Cần xóa các liên kết trước.' });
            }
            return res.status(500).json({ success: false, message: 'Lỗi hệ thống khi xóa loại phòng.' });
        }

        if (data.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy loại phòng để xóa.' });
        }

        return res.status(200).json({ 
            success: true, 
            message: `Loại phòng ID ${roomTypeId} đã được xóa thành công.` 
        });

    } catch (error) {
        console.error("Lỗi hệ thống khi xóa loại phòng:", error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
    }
});

module.exports = router;