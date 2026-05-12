/* --- JAVASCRIPT LOGIC --- */
let currentGroup = null;
/**
 * Switch between app pages by ID
 * @param {string} pageId - The ID of the div to show
 */
function showPage(pageId) {
    // Hide all pages
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.classList.remove('active'));

    // Show the requested page
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
    }

    // Always close sidebar when navigating to a new page
    const sidebar = document.getElementById('sidebar');
    if (sidebar.classList.contains('open')) {
        toggleMenu();
    }
}

/**
 * Toggles the visibility of the sidebar menu and the darkened overlay
 */
function toggleMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    
    if (sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
        overlay.style.display = 'none';
    } else {
        sidebar.classList.add('open');
        overlay.style.display = 'block';
    }
}