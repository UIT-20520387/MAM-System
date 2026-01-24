import { apiFetch } from "../config/config.js";

const listContainer = document.getElementById("finance-list");
const billingModal = document.getElementById("billingModal");
const billingModalBody = document.getElementById("billingModalBody");
const cancelBillingBtn = document.getElementById("cancelBillingBtn");
const submitBillingBtn = document.getElementById("submitBillingBtn");

let currentApartmentId = null;
let currentUtilities = [];

/* =========================
   LOAD DANH SÁCH CĂN HỘ
========================= */
async function loadDueApartments() {
  listContainer.innerHTML = "Đang tải...";

  try {
    const result = await apiFetch("/finance/due-apartments");
    renderApartmentList(result.apartments || []);
  } catch (err) {
    listContainer.innerHTML = `Lỗi: ${err.message}`;
  }
}

/* =========================
   RENDER TABLE
========================= */
function renderApartmentList(apartments) {
  if (!apartments.length) {
    listContainer.innerHTML = "Không có căn hộ nào đến hạn.";
    return;
  }

  let html = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Căn hộ</th>
          <th>Người thuê</th>
          <th>Tháng đầu</th>
          <th>Hành động</th>
        </tr>
      </thead>
      <tbody>
  `;

  apartments.forEach(a => {
    html += `
      <tr>
        <td>${a.apartment_id}</td>
        <td>${a.tenant_name}</td>
        <td>${a.is_first_month ? "✔" : ""}</td>
        <td>
          <button class="action-btn assign-btn" data-id="${a.apartment_id}" title ="Tính phí">
            <span class="material-symbols-outlined">request_quote</span>
          </button>
        </td>
      </tr>
    `;
  });

  html += "</tbody></table>";
  listContainer.innerHTML = html;

  document.querySelectorAll(".assign-btn").forEach(btn => {
    btn.addEventListener("click", () => openBillingModal(btn.dataset.id));
  });
}

/* =========================
   OPEN MODAL
========================= */
async function openBillingModal(apartmentId) {
  currentApartmentId = apartmentId;

  try {
    const result = await apiFetch(`/finance/prepare-billing?apartment_id=${apartmentId}`);
    renderBillingModal(result);
    billingModal.style.display = "flex";
  } catch (err) {
    alert(err.message);
  }
}

/* =========================
   RENDER MODAL CONTENT
========================= */
function renderBillingModal(data) {
  currentUtilities = data.utilities;

  let html = `<p><b>Tháng:</b> ${data.billing_month}</p>`;

  html += "<h4>Chỉ số điện nước</h4>";

  data.utilities.forEach(u => {
    html += `
      <div class="form-group">
        <label>${u.utility_id} (chỉ số mới)</label>
        <input type="number" data-utility="${u.utility_id}" required />
        <small>Chỉ số cũ: ${u.last_end_index ?? 0}</small>
      </div>
    `;
  });

  if (data.services.length) {
    html += "<h4>Dịch vụ</h4><ul>";
    data.services.forEach(s => {
      html += `<li>${s.name} - ${s.price.toLocaleString()} VNĐ</li>`;
    });
    html += "</ul>";
  }

  if (data.is_first_month) {
    html += `<p><b>Tiền cọc:</b> ${data.deposit_amount.toLocaleString()} VNĐ</p>`;
  }

  billingModalBody.innerHTML = html;
}

/* =========================
   SUBMIT BILL
========================= */
submitBillingBtn.addEventListener("click", async () => {
  const inputs = billingModalBody.querySelectorAll("input[data-utility]");
  const readings = [];

  for (const input of inputs) {
    readings.push({
      utility_id: input.dataset.utility,
      end_index: Number(input.value)
    });
  }

  try {
    const result = await apiFetch("/finance/bill", {
      method: "POST",
      body: {
        apartment_id: currentApartmentId,
        utility_readings: readings
      }
    });

    alert(`Tạo hoá đơn thành công. Tổng tiền: ${result.total_amount.toLocaleString()} VNĐ`);
    billingModal.style.display = "none";
    loadDueApartments();
  } catch (err) {
    alert(err.message);
  }
});

/* =========================
   CLOSE MODAL
========================= */
cancelBillingBtn.addEventListener("click", () => {
  billingModal.style.display = "none";
});

/* =========================
   INIT
========================= */
document.addEventListener("DOMContentLoaded", loadDueApartments);
