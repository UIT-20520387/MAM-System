const express = require("express");
const router = express.Router();
const { supabase } = require("../../supabaseClient");
const { requireManager } = require("../../middlewares/authMiddleware");

/**
 * Helper: lấy BUSINESS_DATE
 */
async function getBusinessDate() {
  const { data, error } = await supabase
    .from("SystemConfig")
    .select("config_value")
    .eq("config_key", "BUSINESS_DATE")
    .single();

  if (error || !data) {
    throw new Error("BUSINESS_DATE chưa được cấu hình");
  }

  return new Date(data.config_value);
}

/**
 * Helper: lấy tháng billing (YYYY-MM-01)
 */
function getBillingMonth(businessDate) {
  return new Date(businessDate.getFullYear(), businessDate.getMonth(), 1);
}

/**
 * =========================================================
 * GET /api/finance/due-apartments
 * =========================================================
 */
router.get("/due-apartments", requireManager, async (req, res) => {
  try {
    const businessDate = await getBusinessDate();
    const billingMonth = getBillingMonth(businessDate);

    // Lấy các hợp đồng đang active
    const { data: contracts, error } = await supabase
      .from("Contract")
      .select(
        `
                contract_id,
                start_date,
                apartment:Apartment(apartment_id, apartment_number),
                tenant:TenantProfile(fullname)
            `,
      )
      .eq("is_active", true);

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    const result = [];

    for (const c of contracts) {
      // Kiểm tra đã có bill chưa
      const { data: billExists } = await supabase
        .from("Bill")
        .select("bill_id")
        .eq("contract_id", c.contract_id)
        .eq("billing_month", billingMonth.toISOString().slice(0, 10))
        .maybeSingle();

      if (billExists) continue;

      // Kiểm tra đã từng có bill nào trước đây chưa
      const { count: billCount } = await supabase
        .from("Bill")
        .select("*", { count: "exact", head: true })
        .eq("contract_id", c.contract_id);

      const isFirstMonth = billCount === 0;

      result.push({
        apartment_id: c.apartment.apartment_id,
        apartment_number: c.apartment.apartment_number,
        tenant_name: c.tenant.fullname,
        contract_id: c.contract_id,
        is_first_month: isFirstMonth,
      });
    }

    res.json({
      success: true,
      billing_month: billingMonth,
      apartments: result,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * =========================================================
 * GET /api/finance/prepare-billing
 * =========================================================
 */
router.get("/prepare-billing", requireManager, async (req, res) => {
  const { apartment_id } = req.query;

  if (!apartment_id) {
    return res
      .status(400)
      .json({ success: false, message: "Thiếu apartment_id" });
  }

  try {
    const businessDate = await getBusinessDate();
    const billingMonth = getBillingMonth(businessDate);

    // Lấy hợp đồng
    const { data: contract, error } = await supabase
      .from("Contract")
      .select("*")
      .eq("apartment_id", apartment_id)
      .eq("is_active", true)
      .single();

    if (error || !contract) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy hợp đồng hợp lệ" });
    }

    // Lấy utility
    const { data: utilities } = await supabase
      .from("Utility")
      .select("utility_id");

    const utilityData = [];

    for (const u of utilities) {
      const { data: lastReading } = await supabase
        .from("UtilityReading")
        .select("end_index")
        .eq("apartment_id", apartment_id)
        .eq("utility_id", u.utility_id)
        .lte("reading_month", billingMonth.toISOString().slice(0, 10))
        .order("reading_month", { ascending: false })
        .limit(1)
        .maybeSingle();

      utilityData.push({
        utility_id: u.utility_id,
        last_end_index: lastReading ? lastReading.end_index : null,
      });
    }

    // Lấy dịch vụ
    const { data: services } = await supabase
      .from("ContractService")
      .select("service:Service(name, price)")
      .eq("contract_id", contract.contract_id)
      .lte("start_month", billingMonth.toISOString().slice(0, 10))
      .or(
        `end_month.is.null,end_month.gte.${billingMonth.toISOString().slice(0, 10)}`,
      );

    const startMonth = contract.start_date.slice(0, 7); // YYYY-MM
    const billingMonthStr = billingMonth.toISOString().slice(0, 7); // YYYY-MM

    const isFirstMonth = startMonth === billingMonthStr;

    res.json({
      success: true,
      billing_month: billingMonth,
      utilities: utilityData,
      services: services.map((s) => s.service),
      is_first_month: isFirstMonth,
      deposit_amount: contract.deposit_amount,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * =========================================================
 * POST /api/finance/bill
 * =========================================================
 */
router.post("/bill", requireManager, async (req, res) => {
  const manager_id = req.user.id;
  const { apartment_id, utility_readings } = req.body;

  if (!apartment_id || !utility_readings) {
    return res.status(400).json({ success: false, message: "Thiếu dữ liệu" });
  }

  try {
    /* =========================
       1. BUSINESS DATE
    ========================= */

    const { data: config } = await supabase
      .from("SystemConfig")
      .select("config_value")
      .eq("config_key", "BUSINESS_DATE")
      .single();

    const billingMonth = config.config_value;

    /* =========================
       2. CONTRACT ĐANG HIỆU LỰC
    ========================= */
    const { data: contract } = await supabase
      .from("Contract")
      .select("contract_id, deposit_amount")
      .eq("apartment_id", apartment_id)
      .eq("is_active", true)
      .single();

    if (!contract) {
      return res.status(400).json({ message: "Không có hợp đồng hiệu lực" });
    }

    /* =========================
       3. KIỂM TRA BILL ĐẦU
    ========================= */
    const { count } = await supabase
      .from("Bill")
      .select("*", { count: "exact", head: true })
      .eq("contract_id", contract.contract_id);

    const isFirstBill = count === 0;

    /* =========================
       4. TÍNH ĐIỆN NƯỚC + LƯU READING
    ========================= */
    let totalAmount = 0;
    const billDetails = [];

    for (const r of utility_readings) {
      const { utility_id, end_index } = r;

      const { data: lastReading } = await supabase
        .from("UtilityReading")
        .select("end_index")
        .eq("apartment_id", apartment_id)
        // .lt("reading_month", billingMonth)
        .eq("utility_id", utility_id)
        .order("reading_month", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const startIndex = lastReading?.end_index ?? 0;
      const usage = end_index - startIndex;

      if (usage < 0) {
        return res.status(400).json({
          message: `Chỉ số ${utility_id} không hợp lệ`,
        });
      }

      /* ---- LẤY ĐƠN GIÁ ĐÚNG THỜI ĐIỂM ---- */
      const { data: rate } = await supabase
        .from("UtilityRate")
        .select("unit_price")
        .eq("utility_id", utility_id)
        .lte("effective_from", billingMonth)
        .or(`effective_to.is.null,effective_to.gte.${billingMonth}`)
        .order("effective_from", { ascending: false })
        .limit(1)
        .single();

      const amount = usage * rate.unit_price;
      totalAmount += amount;

      billDetails.push({
        item_name: utility_id,
        amount,
      });

      /* ---- LƯU UtilityReading ---- */
      await supabase.from("UtilityReading").insert({
        apartment_id,
        utility_id,
        start_index: startIndex,
        end_index,
        reading_month: billingMonth,
        manager_id,
      });
    }

    /* ---- Phí dịch vụ (ContractService) ---- */
    const { data: contractServices } = await supabase
      .from("ContractService")
      .select(
        `
    service_id,
    Service (
      name,
      price
    )
  `,
      )
      .eq("contract_id", contract.contract_id)
      .lte("start_month", billingMonth)
      .or(
        `end_month.is.null,end_month.gte.${billingMonth}`,
      );

    if (contractServices && contractServices.length > 0) {
      for (const cs of contractServices) {
        const serviceName = cs.Service?.name;
        const servicePrice = cs.Service?.price ?? 0;

        if (servicePrice > 0) {
          billDetails.push({
            item_name: serviceName,
            amount: servicePrice,
          });

          totalAmount += servicePrice;
        }
      }
    }

    /* =========================
       5. TIỀN CỌC / TIỀN THUÊ
    ========================= */
    if (isFirstBill) {
      billDetails.push({
        item_name: "Tiền cọc",
        amount: contract.deposit_amount,
      });
      totalAmount += contract.deposit_amount;
    } else {
      const { data: apartment } = await supabase
        .from("Apartment")
        .select("price")
        .eq("apartment_id", apartment_id)
        .single();

      billDetails.push({
        item_name: "Tiền thuê tháng",
        amount: apartment.price,
      });
      totalAmount += apartment.price;
    }

    /* =========================
       6. TẠO BILL
    ========================= */
    const dueDate = billingMonth.slice(0, 7) + "-10";

    const { data: bill } = await supabase
      .from("Bill")
      .insert({
        contract_id: contract.contract_id,
        billing_month: billingMonth,
        total_amount: totalAmount,
        status: "Chưa thanh toán",
        due_date: dueDate,
      })
      .select()
      .single();

    /* =========================
       7. BILL DETAIL
    ========================= */
    await supabase.from("BillDetail").insert(
      billDetails.map((d) => ({
        bill_id: bill.bill_id,
        item_name: d.item_name,
        amount: d.amount,
      })),
    );

    return res.json({
      message: "Tạo hoá đơn thành công",
      bill_id: bill.bill_id,
      total_amount: totalAmount,
      is_first_month: isFirstBill,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
});

module.exports = router;
