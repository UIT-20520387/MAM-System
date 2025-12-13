import { apiFetch } from '../config/config.js';

/**
 * Hàm render danh sách Loại Phòng ra bảng HTML.
 * @param {Array<Object>} roomTypes - Mảng các đối tượng loại phòng.
 */
function renderRoomTypes(roomTypes) {
    const listContainer = document.getElementById('room-types-list');
    
    if (!roomTypes || roomTypes.length === 0) {
        listContainer.innerHTML = '<div id="message-area">Không có loại phòng nào được tìm thấy.</div>';
        return;
    }

    let tableHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Tên Loại Phòng</th>
                    <th>Giá (VNĐ/tháng)</th>
                    <th>Mô tả</th>
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
                <td>${roomType.description || 'N/A'}</td>
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
    
    listContainer.innerHTML = tableHTML;
    
    // TODO: Gắn sự kiện cho các nút Edit/Delete (nếu cần)
    // document.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', handleEdit));
    // document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', handleDelete));
}


/**
 * Hàm tải dữ liệu Loại Phòng từ API Backend.
 */
async function loadRoomTypes() {
    const messageArea = document.getElementById('message-area');
    messageArea.textContent = 'Đang tải dữ liệu loại phòng...';

    try {
        // Endpoint cho GET All Loại Phòng là '/room-type' (Vì API_BASE_URL đã kết thúc bằng /api)
        const result = await apiFetch('/roomtype', {
            method: 'GET'
        });

        // Giả định API trả về một mảng hoặc một đối tượng có thuộc tính 'data' là mảng
        // Nếu API trả về trực tiếp mảng: renderRoomTypes(result);
        // Nếu API trả về { data: [...] }: renderRoomTypes(result.data);
        
        // Ta sử dụng cả hai để linh hoạt:
        const roomTypes = Array.isArray(result) ? result : result.roomTypes;
        
        renderRoomTypes(roomTypes || []); 
        
    } catch (error) {
        // apiFetch đã tự động throw Error với message từ server (hoặc message lỗi custom)
        console.error('Lỗi khi tải Loại Phòng:', error);
        messageArea.textContent = `Tải dữ liệu thất bại: ${error.message}`;
    }
}


// Chạy logic khi DOM đã sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
    // 1. Kích hoạt menu active (Hàm này được gọi từ utils.js)
    if (window.setActiveMenu) {
        window.setActiveMenu();
    }
    
    // 2. Tải dữ liệu loại phòng
    loadRoomTypes();
});