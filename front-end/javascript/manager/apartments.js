import { apiFetch } from "../config/config.js";

// --- KHAI BÁO CÁC PHẦN TỬ DOM ---
const listView = document.getElementById("list-view");
const detailView = document.getElementById("detail-view");
const addView = document.getElementById("add-view");
const apartmentsListContainer = document.getElementById("apartment-list");
const detailContainer = document.getElementById("detail-container");
const messageArea = document.getElementById("message-area");

// Các nút và form
const addNewBtn = document.getElementById("addNewBtn");
const backToListBtn = document.getElementById("backToListBtn");
const addApartmentForm = document.getElementById("addApartmentForm");
const cancelAddBtn = document.getElementById("cancelAddBtn");
const formMessage = document.getElementById("form-message");

// Các phần tử trong Form View
const formTitle = document.getElementById("form-title"); // Tiêu đề form
const formSubmitButton = document.getElementById("form-submit-button"); // Nút submit

const apartmentIdInput = document.getElementById("apartment_id"); // Input ID
const typeIdInput = document.getElementById("type_id"); // Input ID Loại phòng
const apartmentNumberInput = document.getElementById("apartment_number"); // Input Số căn hộ
const areaInput = document.getElementById("area"); // Input Diện tích
const priceInput = document.getElementById("price"); // Input Giá
const furnitureInput = document.getElementById("furniture"); // Input Mô tả nội thất
const statusInput = document.getElementById("status"); // Input Trạng thái

// const typeNameInput = document.getElementById('type_name'); // Input Tên

// Modal Elements
const deleteConfirmModal = document.getElementById("deleteConfirmModal");
const modalConfirmBtn = document.getElementById("modalConfirmBtn");
const modalCancelBtn = document.getElementById("modalCancelBtn");
const modalBodyText = document.getElementById("modalBodyText");

// BIẾN TRẠNG THÁI - Theo dõi chế độ Thêm mới (null) hay Sửa (ID)
let currentEditingApartmentId = null;

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
  loadApartments();
}

// Chuyển sang chế độ xem form Thêm mới
function showAddView() {
  listView.style.display = "none";
  detailView.style.display = "none";
  addView.style.display = "block";

  // Cập nhật trạng thái
  currentEditingApartmentId = null;

  // Cập nhật UI
  formTitle.textContent = "Thêm Căn hộ mới";
  if (formSubmitButton) {
    formSubmitButton.innerHTML =
      '<span class="material-symbols-outlined" style="margin-right: 5px;">save</span> Lưu';
    formSubmitButton.classList.remove("warning-button");
  }
  if (apartmentIdInput) {
    apartmentIdInput.disabled = false; // Bật ID để thêm mới
  }

  // Reset form và thông báo khi mở
  addApartmentForm.reset();
  formMessage.style.display = "none";
}

// Hiển thị màn hình Sửa
function showEditView(apartment) {
  if (!apartment || !apartment.apartment_id) {
    displayMessage("Lỗi: Không thể tải chi tiết căn hộ để sửa.", "error");
    showListView();
    return;
  }

  // Cập nhật trạng thái
  currentEditingApartmentId = apartment.apartment_id;

  // Chuyển sang Form View
  listView.style.display = "none";
  detailView.style.display = "none";
  addView.style.display = "block";

  // Cập nhật UI và Đổ dữ liệu
  formTitle.textContent = `Sửa Căn hộ số ${apartment.apartment_number}`;

  if (formSubmitButton) {
    formSubmitButton.innerHTML =
      '<span class="material-symbols-outlined" style="margin-right: 5px;">save</span> Lưu';
    formSubmitButton.classList.add("warning-button");
  }

  if (apartmentIdInput) {
    apartmentIdInput.value = apartment.apartment_id;
    apartmentIdInput.disabled = true; // KHÔNG được sửa ID
  }
  if (typeIdInput) typeIdInput.value = apartment.type_id;
  if (apartmentNumberInput)
    apartmentNumberInput.value = apartment.apartment_number;
  if (areaInput) areaInput.value = apartment.area;

  if (priceInput) priceInput.value = apartment.price;
  if (furnitureInput) furnitureInput.value = apartment.furniture || "";
  if (statusInput) statusInput.value = apartment.status;

  formMessage.style.display = "none";
}

// ====================================================================
// CÁC HÀM RENDER UI
// ====================================================================

