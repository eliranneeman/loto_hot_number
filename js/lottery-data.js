(function (global) {
  const FIREBASE_BASE = "https://loto-hot-default-rtdb.firebaseio.com/lotto";
  const FIREBASE_META_URL = FIREBASE_BASE + "/meta.json";
  const FIREBASE_STATS_URL = FIREBASE_BASE + "/stats.json";
  const FIREBASE_FULL_URL = FIREBASE_BASE + ".json";
  const FIREBASE_BY_ID_URL = FIREBASE_BASE + "/byId.json";
  const LOTTO_DELTA_URL =
    "https://europe-west1-loto-hot.cloudfunctions.net/lottoDelta";
  const LOCAL_RESULTS_URL = "/lottery_results.json";
  const SESSION_KEY = "lottogun:lotto-archive:v2";
  const IDB_NAME = "lottogun-lotto";
  const IDB_STORE = "archive";
  const IDB_KEY = "current";
  const FETCH_TIMEOUT_MS = 12000;

  /** @type {{ archive: object, legacyRows: object[], history: object[], headerRows: any[][], stats: object } | null} */
  let memory = null;
  /** @type {Promise<object> | null} */
  let inflight = null;

  async function fetchJson(url, useNetworkOnly, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs || FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        cache: useNetworkOnly ? "no-store" : "default",
      });
      if (!response.ok) {
        throw new Error("Failed to load " + url);
      }
      return response.json();
    } finally {
      clearTimeout(timer);
    }
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

  function getLastDrawId(archive) {
    if (!archive) return 0;
    if (archive.lastDraw && archive.lastDraw.id) return Number(archive.lastDraw.id) || 0;
    if (archive.results && archive.results[0] && archive.results[0].id) {
      return Number(archive.results[0].id) || 0;
    }
    return 0;
  }

  function openIdb() {
    return new Promise((resolve, reject) => {
      if (!global.indexedDB) {
        reject(new Error("IndexedDB unavailable"));
        return;
      }
      const request = indexedDB.open(IDB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("IndexedDB open failed"));
    });
  }

  async function readIdbArchive() {
    try {
      const db = await openIdb();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, "readonly");
        const store = tx.objectStore(IDB_STORE);
        const req = store.get(IDB_KEY);
        req.onsuccess = () => {
          const value = req.result;
          const archive = normalizePayload(value && value.archive);
          if (!archive) {
            resolve(null);
            return;
          }
          archive.sourceKind = value.sourceKind || "indexeddb";
          resolve(archive);
        };
        req.onerror = () => reject(req.error);
      });
    } catch (error) {
      console.warn("[LottoData] IndexedDB read failed", error);
      return null;
    }
  }

  async function writeIdbArchive(archive) {
    try {
      const db = await openIdb();
      const slim = {
        savedAt: Date.now(),
        sourceKind: archive.sourceKind,
        lastUpdated: archive.lastUpdated,
        totalDraws: archive.totalDraws || (archive.results && archive.results.length) || 0,
        lastDrawId: getLastDrawId(archive),
        archive: {
          method: archive.method,
          methodLabel: archive.methodLabel,
          startedOn: archive.startedOn,
          source: archive.source,
          lastUpdated: archive.lastUpdated,
          totalDraws: archive.totalDraws,
          lastDraw: archive.lastDraw,
          results: archive.results,
          stats: archive.stats,
          meta: archive.meta,
        },
      };
      await new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, "readwrite");
        tx.objectStore(IDB_STORE).put(slim, IDB_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (error) {
      console.warn("[LottoData] IndexedDB write failed", error);
    }
  }

  async function clearIdbArchive() {
    try {
      const db = await openIdb();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, "readwrite");
        tx.objectStore(IDB_STORE).delete(IDB_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (error) {
      console.warn("[LottoData] IndexedDB clear failed", error);
    }
  }

  function readSessionCache() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const archive = normalizePayload(parsed && parsed.archive);
      if (!archive) return null;
      archive.sourceKind = parsed.sourceKind || "session";
      return archive;
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
          lastDrawId: getLastDrawId(archive),
          archive,
        })
      );
    } catch (error) {
      /* quota — IndexedDB is the durable store */
    }
  }

  function clearSessionCache() {
    try {
      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem("lottogun:lotto-archive:v1");
    } catch (error) {
      /* ignore */
    }
  }

  async function fetchMeta() {
    try {
      return await fetchJson(FIREBASE_META_URL, true, 8000);
    } catch (error) {
      console.warn("[LottoData] meta fetch failed", error);
      return null;
    }
  }

  function byIdMapToDraws(map, sinceId) {
    if (!map || typeof map !== "object") return [];
    return Object.keys(map)
      .map((key) => map[key])
      .filter((draw) => draw && Number(draw.id) > sinceId)
      .sort((a, b) => Number(b.id) - Number(a.id));
  }

  async function fetchDrawsSince(sinceId) {
    // 1) Cloud Function delta (best — works even before byId exists)
    try {
      const delta = await fetchJson(
        LOTTO_DELTA_URL + "?since=" + encodeURIComponent(String(sinceId)),
        true,
        15000
      );
      if (delta && delta.success && Array.isArray(delta.draws)) {
        return {
          draws: delta.draws,
          stats: delta.stats || null,
          meta: delta.meta || null,
        };
      }
    } catch (error) {
      console.warn("[LottoData] lottoDelta unavailable", error);
    }

    // 2) Direct RTDB byId range query
    const url =
      FIREBASE_BY_ID_URL +
      '?orderBy="id"&startAt=' +
      encodeURIComponent(String(sinceId + 1));
    try {
      const map = await fetchJson(url, true);
      return { draws: byIdMapToDraws(map, sinceId), stats: null, meta: null };
    } catch (error) {
      console.warn("[LottoData] incremental byId query failed", error);
      return null;
    }
  }

  function mergeArchives(localArchive, newDraws, meta, stats) {
    const byId = new Map();
    (localArchive.results || []).forEach((draw) => {
      if (draw && draw.id != null) byId.set(Number(draw.id), draw);
    });
    (newDraws || []).forEach((draw) => {
      if (draw && draw.id != null) byId.set(Number(draw.id), draw);
    });

    const results = Array.from(byId.values()).sort((a, b) => Number(b.id) - Number(a.id));
    const lastDraw = results[0] || localArchive.lastDraw;

    return {
      method: localArchive.method || "current",
      methodLabel: localArchive.methodLabel,
      startedOn: localArchive.startedOn,
      source: localArchive.source,
      lastUpdated: (meta && meta.lastChecked) || new Date().toISOString(),
      totalDraws: results.length,
      lastDraw,
      results,
      stats: stats || computeStatsFromResults(results),
      meta: meta || localArchive.meta,
      sourceKind: newDraws && newDraws.length ? "firebase-delta" : "indexeddb",
    };
  }

  async function fetchFullRemoteArchive() {
    try {
      const remote = normalizePayload(await fetchJson(FIREBASE_FULL_URL, true));
      if (remote) {
        remote.sourceKind = "firebase-full";
        return remote;
      }
    } catch (error) {
      console.warn("[LottoData] Firebase full download failed", error);
    }

    const local = normalizePayload(await fetchJson(LOCAL_RESULTS_URL, false));
    if (!local) {
      throw new Error("Lottery archive is empty");
    }
    local.sourceKind = "local-json";
    return local;
  }

  async function syncArchive(options) {
    const forceFull = !!(options && options.force);

    let localArchive = null;
    if (!forceFull) {
      localArchive = readSessionCache() || (await readIdbArchive());
    }

    const meta = await fetchMeta();
    const remoteLastId = meta && meta.lastDrawId != null ? Number(meta.lastDrawId) : 0;
    const localLastId = getLastDrawId(localArchive);
    const remoteTotal =
      meta && meta.totalDraws != null ? Number(meta.totalDraws) : 0;

    if (!meta && localArchive && localArchive.results && localArchive.results.length) {
      localArchive.sourceKind = localArchive.sourceKind || "indexeddb-offline";
      console.info("[LottoData] meta unavailable — using local archive");
      return localArchive;
    }

    if (
      localArchive &&
      remoteLastId &&
      localLastId === remoteLastId &&
      localArchive.results &&
      localArchive.results.length &&
      (!remoteTotal || remoteTotal === localArchive.results.length)
    ) {
      localArchive.sourceKind = localArchive.sourceKind || "indexeddb";
      console.info(
        "[LottoData] local archive up to date:",
        localArchive.results.length,
        "draws, lastId",
        localLastId
      );
      return localArchive;
    }

    if (localArchive && localLastId && remoteLastId > localLastId) {
      const delta = await fetchDrawsSince(localLastId);
      if (delta && Array.isArray(delta.draws) && delta.draws.length) {
        let stats = delta.stats;
        if (!stats) {
          try {
            stats = await fetchJson(FIREBASE_STATS_URL, true, 8000);
          } catch (error) {
            console.warn("[LottoData] stats fetch failed, recomputing", error);
          }
        }
        const merged = mergeArchives(
          localArchive,
          delta.draws,
          delta.meta || meta,
          stats
        );
        console.info(
          "[LottoData] incremental sync:",
          "+",
          delta.draws.length,
          "draws →",
          merged.results.length,
          "total"
        );
        return merged;
      }
      // Delta returned empty array but meta says newer — still try merge path / full
      if (delta && Array.isArray(delta.draws) && delta.draws.length === 0) {
        localArchive.sourceKind = "indexeddb";
        console.info("[LottoData] delta empty — treating local as current");
        return localArchive;
      }
      console.warn("[LottoData] delta empty/failed, falling back to full download");
    }

    const full = await fetchFullRemoteArchive();
    if (meta) full.meta = Object.assign({}, full.meta || {}, meta);
    console.info(
      "[LottoData] full download:",
      full.results.length,
      "draws from",
      full.sourceKind
    );
    return full;
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
      clearSessionCache();
      await clearIdbArchive();
    }

    if (memory && !force) {
      return memory.archive;
    }

    if (!inflight) {
      inflight = (async () => {
        const archive = await syncArchive({ force });
        memory = buildViews(archive);
        writeSessionCache(archive);
        await writeIdbArchive(archive);
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
    isCached: () =>
      !!memory ||
      !!sessionStorage.getItem(SESSION_KEY),
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
