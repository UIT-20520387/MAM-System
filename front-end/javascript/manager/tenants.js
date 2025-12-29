import { apiFetch } from "../config/config.js";

// --- KHAI BÁO CÁC PHẦN TỬ DOM ---
const listView = document.getElementById("list-view");
const detailView = document.getElementById("detail-view");
const editView = document.getElementById("edit-view");
const tenantsListContainer = document.getElementById("tenant-list");
const detailContainer = document.getElementById("detail-container");
const messageArea = document.getElementById("message-area");

// Các nút và form
// const addNewBtn = document.getElementById("addNewBtn");
const backToListBtn = document.getElementById("backToListBtn");
const editTenantForm = document.getElementById("editTenantForm");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const formMessage = document.getElementById("form-message");

// Các phần tử trong Form View
const formTitle = document.getElementById("form-title"); // Tiêu đề form
const formSubmitButton = document.getElementById("form-submit-button"); // Nút submit

// Input fields
const fullnameInput = document.getElementById("fullname");
const phoneInput = document.getElementById("phone_number");
const identityInput = document.getElementById("identity_card_number");

// Modal Elements
const deleteConfirmModal = document.getElementById("deleteConfirmModal");
const modalConfirmBtn = document.getElementById("modalConfirmBtn");
const modalCancelBtn = document.getElementById("modalCancelBtn");
// const modalBodyText = document.getElementById("modalBodyText");

// BIẾN TRẠNG THÁI
let currentEditingTenantId = null;

// ====================================================================
// CÁC HÀM QUẢN LÝ VIEW (CHUYỂN ĐỔI GIAO DIỆN)
// ====================================================================

// Hiển thị thông báo chung
function displayMessage(message, type = "error") {
  messageArea.textContent = message;
  messageArea.className = `message-${type}`;
  messageArea.style.display = "block";
  setTimeout(() => {
    messageArea.style.display = "none";
  }, 5000);
}

// Hiển thị thông báo trạng thái trong form (Edit)
function displayFormMessage(message, type = "error") {
  formMessage.textContent = message;
  formMessage.className = `message-${type}`;
  formMessage.style.display = "block";
}

// Chuyển về chế độ xem danh sách
function showListView() {
  detailView.style.display = "none";
  editView.style.display = "none";
  listView.style.display = "block";
  loadTenants();
}

async function showDetailView(tenantId) {
  try {
    const result = await apiFetch(`/tenants/${tenantId}`);
    if (result && result.tenant) {
      renderTenantDetail(result.tenant);
      listView.style.display = "none";
      detailView.style.display = "block";
      editView.style.display = "none";
    }
  } catch (error) {
    displayMessage(
      "Không thể tải chi tiết người thuê: " + error.message,
      "error"
    );
  }
}

// Hiển thị màn hình Sửa
function showEditView(tenant) {
  currentEditingTenantId = tenant.user_id;
  listView.style.display = "none";
  detailView.style.display = "none";
  editView.style.display = "block";

  formTitle.textContent = `Sửa Thông tin: ${tenant.fullname}`;

  // Đổ dữ liệu vào input
  fullnameInput.value = tenant.fullname || "";
  phoneInput.value = tenant.phone_number || "";
  identityInput.value = tenant.identity_card_number || "";

  formMessage.style.display = "none";
}

// ====================================================================
// CÁC HÀM RENDER UI
// ====================================================================

// Hàm hiển thị danh sách Người thuê

function renderTenants(tenants) {
  if (!tenants || tenants.length === 0) {
    tenantsListContainer.innerHTML = `<div class="no-data">Không có dữ liệu người thuê.</div>`;
    return;
  }

  let tableHtml = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Họ và tên</th>
          <th>Số điện thoại</th>
          <th>Số CCCD</th>
          <th>Trạng thái</th>
          <th>Thao tác</th>
        </tr>
      </thead>
      <tbody>
  `;

  tenants.forEach((t) => {
    const statusClass = t.is_currently_tenant
      ? "status-active"
      : "status-empty";
    const statusText = t.is_currently_tenant
      ? `Đang thuê (${t.apartment_number})`
      : "Chưa có phòng";

    tableHtml += `
      <tr>
        <td><strong>${t.fullname}</strong></td>
        <td>${t.phone_number || "---"}</td>
        <td>${t.identity_card_number || "---"}</td>
        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
        <td>
          <div class="action-group">
            <button class="action-btn view-detail-btn" data-id="${t.user_id}" title="Xem chi tiết">
                <span class="material-symbols-outlined">visibility</span>
            </button>
            <button class="action-btn edit-btn" data-tenant-json='${JSON.stringify(t)}' title="Chỉnh sửa">
                <span class="material-symbols-outlined">edit</span>
            </button>
            <button class="action-btn delete-btn" data-id="${t.user_id}" title="Xóa">
                <span class="material-symbols-outlined">delete</span>
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  tableHtml += `</tbody></table>`;
  tenantsListContainer.innerHTML = tableHtml;

  // Gán sự kiện cho các nút trong bảng
  setupTableEventListeners();
}

