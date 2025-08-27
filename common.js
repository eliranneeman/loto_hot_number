// טוען תפריט צד משותף לכל האתר
fetch("/menu.html")
  .then(res => res.text())
  .then(html => {
    document.body.insertAdjacentHTML("beforeend", html);

    // עכשיו שהתפריט נטען, מוסיפים את הפקודות לפתיחה וסגירה
    const openBtn = document.getElementById("menu-open-btn");
    const sidebar = document.getElementById("mySidebar");
    const closeBtn = document.getElementById("menu-close-btn");

    openBtn.addEventListener("click", () => {
      sidebar.style.width = "250px"; // או רוחב מותאם
    });

    closeBtn.addEventListener("click", () => {
      sidebar.style.width = "0";
    });
  });

// טוען באנר קוקיז משותף
fetch("/cookie-banner.html")
  .then(res => res.text())
  .then(html => {
    document.body.insertAdjacentHTML("beforeend", html);
    // אחרי ההוספה — נריץ את הסקריפט של הבאנר
    const script = document.createElement("script");
    script.src = "/cookie-banner.js";
    document.body.appendChild(script);
  });
