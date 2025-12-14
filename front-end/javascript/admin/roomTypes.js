import { apiFetch } from '../config/config.js';

// --- KHAI BÁO CÁC PHẦN TỬ DOM ---
const listView = document.getElementById('list-view');
const detailView = document.getElementById('detail-view');
const addView = document.getElementById('add-view');
const roomTypesListContainer = document.getElementById('room-types-list');
const detailContainer = document.getElementById('detail-container');
const messageArea = document.getElementById('message-area'); 

// Các nút và form
const addNewBtn = document.getElementById('addNewBtn');
const backToListBtn = document.getElementById('backToListBtn');
const addRoomTypeForm = document.getElementById('addRoomTypeForm'); 
const cancelAddBtn = document.getElementById('cancelAddBtn'); 
const formMessage = document.getElementById('form-message'); 

// Modal Elements (Mới)
const deleteConfirmModal = document.getElementById('deleteConfirmModal');
const modalConfirmBtn = document.getElementById('modalConfirmBtn');
const modalCancelBtn = document.getElementById('modalCancelBtn');
const modalBodyText = document.getElementById('modalBodyText');

// ====================================================================
// CÁC HÀM QUẢN LÝ VIEW (CHUYỂN ĐỔI GIAO DIỆN)
// ====================================================================

function displayMessage(message, type = 'error') {
    messageArea.textContent = message;
    messageArea.className = `message-${type}`;
    messageArea.style.display = 'block';
    setTimeout(() => {
        messageArea.style.display = 'none';
    }, 5000); 
}

// Hiển thị thông báo trạng thái trong form (Thêm mới/Edit)
function displayFormMessage(message, type = 'error') {
    formMessage.textContent = message;
    formMessage.className = `message-${type}`;
    formMessage.style.display = 'block';
}

// Chuyển về chế độ xem danh sách
function showListView() {
    detailView.style.display = 'none';
    addView.style.display = 'none'; 
    listView.style.display = 'block';
    loadRoomTypes(); 
}

// Chuyển sang chế độ xem form Thêm mới
function showAddView() {
    listView.style.display = 'none';
    detailView.style.display = 'none';
    addView.style.display = 'block';
    
    // Reset form và thông báo khi mở
    addRoomTypeForm.reset(); 
    formMessage.style.display = 'none';
}


// ====================================================================
// CÁC HÀM RENDER UI
// ====================================================================

// Hàm hiển thị danh sách Loại Phòng
function renderRoomTypes(roomTypes) {
    if (!roomTypes || roomTypes.length === 0) {
        roomTypesListContainer.innerHTML = '<div id="message-area">Không có loại phòng nào được tìm thấy.</div>';
        return;
    }

    let tableHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Tên Loại Phòng</th>
                    <th>Giá gốc (VNĐ/tháng)</th>
                    <th>Hành động</th>
                </tr>
            </thead>
            <tbody>
    `;

    roomTypes.forEach(roomType => {
        // Sử dụng Intl.NumberFormat để định dạng tiền tệ Việt Nam
        const formattedPrice = new Intl.NumberFormat('vi-VN').format(roomType.base_price || 0);
        
        tableHTML += `
            <tr>
                <td>${roomType.type_id}</td>
                <td>${roomType.type_name}</td>
                <td>${formattedPrice}</td>
                <td>
                    <div class="action-group">
                        <button class="action-btn view-detail-btn" data-id="${roomType.type_id}" title="Xem chi tiết">
                            <span class="material-symbols-outlined">visibility</span>
                        </button>

                        <button class="action-btn edit-btn" data-id="${roomType.type_id}" title="Chỉnh sửa">
                            <span class="material-symbols-outlined">edit</span>
                        </button>

                        <button class="action-btn delete-btn" data-id="${roomType.type_id}" title="Xóa">
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
    
    roomTypesListContainer.innerHTML = tableHTML;
    
    // Sau khi render xong bảng, thiết lập lại listeners cho các nút trong bảng
    setupTableEventListeners();
}

