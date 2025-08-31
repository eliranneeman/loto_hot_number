// ===== טוען תפריט צדדי =====
fetch("/menu1.html")
  .then(res => res.text())
  .then(html => {
    // עוטפים את התפריט בתוך DIV ייחודי
    const wrapper = document.createElement("div");
    wrapper.classList.add("custom-sidebar");
    wrapper.innerHTML = html;
    document.body.appendChild(wrapper);

    // הוספת מאזיני אירועים לאחר טעינה
    setTimeout(() => {
      initMenuEvents(wrapper);
      initAccessibilityEvents(wrapper);
    }, 100);
  })
  .catch(err => {
    console.error("שגיאה בטעינת התפריט:", err);
  });

// פונקציה להתקנת מאזיני אירועים לתפריט
function initMenuEvents(wrapper) {
  const menuOpenBtn = wrapper.querySelector("#menu-open-btn");
  const menuCloseBtn = wrapper.querySelector("#menu-close-btn");
  const sidebar = wrapper.querySelector("#mySidebar");

  if (menuOpenBtn && sidebar) {
    menuOpenBtn.addEventListener("click", () => {
      sidebar.style.transform = "translateX(-250px)";
      sidebar.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    });
  }

  if (menuCloseBtn && sidebar) {
    menuCloseBtn.addEventListener("click", () => {
      sidebar.style.transform = "translateX(0)";
      sidebar.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "auto";
    });
  }
}

// פונקציה להתקנת מאזיני אירועים לנגישות
function initAccessibilityEvents(wrapper) {
  const accessibilityToggle = wrapper.querySelector("#accessibility-toggle");
  const accessibilityClose = wrapper.querySelector("#accessibility-close");
  const floatingAccessibility = wrapper.querySelector("#floating-accessibility");

  if (floatingAccessibility) {
    floatingAccessibility.classList.remove("show");
  }

  if (accessibilityToggle && floatingAccessibility) {
    accessibilityToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      floatingAccessibility.classList.add("show");
    });
  }

  if (accessibilityClose && floatingAccessibility) {
    accessibilityClose.addEventListener("click", (e) => {
      e.stopPropagation();
      floatingAccessibility.classList.remove("show");
    });
  }

  // סגירה בלחיצה מחוץ לתפריט
  document.addEventListener("click", (e) => {
    if (floatingAccessibility && floatingAccessibility.classList.contains("show")) {
      if (!floatingAccessibility.contains(e.target) && 
          !accessibilityToggle.contains(e.target)) {
        floatingAccessibility.classList.remove("show");
      }
    }
  });
}

// פונקציות נגישות (משפיעות על כל האתר)
let fontSize = 100;

function increaseFont() {
  fontSize += 5;
  document.body.style.fontSize = fontSize + "%";
}

function decreaseFont() {
  fontSize -= 5;
  if (fontSize < 50) fontSize = 50;
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
  document.body.classList.remove("highlight-links");
  document.body.style.fontSize = "";
}

// וידוא שהתפריטים סגורים בהתחלה
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    const sidebar = document.querySelector(".custom-sidebar #mySidebar");
    const floatingAccessibility = document.querySelector(".custom-sidebar #floating-accessibility");

    if (sidebar) {
      sidebar.style.transform = "translateX(0)";
      sidebar.setAttribute("aria-hidden", "true");
    }

    if (floatingAccessibility) {
      floatingAccessibility.classList.remove("show");
    }
  }, 200);
});
