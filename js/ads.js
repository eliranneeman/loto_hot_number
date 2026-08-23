(function (global) {
  const FIREBASE_ADS_URL = "https://loto-hot-default-rtdb.firebaseio.com/ads.json";
  const SESSION_KEY = "lottogun:ads:v1";
  const IMPRESSION_KEY = "lottogun:ad-impressions:v1";

  let memory = null;
  let inflight = null;

  const DEFAULT_SETTINGS = {
    advertiseBanner: {
      enabled: true,
      title: "יש לכם עסק? פרסמו אצלנו",
      subtitle: "הגיעו לאלפי חובבי לוטו בכל שבוע — פרסום ממוקד, תמחור גמיש",
      ctaText: "לפרטים על פרסום",
      ctaLink: "/advertise.html",
    },
  };

  function readSessionCache() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function writeSessionCache(payload) {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload));
    } catch {
      /* quota exceeded — memory cache still works */
    }
  }

  function normalizePayload(raw) {
    if (!raw || typeof raw !== "object") {
      return { campaigns: {}, creatives: {}, settings: DEFAULT_SETTINGS, stats: {} };
    }
    return {
      campaigns: raw.campaigns || {},
      creatives: raw.creatives || {},
      settings: { ...DEFAULT_SETTINGS, ...(raw.settings || {}) },
      stats: raw.stats || {},
    };
  }

  async function fetchAds() {
    const response = await fetch(FIREBASE_ADS_URL, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Failed to load ads");
    }
    return normalizePayload(await response.json());
  }

  function load() {
    if (memory) {
      return Promise.resolve(memory);
    }

    const cached = readSessionCache();
    if (cached) {
      memory = cached;
      return Promise.resolve(memory);
    }

    if (inflight) {
      return inflight;
    }

    inflight = fetchAds()
      .then((payload) => {
        memory = payload;
        writeSessionCache(payload);
        return payload;
      })
      .finally(() => {
        inflight = null;
      });

    return inflight;
  }

  function isCampaignActive(campaign, now) {
    if (!campaign || campaign.active === false) {
      return false;
    }
    if (campaign.startAt && now < Date.parse(campaign.startAt)) {
      return false;
    }
    if (campaign.endAt && now > Date.parse(campaign.endAt)) {
      return false;
    }
    return true;
  }

  function pickWeighted(items) {
    const total = items.reduce((sum, item) => sum + (item.weight || 1), 0);
    if (!total) {
      return items[0] || null;
    }
    let roll = Math.random() * total;
    for (const item of items) {
      roll -= item.weight || 1;
      if (roll <= 0) {
        return item;
      }
    }
    return items[items.length - 1] || null;
  }

  function getActiveCreatives(placement) {
    if (!memory) {
      return [];
    }

    const now = Date.now();
    const activeCampaignIds = new Set(
      Object.values(memory.campaigns)
        .filter((campaign) => isCampaignActive(campaign, now))
        .map((campaign) => campaign.id)
    );

    return Object.values(memory.creatives).filter((creative) => {
      if (!creative || creative.active === false) {
        return false;
      }
      if (creative.placement !== placement) {
        return false;
      }
      return activeCampaignIds.has(creative.campaignId);
    });
  }

  function pickCreative(placement) {
    const pool = getActiveCreatives(placement);
    if (!pool.length) {
      return null;
    }
    return pickWeighted(pool.map((creative) => ({ ...creative, weight: creative.weight || 1 })));
  }

  function wasImpressionTracked(adId) {
    try {
      const raw = sessionStorage.getItem(IMPRESSION_KEY);
      const seen = raw ? JSON.parse(raw) : {};
      return Boolean(seen[adId]);
    } catch {
      return false;
    }
  }

  function markImpressionTracked(adId) {
    try {
      const raw = sessionStorage.getItem(IMPRESSION_KEY);
      const seen = raw ? JSON.parse(raw) : {};
      seen[adId] = Date.now();
      sessionStorage.setItem(IMPRESSION_KEY, JSON.stringify(seen));
    } catch {
      /* ignore */
    }
  }

  function trackImpression(adId) {
    if (!adId || wasImpressionTracked(adId)) {
      return;
    }
    markImpressionTracked(adId);
    fetch(
      "https://loto-hot-default-rtdb.firebaseio.com/ads/stats/impressions/" +
        encodeURIComponent(adId) +
        ".json",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ".sv": "increment" }),
      }
    ).catch(() => {});
  }

  function trackClick(adId) {
    if (!adId) {
      return;
    }
    fetch(
      "https://loto-hot-default-rtdb.firebaseio.com/ads/stats/clicks/" +
        encodeURIComponent(adId) +
        ".json",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ".sv": "increment" }),
      }
    ).catch(() => {});
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderCreative(creative) {
    const title = escapeHtml(creative.title);
    const description = escapeHtml(creative.description);
    const imageUrl = escapeHtml(creative.imageUrl);
    const linkUrl = escapeHtml(creative.linkUrl || "#");
    const sponsored = creative.sponsoredLabel || "מודעה";

    return (
      '<a class="lottogun-ad-card" href="' +
      linkUrl +
      '" target="_blank" rel="noopener sponsored" data-ad-id="' +
      escapeHtml(creative.id) +
      '">' +
      '<span class="lottogun-ad-badge">' +
      escapeHtml(sponsored) +
      "</span>" +
      (imageUrl
        ? '<img class="lottogun-ad-image" src="' +
          imageUrl +
          '" alt="' +
          title +
          '" loading="lazy">'
        : "") +
      '<div class="lottogun-ad-copy">' +
      '<strong class="lottogun-ad-title">' +
      title +
      "</strong>" +
      (description ? '<p class="lottogun-ad-desc">' + description + "</p>" : "") +
      '<span class="lottogun-ad-cta">למידע נוסף ←</span>' +
      "</div>" +
      "</a>"
    );
  }

  function renderAdvertiseBanner(settings) {
    const banner = settings.advertiseBanner || DEFAULT_SETTINGS.advertiseBanner;
    if (banner.enabled === false) {
      return "";
    }

    return (
      '<aside class="lottogun-advertise-banner" aria-label="פרסום באתר">' +
      '<div class="lottogun-advertise-copy">' +
      "<strong>" +
      escapeHtml(banner.title) +
      "</strong>" +
      "<p>" +
      escapeHtml(banner.subtitle) +
      "</p>" +
      "</div>" +
      '<a class="lottogun-advertise-cta" href="' +
      escapeHtml(banner.ctaLink || "/advertise.html") +
      '">' +
      escapeHtml(banner.ctaText || "פרסמו אצלנו") +
      "</a>" +
      "</aside>"
    );
  }

  function mountPlacement(placement, containerId) {
    const mount = document.getElementById(containerId);
    if (!mount) {
      return;
    }

    const creative = pickCreative(placement);
    if (!creative) {
      mount.innerHTML = "";
      mount.hidden = true;
      return;
    }

    mount.hidden = false;
    mount.innerHTML = renderCreative(creative);
    trackImpression(creative.id);

    const link = mount.querySelector("[data-ad-id]");
    if (link) {
      link.addEventListener("click", () => trackClick(creative.id));
    }
  }

  function renderAll() {
    if (!memory) {
      return;
    }

    const bannerMount = document.getElementById("lottogun-advertise-banner");
    if (bannerMount) {
      bannerMount.innerHTML = renderAdvertiseBanner(memory.settings);
    }

    mountPlacement("footer", "lottogun-ad-footer");
    mountPlacement("inline", "lottogun-ad-inline");
  }

  function invalidate() {
    memory = null;
    inflight = null;
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
  }

  function ready() {
    return load().then(() => {
      renderAll();
      return memory;
    });
  }

  global.LottoAds = {
    load,
    ready,
    invalidate,
    pickCreative,
    getActiveCreatives,
    renderAll,
    trackClick,
    trackImpression,
  };
})(window);