// Hàm hiển thị chi tiết Loại Phòng
function renderRoomDetail(roomType) {
    const formattedPrice = new Intl.NumberFormat('vi-VN').format(roomType.base_price || 0);
    
    const detailHTML = `
        <div class="detail-card">
            <div class="detail-row">
                <div class="detail-label">ID:</div>
                <div class="detail-value">${roomType.type_id}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Tên Loại Phòng:</div>
                <div class="detail-value">${roomType.type_name}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Giá gốc (VNĐ/tháng):</div>
                <div class="detail-value">${formattedPrice}</div>
            </div>
            <div class="detail-row" style="border-bottom: none;">
                <div class="detail-label">Mô tả:</div>
                <div class="detail-value">${roomType.description || 'Không có mô tả chi tiết.'}</div>
            </div>
        </div>
    `;
    
    document.getElementById('detail-title').textContent = `Chi tiết Loại Phòng: ${roomType.type_name}`;
    detailContainer.innerHTML = detailHTML;
    
    // Ẩn danh sách, hiển thị chi tiết
    listView.style.display = 'none';
    addView.style.display = 'none';
    detailView.style.display = 'block';
}



// ====================================================================
// CÁC HÀM XỬ LÝ DỮ LIỆU/API
// ====================================================================


//Hàm tải dữ liệu Loại Phòng từ API Backend.
async function loadRoomTypes() {
    messageArea.textContent = 'Đang tải dữ liệu loại phòng...';

    try {
        // Endpoint cho GET All Loại Phòng là '/roomtype' 
        const result = await apiFetch('/roomtype', {
            method: 'GET'
        });

        console.log('API Response (Room Types - Cần kiểm tra cấu trúc này):', result);

        const roomTypes = Array.isArray(result) ? result : result.roomTypes;
        
        renderRoomTypes(roomTypes || []); 
        
    } catch (error) {
        // apiFetch đã tự động throw Error với message từ server (hoặc message lỗi custom)
        console.error('Lỗi khi tải Loại Phòng:', error);
        messageArea.textContent = `Tải dữ liệu thất bại: ${error.message}`;
        document.getElementById('message-area').textContent = `Tải dữ liệu thất bại: ${error.message}`;
        roomTypesListContainer.innerHTML = '';
    }
}

// Hàm tải chi tiết Loại Phòng theo ID từ API Backend
async function loadRoomDetail(id) {
    detailContainer.innerHTML = `<div id="message-area">Đang tải chi tiết loại phòng ID: ${id}...</div>`;
    
    try {
        const result = await apiFetch(`/roomtype/${id}`, {
            method: 'GET'
        });

        const roomType = Array.isArray(result) ? result.roomType : result.roomType.id;

        renderRoomDetail(result.roomType || []); 

    } catch (error) {
        console.error('Lỗi khi tải chi tiết Loại Phòng:', error);
        detailContainer.innerHTML = `<div class="detail-card" style="color: var(--color-button-delete)">Lỗi tải chi tiết: ${error.message}</div>`;
        listView.style.display = 'none';
        detailView.style.display = 'block';
    }
}

/**
 * Hàm xử lý Xóa Loại Phòng sau khi xác nhận. 
 * @param {string} id - ID của loại phòng cần xóa.
 */
