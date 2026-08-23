(function ensureGlobalStyles() {
  [
    "/common.css",
    "/css/app.css",
    "/css/pages.css",
    "/css/site-a11y.css",
    "/css/ads.css",
  ].forEach((href) => {
    if (!document.querySelector('link[href="' + href + '"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      document.head.appendChild(link);
    }
  });
})();

// ===== טוען כותרת עליונה =====
fetch("/header.html")
  .then(res => res.text())
  .then(html => {
    const mount = document.getElementById("site-header");
    if (mount) {
      mount.innerHTML = html;
      const current = window.location.pathname.replace(/\/$/, "") || "/";
      mount.querySelectorAll(".site-nav a").forEach((link) => {
        const href = link.getAttribute("href").replace(/\/$/, "") || "/";
        if (href === current || (current.endsWith("index.html") && href === "/")) {
          link.classList.add("active");
        }
      });
    }
  })
  .catch(err => console.error("שגיאה בטעינת הכותרת:", err));

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
          !(accessibilityToggle && accessibilityToggle.contains(e.target))) {
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
  let size = parseInt(localStorage.getItem("fontSize") || "100", 10);
  size += 5;
  document.documentElement.style.fontSize = size + "%";
  localStorage.setItem("fontSize", String(size));
}

function decreaseFont() {
  let size = parseInt(localStorage.getItem("fontSize") || "100", 10);
  size -= 5;
  if (size < 50) size = 50;
  document.documentElement.style.fontSize = size + "%";
  localStorage.setItem("fontSize", String(size));
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
    document.documentElement.style.fontSize = savedSize + "%";
  }
});

// ===== footer + פרסומות =====
function initPwaInstallButton() {
  const btn = document.getElementById("installBtn");
  if (!btn) return;
  btn.hidden = false;
  let deferredPrompt;
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
  });
  btn.addEventListener("click", async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") btn.hidden = true;
      deferredPrompt = null;
      return;
    }
    alert("להתקנת האפליקציה: חפש בתפריט הדפדפן 'Install' או 'Add to Home Screen'");
  });
  window.addEventListener("appinstalled", () => { btn.hidden = true; });
}

function bootAds() {
  function runAds() {
    if (!window.LottoAds) return;
    window.LottoAds.ready()
      .then(() => {
        window.LottoAds.renderAll();
        setTimeout(() => window.LottoAds.renderAll(), 400);
      })
      .catch((err) => console.warn("[LottoAds] boot failed", err));
  }

  if (window.LottoAds) {
    runAds();
    return;
  }
  if (document.querySelector('script[src="/js/ads.js"]')) return;
  const script = document.createElement("script");
  script.src = "/js/ads.js";
  script.onload = runAds;
  document.body.appendChild(script);
}

function loadSiteFooter() {
  const mount = document.getElementById("footer");
  if (!mount || mount.dataset.footerLoaded === "true") return;
  fetch("/footer.html")
    .then((res) => {
      if (!res.ok) throw new Error("footer " + res.status);
      return res.text();
    })
    .then((html) => {
      mount.innerHTML = html;
      mount.dataset.footerLoaded = "true";
      if (!document.querySelector('link[href="/css/ads.css"]')) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "/css/ads.css";
        document.head.appendChild(link);
      }
      initPwaInstallButton();
      bootAds();
    })
    .catch((err) => console.error("שגיאה בטעינת footer:", err));
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadSiteFooter);
} else {
  loadSiteFooter();
}


/*
// פונקציה נוספת לוודא שהחלון מוסתר גם לאחר טעינת התפריט
setTimeout(() => {
  const floatingAccessibility = document.getElementById("floating-accessibility");
  if (floatingAccessibility) {
    floatingAccessibility.classList.remove('show');
  }
}, 500);
*/
