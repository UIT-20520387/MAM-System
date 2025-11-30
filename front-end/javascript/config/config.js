// ĐỊNH NGHĨA BASE URL CỦA BACKEND
const API_BASE_URL = 'http://localhost:3000/api'; 

/**
 * Hàm hỗ trợ gọi API Backend với Authorization Token.
 * @param {string} endpoint - Ví dụ: '/auth/login', '/apartments'
 * @param {object} options - Các tùy chọn cho fetch (method, body, headers,...)
 * @returns {Promise<object>} - Trả về đối tượng JSON response từ server
 */
const apiFetch = async (endpoint, options = {}) => {
    // Lấy token và role từ localStorage
    const token = localStorage.getItem('auth_token');
    
    // Thiết lập Header mặc định
    const defaultHeaders = {
        'Content-Type': 'application/json',
        ...options.headers // Cho phép ghi đè headers
    };

    // Nếu có token, thêm vào Authorization Header
    if (token) {
        defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    try {
        const url = `${API_BASE_URL}${endpoint}`;
        
        const response = await fetch(url, {
            ...options,
            headers: defaultHeaders,
            // Chuyển đổi body object thành JSON string nếu có
            body: options.body ? JSON.stringify(options.body) : undefined 
        });

        // Xử lý lỗi HTTP chung
        if (!response.ok) {
            // Đọc lỗi từ server response
            const errorData = await response.json().catch(() => ({ message: 'Lỗi không xác định từ server.' }));
            
            // Xử lý Unauthenticated (token hết hạn/sai)
            if (response.status === 401 || response.status === 403) {
                 // Nếu đây là lỗi 401/403, kiểm tra nếu có token, ta xóa nó
                if (localStorage.getItem('auth_token')) {
                    console.error("Token hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.");
                    // Xóa token cũ
                    localStorage.clear(); 
                    // CHUYỂN HƯỚNG TẠI ĐÂY CHỈ KHI TOKEN ĐÃ HẾT HẠN (tức là có token nhưng lại bị 401/403)
                    if (endpoint !== '/auth/login' && endpoint !== '/auth/register') {
                        window.location.href = 'index.html'; 
                        // Dừng xử lý tiếp
                        throw new Error("Phiên làm việc đã hết hạn.");
                    }
                }
            }

            // Throw error để các hàm gọi apiFetch có thể bắt và xử lý
            throw new Error(errorData.message || `Lỗi HTTP: ${response.status} - ${response.statusText}`);
        }

        // Kiểm tra xem response có nội dung không (ví dụ: DELETE 204 No Content)
        if (response.status === 204) {
            return { success: true, message: "Thao tác thành công, không có nội dung trả về." };
        }

        return response.json();

    } catch (error) {
        // Ghi lại lỗi mạng hoặc lỗi custom
        console.error("API Fetch Error:", error.message);
        throw error;
    }
};

export { API_BASE_URL, apiFetch };