async function handleDeleteRoomType(id) {
    if (!id) return;
    
    // Ẩn modal và hiển thị thông báo xử lý
    if (deleteConfirmModal) {
        deleteConfirmModal.style.display = 'none';
    }

    displayMessage(`Đang xóa loại phòng ID: ${id}...`, 'info');

    try {
        const result = await apiFetch(`/roomtype/${id}`, {
            method: 'DELETE',
        });

        // Kiểm tra success
        if (result && result.success) {
            displayMessage(result.message || `Xóa loại phòng ID: ${id} thành công!`, 'success');
            loadRoomTypes(); // Tải lại danh sách sau khi xóa thành công
        } else {
             // Trường hợp API trả về 200 nhưng có success: false 
             throw new Error(result?.message || 'Xóa loại phòng thất bại do lỗi không xác định.');
        }

    } catch (error) {
        console.error('Lỗi khi xóa Loại Phòng (DELETE - FAILED):', error);
        
        let errorMessage = `Xóa thất bại: ${error.message}`;
        if (error.status === 404) {
             errorMessage = 'Không tìm thấy loại phòng cần xóa.';
        } else if (error.status === 409) {
             // Bắt lỗi ràng buộc khóa ngoại từ logic backend của bạn
             errorMessage = error.message || 'Không thể xóa loại phòng vì nó đang được sử dụng.';
        } else if (error.status === 403) {
             errorMessage = error.message || 'Bạn không có quyền xóa loại phòng này (Yêu cầu Admin).';
        } else if (error.status) {
             errorMessage = `Xóa thất bại: Lỗi HTTP ${error.status}. Vui lòng kiểm tra Console.`;
        }
        
        displayMessage(errorMessage, 'error');
    }
}

/**
 * Xử lý submit form Thêm mới Loại Phòng
 * @param {Event} event - Sự kiện submit form
 */
async function handleAddSubmit(event) {
    event.preventDefault();
    
    formMessage.style.display = 'none';
    
    const form = event.target;
    const submitButton = form.querySelector('.submit-button');
    
    // Tắt nút submit trong khi chờ
    submitButton.disabled = true;
    submitButton.textContent = 'Đang xử lý...';

    const priceValue = form.base_price.value.trim();
    const parsedPrice = parseInt(priceValue, 10);
    
    // Thu thập dữ liệu form theo yêu cầu database
    const roomType = {
        type_id: form.type_id.value.trim(),
        type_name: form.type_name.value.trim(),
        // Chuyển Giá Gốc sang kiểu số nguyên
        base_price: isNaN(parsedPrice) ? 0 : parsedPrice, 
        description: form.description.value.trim(),
    };

    console.log('Dữ liệu gửi lên API POST:', roomType);
    
    // Thêm kiểm tra validation đơn giản (base_price > 0)
    if (roomType.base_price <= 0 || isNaN(roomType.base_price)) {
        displayFormMessage('Giá gốc phải là một số nguyên dương.', 'error');
        submitButton.disabled = false;
        submitButton.innerHTML = '<span class="material-symbols-outlined" style="margin-right: 5px;">save</span> Thêm Mới';
        return;
    }
    if (!roomType.type_id) {
         displayFormMessage('ID Loại Phòng không được để trống.', 'error');
         submitButton.disabled = false;
         submitButton.innerHTML = '<span class="material-icons" style="margin-right: 5px;">save</span> Thêm Mới';
         return;
    }

    try {
        // ENDPOINT THÊM MỚI: POST /roomtype
        const result = await apiFetch('/roomtype', {
            method: 'POST',
            body: roomType,
        });

        console.log('API Response (Add Room Type):', result);

        // Giả định nếu API trả về thành công 200/201
        // Kiểm tra success: true từ response JSON của backend
        if (result && result.success) {
            displayFormMessage(result.message || 'Thêm loại phòng mới thành công!', 'success');
        } else {
             // Trường hợp backend trả về 200/201 nhưng có success: false (Ít xảy ra)
             throw new Error(result.message || 'Thêm loại phòng thất bại do lỗi không xác định.');
        }
        
        // Quay lại danh sách sau 1.5 giây
        setTimeout(() => {
            showListView();
        }, 1500);

    } catch (error) {
        // Xử lý lỗi từ API (ví dụ: ID đã tồn tại)
        console.error('Lỗi khi thêm Loại Phòng:', error);

        let errorMessage = `Thêm mới thất bại: ${error.message}`;
        let status = error.status || '???';
        
        // Xử lý lỗi từ API (400, 401, 403, 409, 500)
        if (error.status === 409) { 
            errorMessage = error.message || 'Mã loại phòng này đã tồn tại.';
        } else if (error.status === 400 && error.message) { 
             errorMessage = error.message;
        } else if (error.status === 403) { 
             errorMessage = error.message || 'Bạn không có quyền thực hiện hành động này (Yêu cầu Admin).';
        } else if (error.status) {
             // Lỗi Response HTML (400 Bad Request do JSON Double-stringified)
             if (error.message.includes('Server trả về HTML')) {
                errorMessage = error.message; 
             } else {
                errorMessage = `Thêm mới thất bại: Lỗi HTTP ${status}. Vui lòng kiểm tra Console.`;
             }
        }
        
        displayFormMessage(`Thêm mới thất bại: ${error.message}`, 'error');
        
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = '<span class="material-symbols-outlined" style="margin-right: 5px;">save</span> Lưu';
    }
}

