document.addEventListener('DOMContentLoaded', () => {
    fetch("/menu.html")
        .then(res => res.text())
        .then(html => {
            document.body.insertAdjacentHTML("beforeend", html);
        })
        .catch(err => {
            console.error("שגיאה בטעינת התפריט:", err);
        });
});

document.addEventListener('click', (e) => {
    const sidebar = document.getElementById("mySidebar");
    const overlay = document.getElementById("overlay");
    
    if (e.target.closest('#menu-open-btn')) {
        if (sidebar && overlay) {
            sidebar.style.transform = "translateX(0)";
            sidebar.setAttribute("aria-hidden", "false");
            overlay.classList.add("active");
        }
    }
    
    if (e.target.closest('#menu-close-btn') || e.target.closest('.overlay')) {
        if (sidebar && overlay) {
            sidebar.style.transform = "translateX(250px)";
            sidebar.setAttribute("aria-hidden", "true");
            overlay.classList.remove("active");
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
    document.body.classList.remove("high-contrast");
    document.body.style.fontSize = "";
}
