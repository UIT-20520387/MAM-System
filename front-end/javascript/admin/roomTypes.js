import { apiFetch } from '../config/config.js';

const listView = document.getElementById('list-view');
const detailView = document.getElementById('detail-view');
const roomTypesListContainer = document.getElementById('room-types-list');
const detailContainer = document.getElementById('detail-container');
const backToListBtn = document.getElementById('backToListBtn');
const messageArea = document.getElementById('message-area');

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
    detailView.style.display = 'block';
}

// Chuyển về chế độ xem danh sách
function showListView() {
    detailView.style.display = 'none';
    listView.style.display = 'block';
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

        const roomTypes = Array.isArray(result) ? result : result.roomTypes;
        
        renderRoomTypes(roomTypes || []); 
        
    } catch (error) {
        // apiFetch đã tự động throw Error với message từ server (hoặc message lỗi custom)
        console.error('Lỗi khi tải Loại Phòng:', error);
        messageArea.textContent = `Tải dữ liệu thất bại: ${error.message}`;
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
    // document.querySelectorAll('.delete-btn').forEach(button => { /* ... */ });
}

// Thiết lập các listener chung cho cả trang (Nút Quay lại, nút Thêm mới).
function setupGlobalEventListeners() {
    // Listener cho nút Quay lại
    backToListBtn.addEventListener('click', showListView);
    
    // Listener cho nút Thêm mới (Hiện tại chưa làm gì)
    document.querySelector('.add-button').addEventListener('click', () => {
        alert('Chức năng Thêm Loại Phòng sẽ được phát triển sau.'); 
    });
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