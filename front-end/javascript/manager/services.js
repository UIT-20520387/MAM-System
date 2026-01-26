import { apiFetch } from "../config/config.js";

// --- KHAI BÁO CÁC PHẦN TỬ DOM ---
const listView = document.getElementById("list-view");
const detailView = document.getElementById("detail-view");
const addView = document.getElementById("add-view");
const servicesListContainer = document.getElementById("service-list");
const detailContainer = document.getElementById("detail-container");
const messageArea = document.getElementById("message-area");

// Các nút và form
const addNewBtn = document.getElementById("addNewBtn");
const backToListBtn = document.getElementById("backToListBtn");
const addServiceForm = document.getElementById("addServiceForm");
const cancelAddBtn = document.getElementById("cancelAddBtn");
const formMessage = document.getElementById("form-message");

// Các phần tử trong Form View
const formTitle = document.getElementById("form-title"); // Tiêu đề form
const formSubmitButton = document.getElementById("form-submit-button"); // Nút submit

const serviceIdInput = document.getElementById("service_id"); // Input ID
const serviceNameInput = document.getElementById("name"); // Input Tên dịch vụ
const priceInput = document.getElementById("price"); // Input Giá
const descriptionInput = document.getElementById("description"); // Input Mô tả
const statusInput = document.getElementById("status"); // Input Trạng thái

// Modal Elements
const deleteConfirmModal = document.getElementById("deleteConfirmModal");
const modalConfirmBtn = document.getElementById("modalConfirmBtn");
const modalCancelBtn = document.getElementById("modalCancelBtn");
const modalBodyText = document.getElementById("modalBodyText");

// BIẾN TRẠNG THÁI - Theo dõi chế độ Thêm mới (null) hay Sửa (ID)
let currentEditingServiceId = null;

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

// Hiển thị thông báo trạng thái trong form (Thêm mới/Edit)
function displayFormMessage(message, type = "error") {
  formMessage.textContent = message;
  formMessage.className = `message-${type}`;
  formMessage.style.display = "block";
}

// Chuyển về chế độ xem danh sách
function showListView() {
  detailView.style.display = "none";
  addView.style.display = "none";
  listView.style.display = "block";
  loadServices();
}

// Chuyển sang chế độ xem form Thêm mới
function showAddView() {
  listView.style.display = "none";
  detailView.style.display = "none";
  addView.style.display = "block";

  // Cập nhật trạng thái
  currentEditingServiceId = null;

  // Cập nhật UI
  formTitle.textContent = "Thêm Dịch vụ mới";
  if (formSubmitButton) {
    formSubmitButton.innerHTML =
      '<span class="material-symbols-outlined" style="margin-right: 5px;">save</span> Lưu';
  }
  if (serviceIdInput) {
    serviceIdInput.disabled = false; // Bật ID để thêm mới
  }

  // Reset form và thông báo khi mở
  addServiceForm.reset();
  formMessage.style.display = "none";
}

// Hiển thị màn hình Sửa
function showEditView(service) {
  if (!service || !service.service_id) {
    displayMessage("Lỗi: Không thể tải chi tiết dịch vụ để sửa.", "error");
    showListView();
    return;
  }

  // Cập nhật trạng thái
  currentEditingServiceId = service.service_id;

  // Chuyển sang Form View
  listView.style.display = "none";
  detailView.style.display = "none";
  addView.style.display = "block";

  // Cập nhật UI và Đổ dữ liệu
  formTitle.textContent = `Sửa Dịch vụ ${service.name}`;

  if (formSubmitButton) {
    formSubmitButton.innerHTML =
      '<span class="material-symbols-outlined" style="margin-right: 5px;">save</span> Lưu';
  }

  if (serviceIdInput) {
    serviceIdInput.value = service.service_id;
    serviceIdInput.disabled = true; // KHÔNG được sửa ID
  }
  if (serviceNameInput) serviceNameInput.value = service.name;
  if (priceInput) priceInput.value = service.price;
  if (descriptionInput) descriptionInput.value = service.description || "";
  if (statusInput) statusInput.value = service.status;

  formMessage.style.display = "none";
}

