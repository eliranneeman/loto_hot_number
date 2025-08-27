// טוען פוטר משותף לכל האתר
fetch("/footer.html")
  .then(res => res.text())
  .then(html => {
    document.body.insertAdjacentHTML("beforeend", html);
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
