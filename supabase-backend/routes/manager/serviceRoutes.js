const express = require("express");
const router = express.Router();
const { supabase } = require("../../supabaseClient.js");
const { requireManager } = require("../../middlewares/authMiddleware.js");

// POST /api/services - THÊM DỊCH VỤ MỚI
router.post('/', requireManager, async (req, res) => {
    const { service_id, name, price, description, status } = req.body;
    const manager_id = req.user.id; // Lấy ID của Manager đang đăng nhập

    if (!service_id || !name || !price || !status) {
        return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc' });
    }

    try {
        const { data, error } = await supabase
            .from('Service')
            .insert([{
                service_id,
                manager_id,
                name,
                price,
                description: description || '',
                status
            }])
            .select();

        if (error) {
            console.error("Lỗi DB khi thêm dịch vụ:", error.message);
            if (error.code === '23505') { 
                return res.status(409).json({ success: false, message: 'Mã dịch vụ này đã tồn tại.' });
            }         
            return res.status(500).json({ success: false, message: 'Lỗi hệ thống khi thêm dịch vụ.' });
        }

        return res.status(201).json({ 
            success: true, 
            message: 'Thêm dịch thành công.',
            service: data[0]
        });
    } catch (error) {
        console.error("Lỗi hệ thống khi thêm dịch vụ:", error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
    }
});

// router.post("/", requireManager, async (req, res) => {
//   const manager_id = req.user.id;
//   const { service_id, name, price, description, status } = req.body;

//   if (!service_id || !name || !price || !status) {
//     return res.status(400).json({ success: false, message: "Thiếu dữ liệu" });
//   }

//   const { error } = await supabase.from("Service").insert({
//     service_id,
//     manager_id,
//     name,
//     price,
//     status,
//     description: description || '',
//     created_at,
//   });

//   if (error) {
//     return res.status(500).json({ success: false, message: error.message });
//   }

//   res.json({ success: true, message: "Tạo dịch vụ thành công" });
// });

// GET /api/services - XEM DANH SÁCH TẤT CẢ DỊCH VỤ
router.get("/", requireManager, async (req, res) => {
  const manager_id = req.user.id;

  const { data, error } = await supabase
    .from("Service")
    .select("*")
    .eq("manager_id", manager_id);

  if (error) {
    return res.status(500).json({ success: false, message: error.message });
  }

  res.json({ success: true, services: data });
});

// GET /api/services/:id - XEM CHI TIẾT DỊCH VỤ
router.get("/:id", requireManager, async (req, res) => {
  const { id } = req.params;
  const manager_id = req.user.id;

  const { data, error } = await supabase
    .from("Service")
    .select("*")
    .eq("service_id", id)
    .eq("manager_id", manager_id)
    .single();

  if (error || !data) {
    return res
      .status(404)
      .json({ success: false, message: "Không tìm thấy dịch vụ" });
  }

  res.json({ success: true, service: data });
});

// PATCH /api/services/:id - SỬA THÔNG TIN DỊCH VỤ
router.patch('/:id', requireManager, async (req, res) => {
    const serviceId = req.params.id;
    // Bỏ qua trường manager_id và status
    const { name, price, description } = req.body; 
    
    const updatePayload = {};
    if (name !== undefined) updatePayload.name = name;
    if (price !== undefined) updatePayload.price = price;
    if (description !== undefined) updatePayload.description = description;

    if (Object.keys(updatePayload).length === 0) {
        return res.status(400).json({ success: false, message: 'Không có thông tin nào được gửi để cập nhật.' });
    }

    try {
        const { data, error } = await supabase
            .from('Service')
            .update(updatePayload)
            .eq('service_id', serviceId)
            .select();

        if (error) {
            console.error("Lỗi DB khi sửa dịch vụ:", error.message);
            return res.status(500).json({ success: false, message: 'Lỗi hệ thống khi sửa thông tin căn hộ.' });
        }
        
        if (data.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy dịch vụ để sửa.' });
        }

        return res.status(200).json({
            success: true,
            message: 'Cập nhật thông tin dịch vụ thành công.',
            service: data[0]
        });
    } catch (error) {
        console.error("Lỗi hệ thống khi sửa dịch vụ:", error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
    }
});

// router.patch("/:id", requireManager, async (req, res) => {
//   const { id } = req.params;
//   const manager_id = req.user.id;
//   const { name, price, description, status } = req.body;

//   // Chỉ build object update từ field được gửi lên
//   const updateData = {};

//   if (name !== undefined) updateData.name = name;
//   if (price !== undefined) updateData.price = price;
//   if (description !== undefined) updateData.description = description;
//   if (status !== undefined) updateData.status = status;

//   // Không có gì để update
//   if (Object.keys(updateData).length === 0) {
//     return res.status(400).json({
//       success: false,
//       message: "Không có dữ liệu cần cập nhật",
//     });
//   }

//   const { error } = await supabase
//     .from("Service")
//     .update(updateData)
//     .eq("service_id", id)
//     .eq("manager_id", manager_id);

//   if (error) {
//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }

//   res.json({
//     success: true,
//     message: "Cập nhật dịch vụ thành công",
//   });
// });

// PATCH /api/services/:id/status - CẬP NHẬT TRẠNG THÁI DỊCH VỤ (API riêng biệt, chỉ Manager)
router.patch("/:id/status", requireManager, async (req, res) => {
  const serviceId = req.params.id;
  const { status } = req.body;

  if (!status) {
    return res
      .status(400)
      .json({
        success: false,
        message: "Vui lòng cung cấp trạng thái mới (status).",
      });
  }

  try {
    const { data, error } = await supabase
      .from("Service")
      .update({ status })
      .eq("service_id", serviceId)
      .select();

    if (error) {
      console.error("Lỗi DB khi cập nhật trạng thái:", error.message);
      return res
        .status(500)
        .json({
          success: false,
          message: "Lỗi hệ thống khi cập nhật trạng thái.",
        });
    }

    if (data.length === 0) {
      return res
        .status(404)
        .json({
          success: false,
          message: "Không tìm thấy dịch vụ để cập nhật trạng thái.",
        });
    }

    return res.status(200).json({
      success: true,
      message: `Cập nhật trạng thái dịch vụ thành công. Trạng thái mới: ${status}`,
      service: data[0],
    });
  } catch (error) {
    console.error("Lỗi hệ thống khi cập nhật trạng thái:", error);
    res.status(500).json({ success: false, message: "Lỗi hệ thống." });
  }
});

// DELETE /api/services/:id - XOÁ DỊCH VỤ
router.delete("/:id", requireManager, async (req, res) => {
  const { id } = req.params;
  const manager_id = req.user.id;

  const { error } = await supabase
    .from("Service")
    .delete()
    .eq("service_id", id)
    .eq("manager_id", manager_id);

  if (error) {
    return res.status(500).json({ success: false, message: error.message });
  }

  res.json({ success: true, message: "Đã xoá dịch vụ" });
});

// POST /api/services/assign - GÁN DỊCH VỤ VÀO CONTRACT
router.post("/assign", requireManager, async (req, res) => {
  const { contract_id, service_id, start_month } = req.body;

  if (!contract_id || !service_id || !start_month) {
    return res.status(400).json({ success: false, message: "Thiếu dữ liệu" });
  }

  const { error } = await supabase.from("ContractService").insert({
    contract_id,
    service_id,
    start_month,
  });

  if (error) {
    return res.status(500).json({ success: false, message: error.message });
  }

  res.json({ success: true, message: "Gán dịch vụ cho hợp đồng thành công" });
});

module.exports = router;
