// ===== טוען תפריט צדדי =====
fetch("/menu.html")
  .then(res => res.text())
  .then(html => {
    document.body.insertAdjacentHTML("beforeend", html);

    // לאחר שה־HTML נטען, מחברים את האירועים
    const openBtn = document.getElementById("menu-open-btn");
    const closeBtn = document.getElementById("menu-close-btn");
    const sidebar = document.getElementById("mySidebar");

    openBtn.addEventListener("click", () => {
      sidebar.style.width = "250px";
      sidebar.setAttribute("aria-hidden", "false");
    });

    closeBtn.addEventListener("click", () => {
      sidebar.style.width = "0";
      sidebar.setAttribute("aria-hidden", "true");
    });
  });

// ===== טוען באנר קוקיז =====
fetch("/cookie-banner.html")
  .then(res => res.text())
  .then(html => {
    document.body.insertAdjacentHTML("beforeend", html);
    const script = document.createElement("script");
    script.src = "/cookie-banner.js";
    document.body.appendChild(script);
  });
