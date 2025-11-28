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
            .select('*');

        if (error) {
            console.error("Lỗi Supabase (GET RoomType):", error.message);
            throw new Error(error.message);
        }

        // Trả về dữ liệu thành công
        res.status(200).send({ 
            success: true, 
            data: data 
        });

    } catch (error) {
        console.error("Lỗi hệ thống khi lấy danh sách loại phòng:", error);
        res.status(500).send({ success: false, message: 'Lỗi hệ thống khi truy vấn loại phòng.' });
    }
});

// POST /api/roomtype: Tạo loại phòng mới cho admin
router.post('/', requireAdmin, async (req, res) => {
    // Nhận dữ liệu từ body request
    const { type_name, base_price, description } = req.body;

    if (!type_name || base_price === undefined) {
        return res.status(400).send({ success: false, message: 'Thiếu Tên loại phòng hoặc Giá cơ sở.' });
    }

    try {
        // Lệnh .insert() để chèn dữ liệu vào bảng RoomType
        // Ghi chú: Cột type_id (UUID) sẽ được tự động tạo do bạn đã cấu hình Default Value
        const { error: dbError } = await supabase
            .from('RoomType')
            .insert({
                type_name: type_name,
                base_price: base_price,
                description: description || null // Đảm bảo cột description được xử lý đúng
            });

        if (dbError) {
            console.error("Lỗi Supabase (POST RoomType):", dbError.message);
            // Xử lý lỗi trùng lặp (nếu bạn đặt type_name là Unique)
            if (dbError.code === '23505') { 
                return res.status(409).send({ success: false, message: 'Tên loại phòng đã tồn tại.' });
            }
            throw new Error(dbError.message);
        }

        res.status(201).send({ 
            success: true, 
            message: `Loại phòng '${type_name}' đã được tạo thành công.` 
        });

    } catch (error) {
        console.error("Lỗi hệ thống khi tạo loại phòng:", error);
        res.status(500).send({ success: false, message: 'Lỗi hệ thống khi tạo loại phòng.' });
    }
});

// GET /api/roomtype/:id: Xem chi tiết loại phòng
router.get('/:id', requireAdmin, async (req, res) => {
    // Lấy ID từ URL parameter
    const typeId = req.params.id;

    try {
        // Sử dụng .select('*').eq() để lọc theo type_id
        const { data, error } = await supabase
            .from('RoomType')
            .select('*')
            .eq('type_id', typeId) // Lọc nơi type_id bằng typeId từ param
            .single(); // Chỉ mong đợi một kết quả

        if (error) {
            console.error("Lỗi Supabase (GET RoomType Detail):", error.message);
            throw new Error(error.message);
        }
        
        // Kiểm tra nếu không tìm thấy
        if (!data) {
            return res.status(404).send({ success: false, message: 'Không tìm thấy loại phòng.' });
        }

        res.status(200).send({ 
            success: true, 
            data: data 
        });

    } catch (error) {
        console.error("Lỗi hệ thống khi lấy chi tiết loại phòng:", error);
        res.status(500).send({ success: false, message: 'Lỗi hệ thống khi truy vấn chi tiết loại phòng.' });
    }
});

// PUT /api/roomtype/:id: Sửa thông tin loại phòng
router.put('/:id', requireAdmin, async (req, res) => {
    const typeId = req.params.id;
    // Lấy tất cả dữ liệu từ body (có thể chỉ cập nhật một phần)
    const updateData = req.body; 

    // Kiểm tra xem body có dữ liệu để cập nhật không
    if (Object.keys(updateData).length === 0) {
        return res.status(400).send({ success: false, message: 'Không có dữ liệu để cập nhật.' });
    }

    try {
        // Lệnh .update(updateData).eq() để cập nhật và lọc theo type_id
        const { error: dbError } = await supabase
            .from('RoomType')
            .update(updateData)
            .eq('type_id', typeId);

        if (dbError) {
            console.error("Lỗi Supabase (PUT RoomType):", dbError.message);
            throw new Error(dbError.message);
        }

        res.status(200).send({ 
            success: true, 
            message: `Loại phòng ID ${typeId} đã được cập nhật thành công.` 
        });

    } catch (error) {
        console.error("Lỗi hệ thống khi cập nhật loại phòng:", error);
        res.status(500).send({ success: false, message: 'Lỗi hệ thống khi cập nhật loại phòng.' });
    }
});

// DELETE /api/roomtype/:id: Xoá loại phòng
router.delete('/:id', requireAdmin, async (req, res) => {
    const typeId = req.params.id;

    try {
        // Lệnh .delete().eq() để xóa bản ghi và lọc theo type_id
        const { error: dbError } = await supabase
            .from('RoomType')
            .delete()
            .eq('type_id', typeId);

        if (dbError) {
            console.error("Lỗi Supabase (DELETE RoomType):", dbError.message);
            
            // Xử lý lỗi Ràng buộc Khóa ngoại (nếu có Apartment đang sử dụng type_id này)
            if (dbError.code === '23503') { 
                return res.status(409).send({ success: false, message: 'Không thể xóa: Có căn hộ đang sử dụng loại phòng này.' });
            }
            throw new Error(dbError.message);
        }

        res.status(200).send({ 
            success: true, 
            message: `Loại phòng ID ${typeId} đã được xóa thành công.` 
        });

    } catch (error) {
        console.error("Lỗi hệ thống khi xóa loại phòng:", error);
        res.status(500).send({ success: false, message: 'Lỗi hệ thống khi xóa loại phòng.' });
    }
});

module.exports = router;