// Hàm hiển thị danh sách Căn hộ
function renderApartments(apartments) {
  if (!apartments || apartments.length === 0) {
    apartmentsListContainer.innerHTML =
      '<div id="message-area">Không có căn hộ nào được tìm thấy.</div>';
    return;
  }

  let tableHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Số căn hộ</th>
                    <th>Loại phòng</th>
                    <th>Giá (VNĐ/tháng)</th>
                    <th>Trạng thái </th>
                    <th>Hành động</th>
                </tr>
            </thead>
            <tbody>
    `;

  apartments.forEach((apartment) => {
    // Sử dụng Intl.NumberFormat để định dạng tiền tệ Việt Nam
    const formattedPrice = new Intl.NumberFormat("vi-VN").format(
      apartment.price || 0
    );

    const type_name = apartment.room_type
      ? apartment.room_type.type_name
      : "N/A";

    // Danh sách các trạng thái có thể chọn
    const statuses = [
      { value: "Còn trống", label: "Còn trống" },
      { value: "Đang thuê", label: "Đang thuê" },
      { value: "Đang bảo trì", label: "Đang bảo trì" },
    ];

    // Tạo HTML cho Dropdown trạng thái
    let statusOptions = statuses
      .map(
        (s) =>
          `<option value="${s.value}" ${
            apartment.status === s.value || apartment.status === s.label
              ? "selected"
              : ""
          }>${s.label}</option>`
      )
      .join("");

    tableHTML += `
            <tr>
                <td>${apartment.apartment_id}</td>
                <td>${apartment.apartment_number}</td>
                <td>${type_name}</td>
                <td>${formattedPrice}</td>
                
                <td>
                    <select class="quick-status-select form-input-container" data-id="${apartment.apartment_id}">
                        ${statusOptions}
                    </select>
                </td>
                <td>
                    <div class="action-group">
                        <button class="action-btn view-detail-btn" data-id="${apartment.apartment_id}" title="Xem chi tiết">
                            <span class="material-symbols-outlined">visibility</span>
                        </button>

                        <button class="action-btn edit-btn" data-id="${apartment.apartment_id}" title="Chỉnh sửa">
                            <span class="material-symbols-outlined">edit</span>
                        </button>

                        <button class="action-btn delete-btn" data-id="${apartment.apartment_id}" title="Xóa">
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

  apartmentsListContainer.innerHTML = tableHTML;

  // Sau khi render xong bảng, thiết lập lại listeners cho các nút trong bảng
  setupTableEventListeners();
}

// Hàm hiển thị chi tiết Căn hộ
function renderApartmentDetail(apartment) {
  const formattedPrice = new Intl.NumberFormat("vi-VN").format(
    apartment.price || 0
  );
  const type_name = apartment.room_type ? apartment.room_type.type_name : "N/A";

  const detailHTML = `
        <div class="detail-card">
            <div class="detail-row">
                <div class="detail-label">ID:</div>
                <div class="detail-value">${apartment.apartment_id}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Loại phòng:</div>
                <div class="detail-value">${type_name}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Số căn hộ:</div>
                <div class="detail-value">${apartment.apartment_number}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Diện tích (m2):</div>
                <div class="detail-value">${apartment.area}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Giá (VNĐ/tháng):</div>
                <div class="detail-value">${formattedPrice}</div>
            </div>
            <div class="detail-row" ">
                <div class="detail-label">Nội thất:</div>
                <div class="detail-value">${
                  apartment.furniture || "Không có chi tiết nội thất."
                }</div>
            </div>
            <div class="detail-row" style="border-bottom: none;">
                <div class="detail-label">Trạng thái:</div>
                <div class="detail-value">${apartment.status}</div>
            </div>
        </div>
    `;

  document.getElementById(
    "detail-title"
  ).textContent = `Chi tiết Căn hộ số ${apartment.apartment_number}`;
  detailContainer.innerHTML = detailHTML;

  // Ẩn danh sách, hiển thị chi tiết
  listView.style.display = "none";
  addView.style.display = "none";
  detailView.style.display = "block";
}

// ====================================================================
// CÁC HÀM XỬ LÝ DỮ LIỆU/API
// ====================================================================

//Hàm tải dữ liệu Căn hộ từ API Backend.
async function loadApartments() {
  messageArea.textContent = "Đang tải dữ liệu căn hộ...";

  try {
    // Endpoint cho GET All Căn hộ là '/apartments'
    const result = await apiFetch("/apartments", {
      method: "GET",
    });

    console.log(
      "API Response (Apartment - Cần kiểm tra cấu trúc này):",
      result
    );

    const apartments = Array.isArray(result) ? result : result.apartments;

    renderApartments(apartments || []);
  } catch (error) {
    // apiFetch đã tự động throw Error với message từ server (hoặc message lỗi custom)
    console.error("Lỗi khi tải Căn hộ:", error);
    messageArea.textContent = `Tải dữ liệu thất bại: ${error.message}`;
    document.getElementById(
      "message-area"
    ).textContent = `Tải dữ liệu thất bại: ${error.message}`;
    apartmentsListContainer.innerHTML = "";
  }
}

