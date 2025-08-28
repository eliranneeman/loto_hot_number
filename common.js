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
            sidebar.style.transform = "translateX(-250px)";
            sidebar.setAttribute("aria-hidden", "false");
        }
    }
    
    if (e.target.closest('#menu-close-btn')) {
        if (sidebar) {
            sidebar.style.transform = "translateX(0)";
            sidebar.setAttribute("aria-hidden", "true");
        }
    }
});

let fontSize = 100;

function increaseFont() {
  fontSize += 10;
  document.body.style.fontSize = fontSize + "%";
}

function decreaseFont() {
  fontSize -= 10;
  document.body.style.fontSize = fontSize + "%";
}

function toggleContrast() {
  document.body.classList.toggle("high-contrast");
}

function toggleLinks() {
  document.body.classList.toggle("highlight-links");
}

function resetAccessibility() {
  fontSize = 100;
  document.body.style.fontSize = "100%";
  document.body.classList.remove("high-contrast", "highlight-links");
}
