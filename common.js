// ===== טוען תפריט צדדי =====
fetch("/menu.html")
  .then(res => res.text())
  .then(html => {
    document.body.insertAdjacentHTML("beforeend", html);
    
    // הוספת מאזיני אירועים לאחר הטעינה
    setTimeout(() => {
      initMenuEvents();
      initAccessibilityEvents();
    }, 100);
  })
  .catch(err => {
    console.error("שגיאה בטעינת התפריט:", err);
  });

// פונקציה להתקנת מאזיני אירועים לתפריט
function initMenuEvents() {
  const menuOpenBtn = document.getElementById("menu-open-btn");
  const menuCloseBtn = document.getElementById("menu-close-btn");
  const sidebar = document.getElementById("mySidebar");
  
  if (menuOpenBtn && sidebar) {
    menuOpenBtn.addEventListener('click', () => {
      sidebar.style.transform = "translateX(-250px)";
      sidebar.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    });
  }
  
  if (menuCloseBtn && sidebar) {
    menuCloseBtn.addEventListener('click', () => {
      sidebar.style.transform = "translateX(0)";
      sidebar.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "auto";
    });
  }
}

// פונקציה להתקנת מאזיני אירועים לנגישות
function initAccessibilityEvents() {
  const accessibilityToggle = document.getElementById("accessibility-toggle");
  const accessibilityClose = document.getElementById("accessibility-close");
  const floatingAccessibility = document.getElementById("floating-accessibility");
  
  // וידוא שהחלון מוסתר בהתחלה
  if (floatingAccessibility) {
    floatingAccessibility.classList.remove('show');
  }
  
  if (accessibilityToggle && floatingAccessibility) {
    accessibilityToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      console.log('פתיחת תפריט נגישות'); // לדיבוג
      floatingAccessibility.classList.add('show');
    });
  }
  
  if (accessibilityClose && floatingAccessibility) {
    accessibilityClose.addEventListener('click', (e) => {
      e.stopPropagation();
      console.log('סגירת תפריט נגישות'); // לדיבוג
      floatingAccessibility.classList.remove('show');
    });
  }
  
  // סגירה בלחיצה מחוץ לתפריט
  document.addEventListener('click', (e) => {
    if (floatingAccessibility && floatingAccessibility.classList.contains('show')) {
      if (!floatingAccessibility.contains(e.target) && 
          !accessibilityToggle.contains(e.target)) {
        floatingAccessibility.classList.remove('show');
      }
    }
  });
}

// גיבוי עם event delegation למקרה שהתפריט נטען מאוחר יותר
document.addEventListener('click', (e) => {
    const sidebar = document.getElementById("mySidebar");
    const floatingAccessibility = document.getElementById("floating-accessibility");
    
    // טיפול בתפריט ראשי
    if (e.target.closest('#menu-open-btn')) {
        if (sidebar) {
            sidebar.style.transform = "translateX(-250px)";
            sidebar.setAttribute("aria-hidden", "false");
            document.body.style.overflow = "hidden";
        }
    }
    
    if (e.target.closest('#menu-close-btn')) {
        if (sidebar) {
            sidebar.style.transform = "translateX(0)";
            sidebar.setAttribute("aria-hidden", "true");
            document.body.style.overflow = "auto";
        }
    }
    
    // טיפול בתפריט נגישות
    if (e.target.closest('#accessibility-toggle')) {
        e.stopPropagation();
        const floatingAccessibility = document.getElementById("floating-accessibility");
        if (floatingAccessibility) {
            console.log('פתיחת תפריט נגישות מ-event delegation'); // לדיבוג
            floatingAccessibility.classList.add('show');
        }
    }
    
    if (e.target.closest('#accessibility-close')) {
        e.stopPropagation();
        const floatingAccessibility = document.getElementById("floating-accessibility");
        if (floatingAccessibility) {
            console.log('סגירת תפריט נגישות מ-event delegation'); // לדיבוג
            floatingAccessibility.classList.remove('show');
        }
    }
});

// גודל טקסט
function increaseFont() {
  let size = parseInt(localStorage.getItem("fontSize") || "100");
  size += 5;
  document.body.style.fontSize = size + "%";
  localStorage.setItem("fontSize", size);
}

function decreaseFont() {
  let size = parseInt(localStorage.getItem("fontSize") || "100");
  size -= 5;
  if (size < 50) size = 50;
  document.body.style.fontSize = size + "%";
  localStorage.setItem("fontSize", size);
}

// ניגודיות גבוהה
function toggleContrast() {
  document.body.classList.toggle("high-contrast");
  localStorage.setItem("highContrast", document.body.classList.contains("high-contrast") ? "true" : "false");
}

// הדגשת קישורים
function toggleLinks() {
  document.body.classList.toggle("highlight-links");
  localStorage.setItem("highlightLinks", document.body.classList.contains("highlight-links") ? "true" : "false");
}

// איפוס כל ההגדרות
function resetAccessibility() {
  document.body.classList.remove("high-contrast");
  document.body.classList.remove("highlight-links");
  document.body.style.fontSize = "";
  localStorage.removeItem("highContrast");
  localStorage.removeItem("highlightLinks");
  localStorage.removeItem("fontSize");
}



// וידוא שהתפריטים סגורים בהתחלה
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const sidebar = document.getElementById("mySidebar");
    const floatingAccessibility = document.getElementById("floating-accessibility");
    
    if (sidebar) {
      sidebar.style.transform = "translateX(0)";
      sidebar.setAttribute("aria-hidden", "true");
    }
    
    if (floatingAccessibility) {
      floatingAccessibility.classList.remove('show');
      console.log('תפריט נגישות הוסתר בהתחלה'); // לדיבוג
    }
  }, 200);
});

// כל הקוד של הנגישות + קריאה ל-localStorage
document.addEventListener("DOMContentLoaded", () => {
  if (localStorage.getItem("highContrast") === "true") {
    document.body.classList.add("high-contrast");
  }
  if (localStorage.getItem("highlightLinks") === "true") {
    document.body.classList.add("highlight-links");
  }
  const savedSize = localStorage.getItem("fontSize");
  if (savedSize) {
    document.body.style.fontSize = savedSize + "%";
  }
});


/*
// פונקציה נוספת לוודא שהחלון מוסתר גם לאחר טעינת התפריט
setTimeout(() => {
  const floatingAccessibility = document.getElementById("floating-accessibility");
  if (floatingAccessibility) {
    floatingAccessibility.classList.remove('show');
  }
}, 500);
*/
