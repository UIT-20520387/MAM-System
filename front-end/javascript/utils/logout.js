import { apiFetch } from '../config/config.js'; 

/**
 * Xử lý toàn bộ quá trình Đăng xuất (Logout)
 * @param {string} basePath - Đường dẫn tương đối để trở về index.html.
 */
async function handleLogout() {
    // GỌI API LOGOUT TRÊN BACK-END
    try {
        // Dùng apiFetch cho endpoint /auth/logout đã tạo ở bước trước
        await apiFetch('/auth/logout', {
            method: 'POST',
            // API Logout không cần body, nhưng cần gửi token qua header (đã được apiFetch xử lý)
        });
        
        // Console log để kiểm tra
        console.log("Logout API call successful (or ignored by server).");

    } catch (error) {
        // Lỗi gọi API (mạng, CORS, 500 server)
        console.error("Lỗi khi gọi API Logout (có thể không quan trọng):", error.message);
        // Chúng ta vẫn tiếp tục quá trình xóa token client-side dù server có lỗi, 
        // vì Front-end cần phải đăng xuất.
    }

    // XÓA TOKEN VÀ ROLE TRONG LOCAL STORAGE
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_role');
    
    // CHUYỂN HƯỚNG VỀ TRANG ĐĂNG NHẬP (index.html)
    const redirectPath = '../../../index.html'; // Lùi 3 cấp: ra khỏi utils/, ra khỏi javascript/, ra khỏi front-end/ -> Không đúng!

    // Dùng đường dẫn tương đối từ vị trí dashboard.html (html/[role]/) để đảm bảo đúng:
    window.location.href = '../../index.html'; 
}

function attachLogoutListener() {
    const logoutBtn = document.getElementById('logoutBtn');
    
    // Đảm bảo DOM đã tải hoàn tất trước khi gắn sự kiện
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            handleLogout();
        });
    } else {
        console.warn("Không tìm thấy nút Logout với ID 'logoutBtn'. Vui lòng kiểm tra lại ID trong HTML.");
    }
}

// Gắn sự kiện khi DOM đã tải xong
document.addEventListener('DOMContentLoaded', attachLogoutListener);

// Xuất hàm handleLogout để có thể sử dụng trực tiếp nếu cần
export { handleLogout };