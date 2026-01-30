import { apiFetch } from "../config/config.js";

// --- KHAI BÁO CÁC PHẦN TỬ DOM ---
const listView = document.getElementById("list-view");
const detailView = document.getElementById("detail-view");
const billsListContainer = document.getElementById("bill-list");
const detailContainer = document.getElementById("detail-container");
const messageArea = document.getElementById("message-area");

// Các nút và form
const backToListBtn = document.getElementById("backToListBtn");
const cancelAddBtn = document.getElementById("cancelAddBtn");
const formMessage = document.getElementById("form-message");

// Các phần tử trong Form View
const formTitle = document.getElementById("form-title"); // Tiêu đề form
const formSubmitButton = document.getElementById("form-submit-button"); // Nút submit

const billIdInput = document.getElementById("bill_id"); // Input ID
const typeIdInput = document.getElementById("type_id"); // Input ID Loại phòng
const billNumberInput = document.getElementById("bill_number"); // Input Số căn hộ
const areaInput = document.getElementById("area"); // Input Diện tích
const priceInput = document.getElementById("price"); // Input Giá
const furnitureInput = document.getElementById("furniture"); // Input Mô tả nội thất
const statusInput = document.getElementById("status"); // Input Trạng thái

// Modal Elements
const deleteConfirmModal = document.getElementById("deleteConfirmModal");
const modalConfirmBtn = document.getElementById("modalConfirmBtn");
const modalCancelBtn = document.getElementById("modalCancelBtn");
const modalBodyText = document.getElementById("modalBodyText");

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

// Hiển thị thông báo trạng thái trong form
function displayFormMessage(message, type = "error") {
  formMessage.textContent = message;
  formMessage.className = `message-${type}`;
  formMessage.style.display = "block";
}

// Chuyển về chế độ xem danh sách
function showListView() {
  detailView.style.display = "none";
  // addView.style.display = "none";
  listView.style.display = "block";
  loadBills();
}

// ====================================================================
// CÁC HÀM RENDER UI
// ====================================================================

// Hàm hiển thị danh sách Hoá đơn
function renderBills(bills) {
  if (!bills || bills.length === 0) {
    billsListContainer.innerHTML =
      '<div id="message-area">Không có hoá đơn nào được tìm thấy.</div>';
    return;
  }

  let tableHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Mã hợp đồng</th>
                    <th>Số căn hộ</th>
                    <th>Tháng hoá đơn</th>
                    <th>Tổng tiền (VNĐ)</th>
                    <th>Trạng thái</th>
                    <th>Ngày hết hạn</th>
                    <th>Hành động</th>
                </tr>
            </thead>
            <tbody>
    `;

  bills.forEach((bill) => {
    // Sử dụng Intl.NumberFormat để định dạng tiền tệ Việt Nam
    const formattedPrice = new Intl.NumberFormat("vi-VN").format(
      bill.total_amount || 0,
    );

    const apartment_number =
      bill.Contract?.Apartment?.apartment_number || "N/A";

    // Danh sách các trạng thái có thể chọn
    const statuses = [
      { value: "Chưa thanh toán", label: "Chưa thanh toán" },
      { value: "Đã thanh toán", label: "Đã thanh toán" },
    ];

    // Tạo HTML cho Dropdown trạng thái
    let statusOptions = statuses
      .map(
        (s) =>
          `<option value="${s.value}" ${
            bill.status === s.value || bill.status === s.label ? "selected" : ""
          }>${s.label}</option>`,
      )
      .join("");

    tableHTML += `
            <tr>
                <td>${bill.contract_id}</td>
                <td>${apartment_number}</td>
                <td>${bill.billing_month}</td>
                <td>${formattedPrice}</td>
                <td>
                    <select class="quick-status-select form-input-container" data-id="${bill.bill_id}">
                        ${statusOptions}
                    </select>
                </td>
                <td>${bill.due_date}</td>
                
                <td>
                    <div class="action-group">
                        <button class="action-btn view-detail-btn" data-id="${bill.bill_id}" title="Xem chi tiết">
                            <span class="material-symbols-outlined">visibility</span>
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

  billsListContainer.innerHTML = tableHTML;

  // Sau khi render xong bảng, thiết lập lại listeners cho các nút trong bảng
  setupTableEventListeners();
}