// ====================================================================
// QUẢN LÝ SỰ KIỆN
// ====================================================================

// Thiết lập các listener cho các nút trong bảng (View, Edit, Delete).
// Hàm này phải được gọi lại sau mỗi lần render bảng.
function setupTableEventListeners() {
    // Listener cho nút View
    document.querySelectorAll('.view-detail-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const id = event.currentTarget.dataset.id;
            loadRoomDetail(id);
        });
    });
    
    // Bạn có thể thêm listener cho nút Edit và Delete ở đây sau
    // document.querySelectorAll('.edit-btn').forEach(button => { /* ... */ });

    // Listener cho nút Delete
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const id = event.currentTarget.dataset.id;
            
            // Chỉ chạy logic Modal nếu các phần tử Modal tồn tại
            if (deleteConfirmModal && modalConfirmBtn && modalBodyText) {
                // Cập nhật nội dung Modal
                modalBodyText.textContent = `Bạn có chắc chắn muốn xóa loại phòng với ID: ${id}? Hành động này không thể hoàn tác.`;
                
                // Gán ID vào nút xác nhận
                modalConfirmBtn.dataset.idToDelete = id;

                // Hiển thị Modal
                deleteConfirmModal.style.display = 'flex'; 
            } else {
                 console.error("Lỗi: Các phần tử Modal không tìm thấy.");
                 displayMessage('Lỗi: Không tìm thấy hộp thoại xác nhận. Vui lòng kiểm tra console.', 'error');
            }
        });
    });
}

// Thiết lập các listener chung cho cả trang (Nút Quay lại, nút Thêm mới).
function setupGlobalEventListeners() {
    // Nút Thêm Loại phòng mới (chuyển sang Add View)
    addNewBtn.addEventListener('click', showAddView);
    
    // Nút Quay lại Danh sách (từ Detail View)
    backToListBtn.addEventListener('click', showListView);
    
    // Nút Hủy (từ Add View)
    cancelAddBtn.addEventListener('click', showListView);

    // Submit Form Thêm mới
    addRoomTypeForm.addEventListener('submit', handleAddSubmit);

    // Logic Modal (Sử dụng các element đã tồn tại trong DOM)
    if (modalCancelBtn && modalConfirmBtn && deleteConfirmModal) {
        // Hủy bỏ việc xóa
        modalCancelBtn.addEventListener('click', () => {
            deleteConfirmModal.style.display = 'none';
            modalConfirmBtn.dataset.idToDelete = ''; // Xóa ID đã gán
        });

        // Xác nhận xóa
        modalConfirmBtn.addEventListener('click', () => {
            const id = modalConfirmBtn.dataset.idToDelete;
            if (id) {
                handleDeleteRoomType(id);
            }
        });
        
        // Đóng Modal khi click ra ngoài
        deleteConfirmModal.addEventListener('click', (event) => {
            if (event.target === deleteConfirmModal) {
                deleteConfirmModal.style.display = 'none';
                modalConfirmBtn.dataset.idToDelete = '';
            }
        });
    }
}


// ====================================================================
// KHỞI TẠO
// ====================================================================

// Chạy logic khi DOM đã sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
    // Kích hoạt menu active (Hàm này được gọi từ utils.js)
    if (window.setActiveMenu) {
        window.setActiveMenu();
    }
    
    // Thiết lập các listener cố định (Quay lại, Thêm mới)
    setupGlobalEventListeners();


    // Tải dữ liệu loại phòng
    loadRoomTypes();
});