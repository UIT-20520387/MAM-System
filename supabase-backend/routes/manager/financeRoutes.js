const express = require('express');
const router = express.Router();
const { supabase } = require('../../supabaseClient');
const { requireManager } = require('../../middlewares/authMiddleware');

/**
 * Helper: lấy BUSINESS_DATE
 */
async function getBusinessDate() {
    const { data, error } = await supabase
        .from('SystemConfig')
        .select('config_value')
        .eq('config_key', 'BUSINESS_DATE')
        .single();

    if (error || !data) {
        throw new Error('BUSINESS_DATE chưa được cấu hình');
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
router.get('/due-apartments', requireManager, async (req, res) => {
    try {
        const businessDate = await getBusinessDate();
        const billingMonth = getBillingMonth(businessDate);

        // Lấy các hợp đồng đang active
        const { data: contracts, error } = await supabase
            .from('Contract')
            .select(`
                contract_id,
                start_date,
                apartment:Apartment(apartment_id, apartment_number),
                tenant:TenantProfile(full_name)
            `)
            .eq('is_active', true);

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        const result = [];

        for (const c of contracts) {
            // Kiểm tra đã có bill chưa
            const { data: billExists } = await supabase
                .from('Bill')
                .select('bill_id')
                .eq('contract_id', c.contract_id)
                .eq('billing_month', billingMonth.toISOString().slice(0, 10))
                .maybeSingle();

            if (billExists) continue;

            const startMonth = new Date(c.start_date);
            const isFirstMonth =
                startMonth.getFullYear() === billingMonth.getFullYear() &&
                startMonth.getMonth() === billingMonth.getMonth();

            result.push({
                apartment_id: c.apartment.apartment_id,
                apartment_number: c.apartment.apartment_number,
                tenant_name: c.tenant.full_name,
                contract_id: c.contract_id,
                is_first_month: isFirstMonth
            });
        }

        res.json({
            success: true,
            billing_month: billingMonth,
            apartments: result
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
router.get('/prepare-billing', requireManager, async (req, res) => {
    const { apartment_id } = req.query;

    if (!apartment_id) {
        return res.status(400).json({ success: false, message: 'Thiếu apartment_id' });
    }

    try {
        const businessDate = await getBusinessDate();
        const billingMonth = getBillingMonth(businessDate);

        // Lấy hợp đồng
        const { data: contract, error } = await supabase
            .from('Contract')
            .select('*')
            .eq('apartment_id', apartment_id)
            .eq('is_active', true)
            .single();

        if (error || !contract) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy hợp đồng hợp lệ' });
        }

        // Lấy utility
        const { data: utilities } = await supabase
            .from('Utility')
            .select('utility_id');

        const utilityData = [];

        for (const u of utilities) {
            const { data: lastReading } = await supabase
                .from('UtilityReading')
                .select('end_index')
                .eq('apartment_id', apartment_id)
                .eq('utility_id', u.utility_id)
                .lt('reading_month', billingMonth.toISOString().slice(0, 10))
                .order('reading_month', { ascending: false })
                .limit(1)
                .maybeSingle();

            utilityData.push({
                utility_id: u.utility_id,
                last_end_index: lastReading ? lastReading.end_index : null
            });
        }

        // Lấy dịch vụ
        const { data: services } = await supabase
            .from('ContractService')
            .select('service:Service(name, price)')
            .eq('contract_id', contract.contract_id)
            .lte('start_month', billingMonth.toISOString().slice(0, 10))
            .or(`end_month.is.null,end_month.gte.${billingMonth.toISOString().slice(0, 10)}`);

        const startMonth = new Date(contract.start_date);
        const isFirstMonth =
            startMonth.getFullYear() === billingMonth.getFullYear() &&
            startMonth.getMonth() === billingMonth.getMonth();

        res.json({
            success: true,
            billing_month: billingMonth,
            utilities: utilityData,
            services: services.map(s => s.service),
            is_first_month: isFirstMonth,
            deposit_amount: contract.deposit_amount
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
router.post('/bill', requireManager, async (req, res) => {
    const { apartment_id, utility_readings } = req.body;

    if (!apartment_id || !utility_readings) {
        return res.status(400).json({ success: false, message: 'Thiếu dữ liệu' });
    }

    try {
        const businessDate = await getBusinessDate();
        const billingMonth = getBillingMonth(businessDate);

        // Lấy hợp đồng
        const { data: contract } = await supabase
            .from('Contract')
            .select('*')
            .eq('apartment_id', apartment_id)
            .eq('is_active', true)
            .single();

        if (!contract) {
            return res.status(404).json({ success: false, message: 'Không có hợp đồng hợp lệ' });
        }

        // Check bill tồn tại
        const { data: existedBill } = await supabase
            .from('Bill')
            .select('bill_id')
            .eq('contract_id', contract.contract_id)
            .eq('billing_month', billingMonth.toISOString().slice(0, 10))
            .maybeSingle();

        if (existedBill) {
            return res.status(409).json({ success: false, message: 'Hoá đơn đã tồn tại' });
        }

        let total = 0;
        const billDetails = [];

        // ========== Utility ==========
        for (const r of utility_readings) {
            const { utility_id, end_index } = r;

            const { data: lastReading } = await supabase
                .from('UtilityReading')
                .select('end_index')
                .eq('apartment_id', apartment_id)
                .eq('utility_id', utility_id)
                .lt('reading_month', billingMonth.toISOString().slice(0, 10))
                .order('reading_month', { ascending: false })
                .limit(1)
                .maybeSingle();

            const start_index = lastReading ? lastReading.end_index : 0;
            const usage = end_index - start_index;

            if (usage < 0) {
                return res.status(400).json({ success: false, message: 'Chỉ số không hợp lệ' });
            }

            const { data: rate } = await supabase
                .from('UtilityRate')
                .select('unit_price')
                .eq('utility_id', utility_id)
                .lte('effective_from', billingMonth.toISOString().slice(0, 10))
                .or(`effective_to.is.null,effective_to.gte.${billingMonth.toISOString().slice(0, 10)}`)
                .order('effective_from', { ascending: false })
                .limit(1)
                .single();

            const amount = usage * rate.unit_price;
            total += amount;

            billDetails.push({
                item_name: `Tiền ${utility_id}`,
                amount
            });

            await supabase.from('UtilityReading').insert({
                apartment_id,
                utility_id,
                reading_month: billingMonth,
                start_index,
                end_index,
                manager_id: req.user.id
            });
        }

        // ========== Dịch vụ ==========
        const { data: services } = await supabase
            .from('ContractService')
            .select('service:Service(name, price)')
            .eq('contract_id', contract.contract_id)
            .lte('start_month', billingMonth.toISOString().slice(0, 10))
            .or(`end_month.is.null,end_month.gte.${billingMonth.toISOString().slice(0, 10)}`);

        for (const s of services) {
            total += s.service.price;
            billDetails.push({
                item_name: s.service.name,
                amount: s.service.price
            });
        }

        // ========== Cọc & thuê ==========
        const startMonth = new Date(contract.start_date);
        const isFirstMonth =
            startMonth.getFullYear() === billingMonth.getFullYear() &&
            startMonth.getMonth() === billingMonth.getMonth();

        if (isFirstMonth && contract.deposit_amount > 0) {
            total += contract.deposit_amount;
            billDetails.push({
                item_name: 'Tiền cọc',
                amount: contract.deposit_amount
            });
        }

        if (!isFirstMonth) {
            const { data: apartment } = await supabase
                .from('Apartment')
                .select('price')
                .eq('apartment_id', apartment_id)
                .single();

            total += apartment.price;
            billDetails.push({
                item_name: 'Tiền thuê nhà',
                amount: apartment.price
            });
        }

        // ========== Tạo Bill ==========
        const { data: bill } = await supabase
            .from('Bill')
            .insert({
                contract_id: contract.contract_id,
                billing_month: billingMonth,
                total_amount: total,
                status: 'CHUA_THANH_TOAN'
            })
            .select()
            .single();

        // ========== BillDetail ==========
        for (const d of billDetails) {
            await supabase.from('BillDetail').insert({
                bill_id: bill.bill_id,
                item_name: d.item_name,
                amount: d.amount
            });
        }

        res.json({
            success: true,
            bill_id: bill.bill_id,
            total_amount: total
        });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