// Hàm hiển thị chi tiết Căn hộ
function renderBillDetail(bill) {
  const formattedPrice = new Intl.NumberFormat("vi-VN").format(
    bill.amount || 0,
  );
  const item_name = bill.BillDetail?.item_name || "N/A";
  const apartment_number = bill.Contract?.Apartment?.apartment_number || "N/A";

  const detailHTML = `
        <div class="detail-card">
            <div class="detail-row">
                <div class="detail-label">ID:</div>
                <div class="detail-value">${bill.bill_id}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Mục hoá đơn:</div>
                <div class="detail-value">${item_name}</div>
            </div>
            
            <div class="detail-row">
                <div class="detail-label">Giá (VNĐ/tháng):</div>
                <div class="detail-value">${formattedPrice}</div>
            </div>
        </div>
    `;

  document.getElementById("detail-title").textContent =
    `Chi tiết Hoá đơn của Căn hộ số ${apartment_number}`;
  detailContainer.innerHTML = detailHTML;

  // Ẩn danh sách, hiển thị chi tiết
  listView.style.display = "none";
  // addView.style.display = "none";
  detailView.style.display = "block";
}

// ====================================================================
// CÁC HÀM XỬ LÝ DỮ LIỆU/API
// ====================================================================

//Hàm tải dữ liệu Căn hộ từ API Backend.
async function loadBills() {
  messageArea.textContent = "Đang tải dữ liệu hóa đơn...";

  try {
    // Endpoint cho GET All Căn hộ là '/bills'
    const result = await apiFetch("/bills", {
      method: "GET",
    });

    console.log("API Response (Bill - Cần kiểm tra cấu trúc này):", result);

    const bills = Array.isArray(result) ? result : result.bills;
    renderBills(bills || []);
  } catch (error) {
    // apiFetch đã tự động throw Error với message từ server (hoặc message lỗi custom)
    console.error("Lỗi khi tải hóa đơn:", error);
    messageArea.textContent = `Tải dữ liệu thất bại: ${error.message}`;
    document.getElementById("message-area").textContent =
      `Tải dữ liệu thất bại: ${error.message}`;
    billsListContainer.innerHTML = "";
  }
}

// Hàm tải chi tiết Căn hộ theo ID từ API Backend
async function loadBillDetail(id) {
  detailContainer.innerHTML = `<div id="message-area">Đang tải chi tiết Hoá đơn ID: ${id}...</div>`;

  try {
    const result = await apiFetch(`/bills/${id}`, {
      method: "GET",
    });

    const bill = Array.isArray(result) ? result.bill : result.bill.id;

    renderBillDetail(result.bill || []);
  } catch (error) {
    console.error("Lỗi khi tải chi tiết Hoá đơn:", error);
    detailContainer.innerHTML = `<div class="detail-card" style="color: var(--color-button-delete)">Lỗi tải chi tiết: ${error.message}</div>`;
    listView.style.display = "none";
    detailView.style.display = "block";
  }
}

// Tải chi tiết Căn hộ cho chế độ Sửa
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
        "success",
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
    // Endpoint: /bills/:id (truyền object status)
    const result = await apiFetch(`/bills/${id}/status`, {
      method: "PATCH",
      body: { status: newStatus },
    });

    if (result && result.success) {
      displayMessage(
        `Cập nhật trạng thái hóa đơn ${id} thành công!`,
        "success",
      );
    } else {
      throw new Error(result.message || "Cập nhật thất bại.");
    }
  } catch (error) {
    console.error("Lỗi cập nhật trạng thái:", error);
    displayMessage(`Lỗi: ${error.message}`, "error");
    // Tải lại danh sách để reset trạng thái hiển thị về đúng dữ liệu gốc nếu lỗi
    loadBills();
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
        "success",
      );
      loadBills(); // Tải lại danh sách sau khi xóa thành công
    } else {
      // Trường hợp API trả về 200 nhưng có success: false
      throw new Error(
        result?.message || "Xóa căn hộ thất bại do lỗi không xác định.",
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
        "success",
      );
    } else {
      throw new Error(
        result?.message ||
          `${actionName} căn hộ thất bại do lỗi không xác định.`,
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
      loadBillDetail(id);
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
          "error",
        );
      }
    });
  });
}

// Thiết lập các listener chung cho cả trang (Nút Quay lại, nút Thêm mới).
function setupGlobalEventListeners() {
  // Nút Thêm Loại phòng mới (chuyển sang Add View)
  // addNewBtn.addEventListener("click", showAddView);

  // Nút Quay lại Danh sách (từ Detail View)
  backToListBtn.addEventListener("click", showListView);

  // // Nút Hủy (từ Add View)
  cancelAddBtn.addEventListener("click", showListView);

  // // Submit Form Thêm mới
  // addApartmentForm.addEventListener("submit", handleSubmitForm);

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

  // Tải dữ liệu hóa đơn
  loadBills();
});