// Hàm tải chi tiết Căn hộ theo ID từ API Backend
async function loadApartmentDetail(id) {
  detailContainer.innerHTML = `<div id="message-area">Đang tải chi tiết Căn hộ ID: ${id}...</div>`;

  try {
    const result = await apiFetch(`/apartments/${id}`, {
      method: "GET",
    });

    const apartment = Array.isArray(result)
      ? result.apartment
      : result.apartment.id;

    renderApartmentDetail(result.apartment || []);
  } catch (error) {
    console.error("Lỗi khi tải chi tiết Căn hộ:", error);
    detailContainer.innerHTML = `<div class="detail-card" style="color: var(--color-button-delete)">Lỗi tải chi tiết: ${error.message}</div>`;
    listView.style.display = "none";
    detailView.style.display = "block";
  }
}

// Tải chi tiết Loại phòng cho chế độ Sửa
async function loadApartmentForEdit(id) {
  if (!id) return;

  displayMessage(`Đang tải chi tiết căn hộ ID: ${id}...`, "info");

  try {
    const result = await apiFetch(`/apartments/${id}`, {
      method: "GET",
    });

    // Backend GET detail thường trả về 1 object (hoặc object trong .data)
    const apartment = result.apartment || result.data || result;

    if (apartment && apartment.apartment_id) {
      displayMessage(
        "Tải dữ liệu thành công. Chuyển sang chế độ Sửa.",
        "success"
      );
      showEditView(apartment);
    } else {
      throw new Error("Không tìm thấy dữ liệu chi tiết cho căn hộ này.");
    }
  } catch (error) {
    console.error("Lỗi khi tải chi tiết Căn hộ (GET):", error);

    let errorMessage = `Tải dữ liệu thất bại: ${error.message}`;
    if (error.status === 404) {
      errorMessage = "Không tìm thấy căn hộ cần sửa.";
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
    // Endpoint: /apartments/:id (truyền object status)
    const result = await apiFetch(`/apartments/${id}/status`, {
      method: "PATCH",
      body: { status: newStatus },
    });

    if (result && result.success) {
      displayMessage(`Cập nhật trạng thái căn hộ ${id} thành công!`, "success");
    } else {
      throw new Error(result.message || "Cập nhật thất bại.");
    }
  } catch (error) {
    console.error("Lỗi cập nhật trạng thái:", error);
    displayMessage(`Lỗi: ${error.message}`, "error");
    // Tải lại danh sách để reset trạng thái hiển thị về đúng dữ liệu gốc nếu lỗi
    loadApartments();
  }
}

// Hàm xử lý Xóa Căn hộ sau khi xác nhận.
async function handleDeleteApartment(id) {
  if (!id) return;

  // Ẩn modal và hiển thị thông báo xử lý
  if (deleteConfirmModal) {
    deleteConfirmModal.style.display = "none";
  }

  displayMessage(`Đang xóa Căn hộ ID: ${id}...`, "info");

  try {
    const result = await apiFetch(`/apartments/${id}`, {
      method: "DELETE",
    });

    // Kiểm tra success
    if (result && result.success) {
      displayMessage(
        result.message || `Xóa căn hộ ID: ${id} thành công!`,
        "success"
      );
      loadApartments(); // Tải lại danh sách sau khi xóa thành công
    } else {
      // Trường hợp API trả về 200 nhưng có success: false
      throw new Error(
        result?.message || "Xóa căn hộ thất bại do lỗi không xác định."
      );
    }
  } catch (error) {
    console.error("Lỗi khi xóa Căn hộ (DELETE - FAILED):", error);

    let errorMessage = `Xóa thất bại: ${error.message}`;
    if (error.status === 404) {
      errorMessage = "Không tìm thấy căn hộ cần xóa.";
    } else if (error.status === 409) {
      // Bắt lỗi ràng buộc khóa ngoại từ logic backend của bạn
      errorMessage =
        error.message || "Không thể xóa căn hộ vì nó đang được sử dụng.";
    } else if (error.status === 403) {
      errorMessage =
        error.message || "Bạn không có quyền xóa căn hộ này (Yêu cầu Manager).";
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

  const isEditing = currentEditingApartmentId !== null;
  const method = isEditing ? "PATCH" : "POST";
  const endpoint = isEditing
    ? `/apartments/${currentEditingApartmentId}`
    : `/apartments`;
  const actionName = isEditing ? "Chỉnh sửa" : "Lưu";

  // Tắt nút submit trong khi chờ
  submitButton.disabled = true;
  submitButton.textContent = `Đang xử lý ${actionName}...`;

  const priceValue = form.price.value.trim();
  const parsedPrice = parseInt(priceValue, 10);

  const statusElement = document.getElementById("status");
  const currentStatus = statusElement ? statusElement.value : "Còn trống";

  // Thu thập dữ liệu form theo yêu cầu database
  const apartment = {
    apartment_id: form.apartment_id.value.trim(),
    type_id: form.type_id.value.trim(),
    apartment_number: form.apartment_number.value.trim(),
    area: form.area.value.trim(),
    // Chuyển Giá Gốc sang kiểu số nguyên
    price: isNaN(parsedPrice) ? 0 : parsedPrice,
    furniture: form.furniture.value.trim(),
    status: currentStatus,
  };

  console.log("Dữ liệu gửi lên API POST:", apartment);

  // Thêm kiểm tra validation đơn giản (base_price > 0)
  if (apartment.price <= 0 || isNaN(apartment.price)) {
    displayFormMessage("Giá gốc phải là một số nguyên dương.", "error");
    submitButton.disabled = false;
    submitButton.innerHTML = `<span class="material-symbols-outlined" style="margin-right: 5px;">save</span> Lưu`;
    return;
  }
  if (!isEditing && !apartment.apartment_id) {
    displayFormMessage("ID Căn hộ không được để trống khi thêm mới.", "error");
    submitButton.disabled = false;
    submitButton.innerHTML = `<span class="material-symbols-outlined" style="margin-right: 5px;">save</span> Lưu`;
    return;
  }

  // Chuẩn bị payload cho PATCH (chỉ gửi những trường cần thiết)
  let payload = isEditing;
  if (isEditing) {
    // Chỉ gửi 6 trường được phép sửa theo logic backend
    payload = {
      type_id: apartment.type_id,
      apartment_number: apartment.apartment_number,
      area: apartment.area,
      price: apartment.price,
      furniture: apartment.furniture,
      status: apartment.status,
    };
  } else {
    payload = apartment; // Gửi toàn bộ 7 trường cho POST
  }

  try {
    // ENDPOINT THÊM MỚI: POST /apartments
    const result = await apiFetch(endpoint, {
      method: method,
      body: payload,
    });

    console.log("API Response (Add Apartment):", result);

    if (result && result.success) {
      displayMessage(
        result.message || `${actionName} căn hộ thành công!`,
        "success"
      );
    } else {
      throw new Error(
        result?.message ||
          `${actionName} căn hộ thất bại do lỗi không xác định.`
      );
    }

    // Quay lại danh sách
    setTimeout(() => {
      showListView();
    }, 1500);
  } catch (error) {
    console.error(`Lỗi khi ${actionName} Căn hộ (${method} - FAILED):`, error);

    let errorMessage = `${actionName} thất bại: ${error.message}`;
    if (error.status === 409) {
      errorMessage = error.message || "Mã căn hộ này đã tồn tại.";
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
      loadApartmentDetail(id);
    });
  });

  // Listener cho nút Edit
  document.querySelectorAll(".edit-btn").forEach((button) => {
    button.addEventListener("click", (event) => {
      const id = event.currentTarget.dataset.id;
      loadApartmentForEdit(id); // Gọi hàm tải data và chuyển sang Edit View
    });
  });

  // Listener cho nút Delete
  document.querySelectorAll(".delete-btn").forEach((button) => {
    button.addEventListener("click", (event) => {
      const id = event.currentTarget.dataset.id;

      // Chỉ chạy logic Modal nếu các phần tử Modal tồn tại
      if (deleteConfirmModal && modalConfirmBtn && modalBodyText) {
        // Cập nhật nội dung Modal
        modalBodyText.textContent = `Bạn có chắc chắn muốn xóa căn hộ với ID: ${id}? Hành động này không thể hoàn tác.`;

        // Gán ID vào nút xác nhận
        modalConfirmBtn.dataset.idToDelete = id;

        // Hiển thị Modal
        deleteConfirmModal.style.display = "flex";
      } else {
        console.error("Lỗi: Các phần tử Modal không tìm thấy.");
        displayMessage(
          "Lỗi: Không tìm thấy hộp thoại xác nhận. Vui lòng kiểm tra console.",
          "error"
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
  addApartmentForm.addEventListener("submit", handleSubmitForm);

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
        handleDeleteApartment(id);
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

  // Tải dữ liệu loại phòng
  loadApartments();
});
