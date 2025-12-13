/**
 * Kích hoạt class 'active' cho mục menu tương ứng với trang hiện tại.
 * Cập nhật tiêu đề header (id="header-page-title").
 */
window.setActiveMenu = function() {
    const currentPath = window.location.pathname;
    const currentPage = currentPath.substring(currentPath.lastIndexOf('/') + 1);
    const navLinks = document.querySelectorAll('#nav-menu .nav-link');
    const headerTitleElement = document.getElementById('header-page-title');
    let found = false;

    navLinks.forEach(link => {
        const pageName = link.getAttribute('data-page-name');
        link.classList.remove('active');

        if (pageName === currentPage && !found) {
            link.classList.add('active');
            found = true;
            
            const linkText = link.querySelector('span:nth-of-type(2)').textContent;
            if (headerTitleElement) {
                headerTitleElement.textContent = linkText;
            }
        }
    });
    
    // Xử lý trường hợp trang gốc (ví dụ: /)
    if (!found && currentPage === "") {
         const defaultLink = document.querySelector('[data-page-name="dashboard.html"]');
         if(defaultLink) {
            defaultLink.classList.add('active');
            const defaultText = defaultLink.querySelector('span:nth-of-type(2)').textContent;
             if (headerTitleElement) {
                headerTitleElement.textContent = defaultText;
            }
         }
    }
};

