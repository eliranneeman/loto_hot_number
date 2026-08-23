(function (global) {
  const FIREBASE_LOTTO_URL = "https://loto-hot-default-rtdb.firebaseio.com/lotto.json";
  const LOCAL_RESULTS_URL = "/lottery_results.json";
  const SESSION_KEY = "lottogun:lotto-archive:v1";

  /** @type {{ archive: object, legacyRows: object[], history: object[], headerRows: any[][], stats: object } | null} */
  let memory = null;
  /** @type {Promise<object> | null} */
  let inflight = null;

  async function fetchJson(url, useNetworkOnly) {
    const response = await fetch(url, useNetworkOnly ? { cache: "no-store" } : undefined);
    if (!response.ok) {
      throw new Error("Failed to load " + url);
    }
    return response.json();
  }

  function normalizePayload(payload) {
    if (!payload || !Array.isArray(payload.results) || !payload.results.length) {
      return null;
    }
    return payload;
  }

  function toLegacyRows(results) {
    return (results || []).map((draw) => ({
      תאריך: draw.dateDisplay || draw.date,
      date: draw.date,
      1: draw.numbers[0],
      2: draw.numbers[1],
      3: draw.numbers[2],
      4: draw.numbers[3],
      5: draw.numbers[4],
      6: draw.numbers[5],
      "המספר החזק": draw.strong,
      הגרלה: draw.id,
      drawId: draw.id,
    }));
  }

  function toHeaderRows(results) {
    const header = ["תאריך", 1, 2, 3, 4, 5, 6, "המספר החזק", "הגרלה"];
    const rows = (results || []).map((draw) => [
      draw.dateDisplay || draw.date,
      ...draw.numbers,
      draw.strong,
      draw.id,
    ]);
    return [header, ...rows];
  }

  function toHistory(results) {
    return (results || []).map((draw) => ({
      date: draw.dateDisplay || draw.date,
      numbers: draw.numbers.slice(),
      strong: draw.strong,
      id: draw.id,
    }));
  }

  function computeStatsFromResults(results) {
    const regular = {};
    const strong = {};
    for (let i = 1; i <= 37; i += 1) regular[String(i)] = 0;
    for (let i = 1; i <= 7; i += 1) strong[String(i)] = 0;

    (results || []).forEach((draw, index) => {
      const recencyBonus = index < 60 ? 2 : 1;
      (draw.numbers || []).forEach((num) => {
        if (num >= 1 && num <= 37) {
          regular[String(num)] += recencyBonus;
        }
      });
      if (draw.strong >= 1 && draw.strong <= 7) {
        strong[String(draw.strong)] += recencyBonus;
      }
    });

    return {
      regular_stats: regular,
      strong_stats: strong,
      total_draws: results.length,
      last_updated: new Date().toISOString(),
    };
  }

  function buildViews(archive) {
    const results = archive.results;
    return {
      archive,
      legacyRows: toLegacyRows(results),
      history: toHistory(results),
      headerRows: toHeaderRows(results),
      stats: archive.stats || computeStatsFromResults(results),
    };
  }

  function readSessionCache() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const archive = normalizePayload(parsed && parsed.archive);
      if (!archive) return null;
      archive.sourceKind = parsed.sourceKind || "session";
      return buildViews(archive);
    } catch (error) {
      console.warn("[LottoData] session cache unreadable", error);
      return null;
    }
  }

  function writeSessionCache(archive) {
    try {
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          savedAt: Date.now(),
          sourceKind: archive.sourceKind,
          lastUpdated: archive.lastUpdated,
          totalDraws: archive.totalDraws,
          lastDrawId: archive.lastDraw && archive.lastDraw.id,
          archive,
        })
      );
    } catch (error) {
      console.warn("[LottoData] session cache write failed", error);
    }
  }

  async function fetchRemoteArchive() {
    try {
      const remote = normalizePayload(await fetchJson(FIREBASE_LOTTO_URL, true));
      if (remote) {
        remote.sourceKind = "firebase";
        return remote;
      }
    } catch (error) {
      console.warn("[LottoData] Firebase unavailable, falling back to local JSON", error);
    }

    const local = normalizePayload(await fetchJson(LOCAL_RESULTS_URL, false));
    if (!local) {
      throw new Error("Lottery archive is empty");
    }
    local.sourceKind = "local";
    return local;
  }

  function ensureLoaded() {
    if (!memory) {
      throw new Error("LottoData is not loaded yet. Call await LottoData.load() first.");
    }
    return memory;
  }

  async function load(options) {
    const force = !!(options && options.force);

    if (force) {
      memory = null;
      inflight = null;
      try {
        sessionStorage.removeItem(SESSION_KEY);
      } catch (error) {
        console.warn("[LottoData] failed clearing session cache", error);
      }
    }

    if (memory) {
      return memory.archive;
    }

    if (!inflight) {
      inflight = (async () => {
        const cached = readSessionCache();
        if (cached) {
          memory = cached;
          console.info(
            "[LottoData] using session cache:",
            memory.archive.totalDraws,
            "draws"
          );
          return memory.archive;
        }

        const archive = await fetchRemoteArchive();
        memory = buildViews(archive);
        writeSessionCache(archive);
        console.info(
          "[LottoData] downloaded once this session:",
          archive.totalDraws,
          "draws from",
          archive.sourceKind
        );
        return archive;
      })().finally(() => {
        inflight = null;
      });
    }

    return inflight;
  }

  function preload() {
    load().catch((error) => {
      console.warn("[LottoData] preload failed", error);
    });
  }

  function formatDate(dateValue) {
    if (!dateValue) return "";
    if (typeof dateValue === "string") return dateValue;
    if (dateValue instanceof Date) {
      return dateValue.toLocaleDateString("he-IL");
    }
    if (typeof dateValue === "number") {
      const date = new Date((dateValue - 25569) * 86400 * 1000);
      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleDateString("he-IL");
      }
    }
    return String(dateValue);
  }

  global.LottoData = {
    load,
    ready: load,
    preload,
    invalidate: () => load({ force: true }),
    isCached: () => !!memory || !!sessionStorage.getItem(SESSION_KEY),
    getSource: () => ensureLoaded().archive.sourceKind || "unknown",
    getArchive: () => ensureLoaded().archive,
    getLegacyRows: () => ensureLoaded().legacyRows.slice(),
    getHistory: () => ensureLoaded().history.slice(),
    getHeaderRows: () => ensureLoaded().headerRows.slice(),
    getStats: () => Object.assign({}, ensureLoaded().stats),
    toLegacyRows,
    toHeaderRows,
    toHistory,
    formatDate,
  };

  preload();
})(window);