// ====================================================================
// CÁC HÀM RENDER UI
// ====================================================================

// Hàm hiển thị danh sách Dịch vụ
function renderServices(services) {
  if (!services || services.length === 0) {
    servicesListContainer.innerHTML =
      '<div id="message-area">Không có dịch vụ nào được tìm thấy.</div>';
    return;
  }

  let tableHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Tên dịch vụ</th>
                    <th>Giá (VNĐ/tháng)</th>
                    <th>Trạng thái</th>
                    <th>Hành động</th>
                </tr>
            </thead>
            <tbody>
    `;

  services.forEach((service) => {
    // Sử dụng Intl.NumberFormat để định dạng tiền tệ Việt Nam
    const formattedPrice = new Intl.NumberFormat("vi-VN").format(
      service.price || 0,
    );

    tableHTML += `
            <tr>
                <td>${service.service_id}</td>
                <td>${service.name}</td>
                <td>${formattedPrice}</td>
                
                <td>${service.status}</td>
                <td>
                    <div class="action-group">
                        <button class="action-btn view-detail-btn" data-id="${service.service_id}" title="Xem chi tiết">
                            <span class="material-symbols-outlined">visibility</span>
                        </button>

                        <button class="action-btn edit-btn" data-id="${service.service_id}" title="Chỉnh sửa">
                            <span class="material-symbols-outlined">edit</span>
                        </button>

                        <button class="action-btn delete-btn" data-id="${service.service_id}" title="Xóa">
                            <span class="material-symbols-outlined">delete</span>
                        </button>
                    </div>
                </td>
            </tr>
        `;
  });

  tableHTML += `
            </tbody>
        </table>
    `;

  servicesListContainer.innerHTML = tableHTML;

  // Sau khi render xong bảng, thiết lập lại listeners cho các nút trong bảng
  setupTableEventListeners();
}

// Hàm hiển thị chi tiết Dịch vụ
function renderServiceDetail(service) {
  const formattedPrice = new Intl.NumberFormat("vi-VN").format(
    service.price || 0,
  );

  const detailHTML = `
        <div class="detail-card">
            <div class="detail-row">
                <div class="detail-label">ID Dịch vụ:</div>
                <div class="detail-value">${service.service_id}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Tên dịch vụ:</div>
                <div class="detail-value">${service.name}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Giá (VNĐ/tháng):</div>
                <div class="detail-value">${formattedPrice}</div>
            </div>
            <div class="detail-row" ">
                <div class="detail-label">Mô tả:</div>
                <div class="detail-value">${
                  service.description || "Không có chi tiết mô tả."
                }</div>
            </div>
            <div class="detail-row" style="border-bottom: none;">
                <div class="detail-label">Trạng thái:</div>
                <div class="detail-value">${service.status}</div>
            </div>
        </div>
    `;

  document.getElementById("detail-title").textContent =
    `Chi tiết Dịch vụ ${service.name}`;
  detailContainer.innerHTML = detailHTML;

  // Ẩn danh sách, hiển thị chi tiết
  listView.style.display = "none";
  addView.style.display = "none";
  detailView.style.display = "block";
}

// ====================================================================
// CÁC HÀM XỬ LÝ DỮ LIỆU/API
// ====================================================================

//Hàm tải dữ liệu Dịch vụ từ API Backend.
async function loadServices() {
  messageArea.textContent = "Đang tải dữ liệu dịch vụ...";

  try {
    // Endpoint cho GET All Dịch vụ là '/services'
    const result = await apiFetch("/services", {
      method: "GET",
    });

    console.log("API Response (Service - Cần kiểm tra cấu trúc này):", result);

    const services = Array.isArray(result) ? result : result.services;

    renderServices(services || []);
  } catch (error) {
    // apiFetch đã tự động throw Error với message từ server (hoặc message lỗi custom)
    console.error("Lỗi khi tải Dịch vụ:", error);
    messageArea.textContent = `Tải dữ liệu thất bại: ${error.message}`;
    document.getElementById("message-area").textContent =
      `Tải dữ liệu thất bại: ${error.message}`;
    servicesListContainer.innerHTML = "";
  }
}

// Hàm tải chi tiết Căn hộ theo ID từ API Backend
async function loadServiceDetail(id) {
  detailContainer.innerHTML = `<div id="message-area">Đang tải chi tiết Dịch vụ ID: ${id}...</div>`;

  try {
    const result = await apiFetch(`/services/${id}`, {
      method: "GET",
    });

    const service = Array.isArray(result) ? result.service : result.service.id;

    renderServiceDetail(result.service || []);
  } catch (error) {
    console.error("Lỗi khi tải chi tiết Service:", error);
    detailContainer.innerHTML = `<div class="detail-card" style="color: var(--color-button-delete)">Lỗi tải chi tiết: ${error.message}</div>`;
    listView.style.display = "none";
    detailView.style.display = "block";
  }
}

// Tải chi tiết Dịch vụ cho chế độ Sửa
async function loadServiceForEdit(id) {
  if (!id) return;

  displayMessage(`Đang tải chi tiết dịch vụ ID: ${id}...`, "info");

  try {
    const result = await apiFetch(`/services/${id}`, {
      method: "GET",
    });

    // Backend GET detail thường trả về 1 object (hoặc object trong .data)
    const service = result.service || result.data || result;

    if (service && service.service_id) {
      displayMessage(
        "Tải dữ liệu thành công. Chuyển sang chế độ Sửa.",
        "success",
      );
      showEditView(service);
    } else {
      throw new Error("Không tìm thấy dữ liệu chi tiết cho dịch vụ này.");
    }
  } catch (error) {
    console.error("Lỗi khi tải chi tiết Dịch vụ (GET):", error);

    let errorMessage = `Tải dữ liệu thất bại: ${error.message}`;
    if (error.status === 404) {
      errorMessage = "Không tìm thấy dịch vụ cần sửa.";
    } else if (error.status) {
      errorMessage = `Tải thất bại: Lỗi HTTP ${error.status}. Vui lòng kiểm tra Console.`;
    }

    displayMessage(errorMessage, "error");
  }
}

// Hàm xử lý thay đổi trạng thái
async function handleStatusChange(id, newStatus) {
  try {
    // Gọi API PATCH cập nhật trạng thái
    // Endpoint: /services/:id (truyền object status)
    const result = await apiFetch(`/services/${id}/status`, {
      method: "PATCH",
      body: { status: newStatus },
    });

    if (result && result.success) {
      displayMessage(
        `Cập nhật trạng thái dịch vụ ${id} thành công!`,
        "success",
      );
    } else {
      throw new Error(result.message || "Cập nhật thất bại.");
    }
  } catch (error) {
    console.error("Lỗi cập nhật trạng thái:", error);
    displayMessage(`Lỗi: ${error.message}`, "error");
    // Tải lại danh sách để reset trạng thái hiển thị về đúng dữ liệu gốc nếu lỗi
    loadServices();
  }
}

// Hàm xử lý Xóa Căn hộ sau khi xác nhận.
async function handleDeleteService(id) {
  if (!id) return;

  // Ẩn modal và hiển thị thông báo xử lý
  if (deleteConfirmModal) {
    deleteConfirmModal.style.display = "none";
  }

  displayMessage(`Đang xóa Dịch vụ ID: ${id}...`, "info");

  try {
    const result = await apiFetch(`/services/${id}`, {
      method: "DELETE",
    });

    // Kiểm tra success
    if (result && result.success) {
      displayMessage(
        result.message || `Xóa Dịch vụ ID: ${id} thành công!`,
        "success",
      );
      loadServices(); // Tải lại danh sách sau khi xóa thành công
    } else {
      // Trường hợp API trả về 200 nhưng có success: false
      throw new Error(
        result?.message || "Xóa dịch vụ thất bại do lỗi không xác định.",
      );
    }
  } catch (error) {
    console.error("Lỗi khi xóa Dịch vụ (DELETE - FAILED):", error);

    let errorMessage = `Xóa thất bại: ${error.message}`;
    if (error.status === 404) {
      errorMessage = "Không tìm thấy dịch vụ cần xóa.";
    } else if (error.status === 409) {
      // Bắt lỗi ràng buộc khóa ngoại từ logic backend của bạn
      errorMessage =
        error.message || "Không thể xóa dịch vụ vì nó đang được sử dụng.";
    } else if (error.status === 403) {
      errorMessage =
        error.message ||
        "Bạn không có quyền xóa dịch vụ này (Yêu cầu Manager).";
    } else if (error.status) {
      errorMessage = `Xóa thất bại: Lỗi HTTP ${error.status}. Vui lòng kiểm tra Console.`;
    }

    displayMessage(errorMessage, "error");
  }
}

//Xử lý submit form chung (Thêm mới & Chỉnh sửa)
async function handleSubmitForm(event) {
  event.preventDefault();

  formMessage.style.display = "none";

  const form = event.target;
  const submitButton = formSubmitButton;

  if (!submitButton) return;

  const isEditing = currentEditingServiceId !== null;
  const method = isEditing ? "PATCH" : "POST";
  const endpoint = isEditing
    ? `/services/${currentEditingServiceId}`
    : `/services`;
  const actionName = isEditing ? "Chỉnh sửa" : "Lưu";

  // Tắt nút submit trong khi chờ
  submitButton.disabled = true;
  submitButton.textContent = `Đang xử lý ${actionName}...`;

  const priceValue = form.price.value.trim();
  const parsedPrice = parseInt(priceValue, 10);

  const statusElement = document.getElementById("status");
  const currentStatus = statusElement ? statusElement.value : "Hoạt động";

  // Thu thập dữ liệu form theo yêu cầu database
  const service = {
    service_id: form.service_id.value.trim(),
    name: form.name.value.trim(),
    // Chuyển Giá Gốc sang kiểu số nguyên
    price: isNaN(parsedPrice) ? 0 : parsedPrice,
    description: form.description.value.trim(),
    status: currentStatus,
  };

  console.log("Dữ liệu gửi lên API POST:", service);

  // Thêm kiểm tra validation đơn giản (base_price > 0)
  if (service.price <= 0 || isNaN(service.price)) {
    displayFormMessage("Giá gốc phải là một số nguyên dương.", "error");
    submitButton.disabled = false;
    submitButton.innerHTML = `<span class="material-symbols-outlined" style="margin-right: 5px;">save</span> Lưu`;
    return;
  }
  if (!isEditing && !service.service_id) {
    displayFormMessage("ID Dịch vụ không được để trống khi thêm mới.", "error");
    submitButton.disabled = false;
    submitButton.innerHTML = `<span class="material-symbols-outlined" style="margin-right: 5px;">save</span> Lưu`;
    return;
  }

  // Chuẩn bị payload cho PATCH (chỉ gửi những trường cần thiết)
  let payload = isEditing;
  if (isEditing) {
    // Chỉ gửi các trường được phép sửa theo logic backend
    payload = {
      name: service.name,
      price: service.price,
      description: service.description,
      status: service.status,
    };
  } else {
    payload = service; // Gửi toàn bộ trường cho POST
  }

  try {
    // ENDPOINT THÊM MỚI: POST /services
    const result = await apiFetch(endpoint, {
      method: method,
      body: payload,
    });

    console.log("API Response (Add Service):", result);

    if (result && result.success) {
      displayMessage(
        result.message || `${actionName} dịch vụ thành công!`,
        "success",
      );
    } else {
      throw new Error(
        result?.message ||
          `${actionName} dịch vụ thất bại do lỗi không xác định.`,
      );
    }

    // Quay lại danh sách
    setTimeout(() => {
      showListView();
    }, 1500);
  } catch (error) {
    console.error(`Lỗi khi ${actionName} Dịch vụ (${method} - FAILED):`, error);

    let errorMessage = `${actionName} thất bại: ${error.message}`;
    if (error.status === 409) {
      errorMessage = error.message || "Mã dịch vụ này đã tồn tại.";
    } else if (error.status === 403) {
      errorMessage =
        error.message ||
        "Bạn không có quyền thực hiện hành động này (Yêu cầu Manager).";
    } else if (error.status) {
      errorMessage = `${actionName} thất bại: Lỗi HTTP ${error.status}. Vui lòng kiểm tra Console.`;
    }

    displayFormMessage(errorMessage, "error");
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = `<span class="material-symbols-outlined" style="margin-right: 5px;">save</span> Lưu`;
  }
}

// ====================================================================
// QUẢN LÝ SỰ KIỆN
// ====================================================================

// Thiết lập các listener cho các nút trong bảng (View, Edit, Delete).
// Hàm này phải được gọi lại sau mỗi lần render bảng.
function setupTableEventListeners() {
  // Listener cho dropdown thay đổi trạng thái nhanh
  document.querySelectorAll(".quick-status-select").forEach((select) => {
    select.addEventListener("change", (event) => {
      const id = event.target.dataset.id;
      const newStatus = event.target.value;
      handleStatusChange(id, newStatus);
    });
  });

  // Listener cho nút View
  document.querySelectorAll(".view-detail-btn").forEach((button) => {
    button.addEventListener("click", (event) => {
      const id = event.currentTarget.dataset.id;
      loadServiceDetail(id);
    });
  });

  // Listener cho nút Edit
  document.querySelectorAll(".edit-btn").forEach((button) => {
    button.addEventListener("click", (event) => {
      const id = event.currentTarget.dataset.id;
      loadServiceForEdit(id); // Gọi hàm tải data và chuyển sang Edit View
    });
  });

  // Listener cho nút Delete
  document.querySelectorAll(".delete-btn").forEach((button) => {
    button.addEventListener("click", (event) => {
      const id = event.currentTarget.dataset.id;

      // Chỉ chạy logic Modal nếu các phần tử Modal tồn tại
      if (deleteConfirmModal && modalConfirmBtn && modalBodyText) {
        // Cập nhật nội dung Modal
        modalBodyText.textContent = `Bạn có chắc chắn muốn xóa dịch vụ với ID: ${id}? Hành động này không thể hoàn tác.`;

        // Gán ID vào nút xác nhận
        modalConfirmBtn.dataset.idToDelete = id;

        // Hiển thị Modal
        deleteConfirmModal.style.display = "flex";
      } else {
        console.error("Lỗi: Các phần tử Modal không tìm thấy.");
        displayMessage(
          "Lỗi: Không tìm thấy hộp thoại xác nhận. Vui lòng kiểm tra console.",
          "error",
        );
      }
    });
  });
}

// Thiết lập các listener chung cho cả trang (Nút Quay lại, nút Thêm mới).
function setupGlobalEventListeners() {
  // Nút Thêm Loại phòng mới (chuyển sang Add View)
  addNewBtn.addEventListener("click", showAddView);

  // Nút Quay lại Danh sách (từ Detail View)
  backToListBtn.addEventListener("click", showListView);

  // // Nút Hủy (từ Add View)
  cancelAddBtn.addEventListener("click", showListView);

  // // Submit Form Thêm mới
  addServiceForm.addEventListener("submit", handleSubmitForm);

  // Logic Modal (Sử dụng các element đã tồn tại trong DOM)
  if (modalCancelBtn && modalConfirmBtn && deleteConfirmModal) {
    // Hủy bỏ việc xóa
    modalCancelBtn.addEventListener("click", () => {
      deleteConfirmModal.style.display = "none";
      modalConfirmBtn.dataset.idToDelete = ""; // Xóa ID đã gán
    });
    // Xác nhận xóa
    modalConfirmBtn.addEventListener("click", () => {
      const id = modalConfirmBtn.dataset.idToDelete;
      if (id) {
        handleDeleteService(id);
      }
    });
    // Đóng Modal khi click ra ngoài
    deleteConfirmModal.addEventListener("click", (event) => {
      if (event.target === deleteConfirmModal) {
        deleteConfirmModal.style.display = "none";
        modalConfirmBtn.dataset.idToDelete = "";
      }
    });
  }
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

  // Tải dữ liệu căn hộ
  loadServices();
});
