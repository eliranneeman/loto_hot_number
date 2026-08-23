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

    const ua = navigator.userAgent.toLowerCase();
    let message = "להתקנת האפליקציה:\n- חפש בתפריט הדפדפן 'Install' או 'Add to Home Screen'";
    if (ua.includes("safari") && !ua.includes("chrome")) {
      message = "Safari:\n1. לחץ על ⬆️ Share\n2. Add to Home Screen";
    } else if (ua.includes("chrome") || ua.includes("edge") || ua.includes("brave")) {
      message = "Chrome/Edge:\n1. לחץ על ⋮ Menu\n2. Install App";
    } else if (ua.includes("firefox")) {
      message = "Firefox:\n1. לחץ על ☰ Menu\n2. Install";
    }
    alert(message);
  });

  window.addEventListener("appinstalled", () => {
    btn.hidden = true;
  });
}

function ensureAdsAssets() {
  if (!document.querySelector('link[href="/css/ads.css"]')) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/css/ads.css";
    document.head.appendChild(link);
  }
}

function bootAds() {
  if (window.LottoAds) {
    window.LottoAds.ready().catch(() => {});
    return;
  }

  if (document.querySelector('script[src="/js/ads.js"]')) return;

  const script = document.createElement("script");
  script.src = "/js/ads.js";
  script.onload = () => window.LottoAds && window.LottoAds.ready().catch(() => {});
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
      ensureAdsAssets();
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
