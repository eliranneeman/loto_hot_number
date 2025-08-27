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
    
    if (e.target.closest('#menu-open-btn')) {
        if (sidebar) {
            // פותח את התפריט על ידי הזזתו 250px שמאלה
            sidebar.style.transform = "translateX(-250px)";
            sidebar.setAttribute("aria-hidden", "false");
        }
    }
    
    if (e.target.closest('#menu-close-btn')) {
        if (sidebar) {
            // סוגר את התפריט על ידי החזרתו למצב המקורי
            sidebar.style.transform = "translateX(0)";
            sidebar.setAttribute("aria-hidden", "true");
        }
    }
});
