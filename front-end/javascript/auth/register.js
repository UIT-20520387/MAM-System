import { apiFetch } from '../config/config.js'; 
import { displayMessage} from '../utils/domUtils.js';

/**
 * Chuyển đổi ngày tháng từ định dạng chuẩn ISO (YYYY-MM-DD) sang DD/MM/YYYY.
 * @param {string} dateString - Ngày tháng ở định dạng YYYY-MM-DD.
 * @returns {string|null} - Ngày tháng ở định dạng DD/MM/YYYY hoặc null nếu không hợp lệ.
 */
function convertToVNFormat(dateString) {
    // Kiểm tra định dạng YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return null; 
    }
    const parts = dateString.split('-');
    // parts[0] = YYYY, parts[1] = MM, parts[2] = DD
    return `${parts[2]}/${parts[1]}/${parts[0]}`; 
}

// ======================================================================
// KHAI BÁO BIẾN DOM
// ======================================================================

const registerForm = document.getElementById('register-form')?.querySelector('form')
const fullNameInput = document.getElementById('fullnameInput'); 
const emailInput = document.getElementById('emailInput'); 
const passwordInput = document.getElementById('passwordInput'); 
const dobInput = document.getElementById('dobInput'); 
const phoneInput = document.getElementById('phoneInput'); 
const idCardInput = document.getElementById('idCardInput'); 

const genderMale = document.getElementById('genderMale');
const genderFemale = document.getElementById('genderFemale');

let registerBtn = document.getElementById('registerBtn'); 

// Tạo Message Container
let messageContainer = document.getElementById('authMessage');
if (!messageContainer) {
    messageContainer = document.createElement('div');
    messageContainer.id = 'authMessage';
    if (registerForm && registerBtn) {
        registerForm.insertBefore(messageContainer, registerBtn);
    }
}
if (messageContainer) {
    messageContainer.style.display = 'none';
}

/**
 * Lấy giá trị giới tính được chọn.
 * @returns {string} - 'Nam' hoặc 'Nữ'.
 */
function getSelectedGender() {
    if (genderMale && genderMale.checked) return 'Nam'; 
    if (genderFemale && genderFemale.checked) return 'Nữ'; 
    return '';
}


/**
 * Xử lý sự kiện đăng ký.
 */
const handleRegister = async (event) => {
    event.preventDefault(); 

    // Kiểm tra DOM inputs quan trọng
    if (!registerBtn || !emailInput || !passwordInput || !fullNameInput || !dobInput || !phoneInput || !idCardInput) {
        displayMessage('Lỗi hệ thống: Thiếu các trường nhập liệu Email/Mật khẩu hoặc các trường khác.', true);
        return;
    }
    
    const email = emailInput.value;
    const password = passwordInput.value;
    const fullName = fullNameInput.value;
    const gender = getSelectedGender(); 
    const dobISO = dobInput.value; // Lấy giá trị chuẩn ISO (YYYY-MM-DD)
    const phoneNumber = phoneInput.value;
    const idCardNumber = idCardInput.value;

    // 1. Chuyển đổi định dạng ngày tháng từ YYYY-MM-DD (giá trị của input date) sang DD/MM/YYYY
    const dobVNFormat = convertToVNFormat(dobISO);

    if (!dobISO || !dobVNFormat) {
        displayMessage('Lỗi: Ngày sinh không hợp lệ. Vui lòng chọn ngày (MM/DD/YYYY từ lịch trình duyệt).', true);
        return;
    }

    // Tắt nút và thông báo
    registerBtn.disabled = true;
    registerBtn.textContent = 'Đang xử lý...';
    displayMessage('');

    try {
        // Payload gửi lên Backend: dob phải là DD/MM/YYYY như yêu cầu của bạn
        const payload = { 
            email, 
            password, 
            fullName, 
            gender, 
            dob: dobVNFormat, // GỬI DD/MM/YYYY
            phoneNumber,
            idCardNumber,
        };
        
        const response = await apiFetch('/register', {
            method: 'POST',
            body: payload,
        });

        if (response.success) {
            displayMessage('Đăng ký thành công! Đang chuyển hướng về trang đăng nhập sau 3 giây...', false);
            
            await new Promise(resolve => setTimeout(resolve, 3000));
            window.location.href = './index.html'; 

        } else {
            const errorMessage = response.message || 'Đăng ký thất bại. Vui lòng thử lại.';
            displayMessage(errorMessage, true);
        }

    } catch (error) {
        const errorMessage = error.message.includes('Failed to fetch')
                            ? 'Lỗi kết nối đến Server. Vui lòng kiểm tra Back-end đang chạy.'
                            : error.message; 

        displayMessage(errorMessage, true);
    } finally {
        // Kích hoạt lại nút sau 3s nếu không chuyển hướng
        await new Promise(resolve => setTimeout(resolve, 3000));
        registerBtn.disabled = false;
        registerBtn.textContent = 'Đăng ký';
    }
};

if (registerForm) {
    registerForm.addEventListener('submit', handleRegister);
} else {
    console.error("Không thể gắn sự kiện submit vì thẻ FORM không được tìm thấy.");
}