function renderTenantDetail(tenant) {
  const historyHtml =
    tenant.contract_history && tenant.contract_history.length > 0
      ? tenant.contract_history
          .map(
            (c) => `
        <div class="detail-item-card ${c.is_active ? "active-contract" : ""}">
            <div class="detail-row">
                <span class="detail-label">Căn hộ:</span>
                <span class="detail-value">${c.apartment_number} ${
              c.is_active ? "(Hiện tại)" : ""
            }</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Thời hạn:</span>
                <span class="detail-value">${c.start_date} đến ${
              c.end_date
            }</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Tiền cọc:</span>
                <span class="detail-value">${new Intl.NumberFormat(
                  "vi-VN"
                ).format(c.deposit_amount)} VNĐ</span>
            </div>
        </div>
      `
          )
          .join("")
      : "<p>Người này chưa từng có hợp đồng nào.</p>";

  detailContainer.innerHTML = `
    <div class="detail-content-grid">
        <div class="content-card">
            <h3 class="section-title">Thông tin Cá nhân</h3>
            <div class="detail-row"><span class="detail-label">Họ tên:</span><span class="detail-value">${
              tenant.fullname
            }</span></div>
            <div class="detail-row"><span class="detail-label">Số điện thoại:</span><span class="detail-value">${
              tenant.phone_number || "N/A"
            }</span></div>
            <div class="detail-row"><span class="detail-label">CCCD:</span><span class="detail-value">${
              tenant.identity_card_number || "N/A"
            }</span></div>
        </div>
        <div class="content-card">
            <h3 class="section-title">Lịch sử Thuê phòng</h3>
            <div class="history-list">${historyHtml}</div>
        </div>
    </div>
  `;
}

// ====================================================================
// CÁC HÀM XỬ LÝ DỮ LIỆU/API
// ====================================================================

//Hàm tải dữ liệu Người thuê từ API Backend.
async function loadTenants() {
  try {
    const result = await apiFetch("/tenants");
    renderTenants(result.tenants || []);
  } catch (error) {
    displayMessage("Lỗi kết nối server: " + error.message);
  }
}

async function handleSubmitForm(event) {
  event.preventDefault();
  formMessage.style.display = "none";

  if (!currentEditingTenantId) return;

  formSubmitButton.disabled = true;
  formSubmitButton.textContent = "Đang lưu...";

  const payload = {
    fullname: fullnameInput.value.trim(),
    phone_number: phoneInput.value.trim(),
    identity_card_number: identityInput.value.trim(),
  };

  try {
    const result = await apiFetch(`/tenants/${currentEditingTenantId}`, {
      method: "PATCH",
      body: payload,
    });

    if (result && result.success) {
      displayMessage("Cập nhật thông tin người thuê thành công!", "success");
      setTimeout(showListView, 1500);
    } else {
      throw new Error(result.message || "Cập nhật thất bại.");
    }
  } catch (error) {
    displayFormMessage(error.message, "error");
  } finally {
    formSubmitButton.disabled = false;
    formSubmitButton.innerHTML =
      '<span class="material-symbols-outlined">save</span> Lưu';
  }
}

async function handleDeleteTenant(id) {
  try {
    const result = await apiFetch(`/tenants/${id}`, { method: "DELETE" });
    if (result && result.success) {
      displayMessage("Đã xóa người thuê thành công.", "success");
      deleteConfirmModal.style.display = "none";
      loadTenants();
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    displayMessage("Lỗi: " + error.message, "error");
    deleteConfirmModal.style.display = "none";
  }
}

// ====================================================================
// QUẢN LÝ SỰ KIỆN
// ====================================================================

// Thiết lập các listener cho các nút trong bảng (View, Edit, Delete).
// Hàm này phải được gọi lại sau mỗi lần render bảng.
function setupTableEventListeners() {
  // Nút xem chi tiết
  document.querySelectorAll(".view-detail-btn").forEach((btn) => {
    btn.addEventListener("click", () => showDetailView(btn.dataset.id));
  });

  // Nút sửa
  document.querySelectorAll(".edit-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      try {
        const tenantData = JSON.parse(btn.dataset.tenantJson);
        showEditView(tenantData);
      } catch (e) {
        console.error("Lỗi parse dữ liệu người thuê:", e);
      }
    });
  });


  // Nút xóa
  document.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      modalConfirmBtn.dataset.idToDelete = btn.dataset.id;
      deleteConfirmModal.style.display = "flex";
    });
  });

}

// Thiết lập các listener chung cho cả trang (Nút Quay lại, nút Thêm mới).
function setupGlobalEventListeners() {
  backToListBtn.addEventListener("click", showListView);
  cancelEditBtn.addEventListener("click", showListView);
  editTenantForm.addEventListener("submit", handleSubmitForm);

  // Logic Modal Xóa
  modalCancelBtn.addEventListener("click", () => {
    deleteConfirmModal.style.display = "none";
  });

  modalConfirmBtn.addEventListener("click", () => {
    const id = modalConfirmBtn.dataset.idToDelete;
    if (id) handleDeleteTenant(id);
  });

}

// ====================================================================
// KHỞI TẠO
// ====================================================================

// Chạy logic khi DOM đã sẵn sàng
document.addEventListener("DOMContentLoaded", () => {
  // Kích hoạt menu active (Hàm này được gọi từ utils.js)
  if (window.setActiveMenu) {
    window.setActiveMenu();
  }

  // Thiết lập các listener cố định (Quay lại, Thêm mới)
  setupGlobalEventListeners();

  // Tải dữ liệu Người tuê
  loadTenants();
});
