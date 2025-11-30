import { apiFetch } from "../config/config.js"; // Import hàm fetch chung

// DOM elements
const loginForm = document.getElementById("login-form").querySelector("form");
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const loginBtn = document.getElementById("loginBtn");

// Tạo Message Container nếu chưa có
let messageContainer = document.getElementById("authMessage");
if (!messageContainer && loginForm) {
  messageContainer = document.createElement("div");
  messageContainer.id = "authMessage";
  loginForm.insertBefore(messageContainer, loginBtn?.nextSibling || null);
}
// Ẩn ban đầu
if (messageContainer) {
  messageContainer.style.display = "none";
}

/**
 * Hiển thị thông báo thành công hoặc lỗi trên form.
 * @param {string} message - Nội dung thông báo.
 * @param {boolean} isError - True nếu là lỗi, False nếu là thành công.
 */
function displayMessage(message, isError = false) {
  if (!messageContainer) return;

  if (!message) {
    messageContainer.style.display = "none";
    messageContainer.textContent = "";
    return;
  }

  messageContainer.textContent = message;
  messageContainer.style.display = "block";

  // Áp dụng CSS thuần để phân biệt màu sắc
  messageContainer.style.padding = "10px";
  messageContainer.style.margin = "10px 0";
  messageContainer.style.borderRadius = "5px";
  messageContainer.style.fontWeight = "500";
  messageContainer.style.textAlign = "center";

  if (isError) {
    messageContainer.style.color = "#991b1b"; // Text màu đỏ đậm
    messageContainer.style.backgroundColor = "#fee2e2"; // Nền màu đỏ nhạt
    messageContainer.style.border = "1px solid #f87171";
  } else {
    messageContainer.style.color = "#065f46"; // Text màu xanh lá đậm
    messageContainer.style.backgroundColor = "#d1fae5"; // Nền màu xanh lá nhạt
    messageContainer.style.border = "1px solid #34d399";
  }
}

/**
 * Xử lý chuyển hướng dựa trên Role của người dùng.
 * @param {string} role - Role của người dùng ('admin', 'manager', 'tenant').
 */
function redirectToDashboard(role) {
  let path = "";
  switch (role?.toLowerCase()) {
    case "admin":
      path = "html/admin/dashboard.html";
      break;
    case "manager":
      path = "html/manager/dashboard.html";
      break;
    case "tenant":
      path = "html/tenant/dashboard.html";
      break;
    default:
      // Xử lý role không hợp lệ, chuyển về trang đăng nhập
      displayMessage(
        "Role không hợp lệ. Vui lòng liên hệ quản trị viên.",
        true
      );
      localStorage.clear();
      return;
  }
  // Chuyển hướng
  window.location.href = path;
}

/**
 * Xử lý sự kiện đăng nhập.
 * @param {Event} event
 */
const handleLogin = async (event) => {
  event.preventDefault(); // Ngăn chặn form submit mặc định

  if (!loginBtn || !emailInput || !passwordInput) return;

  loginBtn.disabled = true;
  loginBtn.textContent = "Đang xử lý...";
  displayMessage(""); // Xóa thông báo cũ

  const email = emailInput.value;
  const password = passwordInput.value;

  let isSuccess = false; // Biến cờ mới để kiểm tra thành công
  let userRole = null; // Biến lưu role để chuyển hướng

  try {
    const payload = { email, password };

    // Gọi API Đăng nhập
    const response = await apiFetch("/auth/login", {
      method: "POST",
      body: payload,
    });

    if (response.success && response.token) {
      // Trường hợp Đăng nhập THÀNH CÔNG
      isSuccess = true;
      userRole = response.user.role;
      localStorage.setItem("auth_token", response.token);
      localStorage.setItem("user_role", userRole);

      displayMessage("Đăng nhập thành công! Đang chuyển hướng...", false);
      await new Promise((resolve) => setTimeout(resolve, 1500));
    } else {
      // Trường hợp Đăng nhập THẤT BẠI: Hiển thị lỗi và delay
      const errorMessage =
        response.message || "Email hoặc mật khẩu không đúng.";
      displayMessage(errorMessage, true);
      await new Promise((resolve) => setTimeout(resolve, 3000));
      if (loginBtn) {
        loginBtn.disabled = false;
        loginBtn.textContent = "Đăng nhập";
      }
      displayMessage("");
    }
  } catch (error) {
    // Xử lý lỗi hệ thống/mạng: Hiển thị lỗi và delay
    const errorMessage = error.message.includes("Failed to fetch")
      ? "Lỗi kết nối đến Server. Vui lòng kiểm tra Server Back-end đang chạy và cấu hình CORS."
      : `Lỗi: ${error.message}`;

    displayMessage(errorMessage, true);
    await new Promise((resolve) => setTimeout(resolve, 3000));
    if (loginBtn) {
      loginBtn.disabled = false;
      loginBtn.textContent = "Đăng nhập";
    }
    displayMessage("");
  } finally {
    if (isSuccess && userRole) {
      // Nếu thành công và đã chờ 3s, CHUYỂN HƯỚNG
      redirectToDashboard(userRole);
    }
  }
};

// Đính kèm listener cho sự kiện submit form
if (loginForm) {
  loginForm.addEventListener("submit", handleLogin);
}

// ======================================================================
// LOGIC KIỂM TRA ĐĂNG NHẬP SẴN CÓ KHI VÀO TRANG CHỦ
// ======================================================================

document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("auth_token");
  const role = localStorage.getItem("user_role");

  if (token && role) {
    const pathSegments = window.location.pathname.split("/");
    const currentPage = pathSegments[pathSegments.length - 1];

    // Chỉ chuyển hướng khi đang ở trang index.html
    if (currentPage === "index.html" || currentPage === "") {
      console.log("Đã có token, tự động chuyển hướng đến dashboard...");
      redirectToDashboard(role);
    }
  }
});
