const express = require('express');
const router = express.Router();
const { supabase } = require('../../supabaseClient.js');
const { requireManager } = require('../../middlewares/authMiddleware.js'); 

// ======================================================================
// ROUTE GHI NHẬN HỢP ĐỒNG (CONTRACT) - CHỈ MANAGER
// ======================================================================

// POST /api/contracts - GHI NHẬN HỢP ĐỒNG MỚI
router.post('/', requireManager, async (req, res) => {
    const { 
        contract_id, 
        tenant_id, 
        apartment_id, 
        start_date, 
        end_date, 
        deposit_amount
    } = req.body;

    const manager_id = req.user.id; 

    if (!contract_id || !tenant_id || !apartment_id || !start_date || !end_date || !deposit_amount) {
        return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc cho hợp đồng.' });
    }

    try {
        // Kiểm tra trạng thái căn hộ: Đảm bảo căn hộ đang "Còn trống"
        const { data: apartment, error: apError } = await supabase
            .from('Apartment')
            .select('status')
            .eq('apartment_id', apartment_id)
            .single();

        if (apError || !apartment) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy căn hộ hoặc lỗi hệ thống.' });
        }

        if (apartment.status !== 'Còn trống') {
            return res.status(409).json({ success: false, message: `Căn hộ ${apartment_id} hiện đang ở trạng thái "${apartment.status}". Không thể tạo hợp đồng mới.` });
        }


        // Ghi nhận Hợp đồng vào bảng Contract
        const contractPayload = {
            contract_id,
            tenant_id,
            apartment_id,
            start_date,
            end_date,
            deposit_amount,
            is_active: true // Mặc định là active khi tạo
        };
        
        const { data: newContract, error: contractInsertError } = await supabase
            .from('Contract')
            .insert([contractPayload])
            .select();
            
        if (contractInsertError) {
             console.error("Lỗi DB khi thêm hợp đồng:", contractInsertError.message);
             if (contractInsertError.code === '23505') { 
                return res.status(409).json({ success: false, message: 'Mã hợp đồng này đã tồn tại.' });
            }
             if (contractInsertError.code === '23503') { 
                return res.status(400).json({ success: false, message: 'ID người thuê hoặc ID căn hộ không hợp lệ (Khóa ngoại bị vi phạm).' });
            }
            return res.status(500).json({ success: false, message: 'Lỗi hệ thống khi tạo hợp đồng.' });
        }

        // Cập nhật trạng thái Căn hộ thành "Đang thuê"
        const { data: updatedApartment, error: apUpdateError } = await supabase
            .from('Apartment')
            .update({ status: 'Đang thuê' })
            .eq('apartment_id', apartment_id)
            .select('apartment_id, status');
            
        if (apUpdateError) {
            console.error("LỖI KHÔNG ĐỒNG BỘ: Cập nhật căn hộ thất bại:", apUpdateError.message);
            // THÔNG BÁO QUAN TRỌNG: Mặc dù hợp đồng đã được tạo, căn hộ chưa đổi trạng thái.
            return res.status(500).json({ 
                success: false, 
                message: 'Đã tạo Hợp đồng, nhưng LỖI không thể cập nhật trạng thái Căn hộ thành "Đang thuê". Cần kiểm tra thủ công.',
                contract: newContract[0],
                apartment_error: apUpdateError.message
            });
        }


        // Thành công
        return res.status(201).json({ 
            success: true, 
            message: 'Ghi nhận hợp đồng thành công và Căn hộ đã chuyển sang trạng thái Đang thuê.',
            contract: newContract[0],
            apartment_status: updatedApartment[0].status
        });

    } catch (error) {
        console.error("Lỗi hệ thống khi ghi nhận hợp đồng:", error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
    }
});

module.exports = router;
