// ===== טוען תפריט צדדי =====
fetch("/menu.html")
  .then(res => res.text())
  .then(html => {
    document.body.insertAdjacentHTML("beforeend", html);
  })
  .catch(err => {
    console.error("שגיאה בטעינת התפריט:", err);
  });

document.addEventListener('click', (e) => {
    const sidebar = document.getElementById("mySidebar");
    
    // בודק אם הקליק היה על כפתור הפתיחה
    if (e.target.closest('#menu-open-btn')) {
        if (sidebar) {
            sidebar.style.width = "250px";
            sidebar.setAttribute("aria-hidden", "false");
        }
    }
    
    // בודק אם הקליק היה על כפתור הסגירה
    if (e.target.closest('#menu-close-btn')) {
        if (sidebar) {
            sidebar.style.width = "0";
            sidebar.setAttribute("aria-hidden", "true");
        }
    }
});
