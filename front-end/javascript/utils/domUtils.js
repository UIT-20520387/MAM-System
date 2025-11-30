/**
 * Hiển thị thông báo trạng thái (thành công hoặc lỗi) trên giao diện.
 *
 * @param {string} message - Nội dung thông báo.
 * @param {boolean} isError - True nếu là thông báo lỗi (màu đỏ), False nếu là thành công (màu xanh).
 * @param {HTMLElement | string} container - Đối tượng DOM hoặc ID của div chứa thông báo.
 */
export function displayMessage(message, isError = false, container = 'authMessage') {
    // Xác định container
    let messageContainer;
    if (typeof container === 'string') {
        messageContainer = document.getElementById(container);
    } else {
        messageContainer = container;
    }

    if (!messageContainer) {
        console.error(`Lỗi: Không tìm thấy container thông báo với ID hoặc đối tượng: ${container}`);
        return;
    }
    
    // Xử lý trường hợp không có thông báo
    if (!message) {
        messageContainer.style.display = 'none';
        messageContainer.textContent = '';
        return;
    }

    // Hiển thị nội dung
    messageContainer.textContent = message;
    messageContainer.style.display = 'block';

    // Áp dụng CSS 
    messageContainer.style.cssText = `
        padding: 10px; 
        margin: 10px 0; 
        border-radius: 5px; 
        font-weight: 500; 
        text-align: center;
        border: 1px solid;
        color: ${isError ? '#991b1b' : '#065f46'};
        background-color: ${isError ? '#fee2e2' : '#d1fae5'};
        border-color: ${isError ? '#f87171' : '#34d399'};
    `;
}