const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onRequest } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");
const { collectCurrentMethodDraws, computeStats, sameDraw, CSV_URL } = require("./pais");

initializeApp();

const REGION = "europe-west1";

async function syncLotteryResults() {
  const { current, homepageDraw } = await collectCurrentMethodDraws();
  if (!current.length) {
    throw new Error("No current-method draws returned from Pais");
  }

  const db = getDatabase();
  const previousSnap = await db.ref("lotto/meta").get();
  const previous = previousSnap.val() || {};
  const latest = current[0];
  const isNew = !previous.lastDrawId || !sameDraw(latest, {
    id: previous.lastDrawId,
    date: previous.lastDrawDate,
    numbers: previous.lastNumbers || [],
    strong: previous.lastStrong,
  });

  const stats = computeStats(current);
  const byId = {};
  current.forEach((draw) => {
    if (draw && draw.id != null) {
      byId[String(draw.id)] = draw;
    }
  });

  const payload = {
    method: "current",
    methodLabel: "6 מתוך 37 + מספר חזק 1-7",
    startedOn: "2011-05-14",
    source: CSV_URL,
    lastUpdated: new Date().toISOString(),
    totalDraws: current.length,
    lastDraw: latest,
    results: current,
    byId,
    stats,
    meta: {
      lastChecked: new Date().toISOString(),
      lastDrawId: latest.id || null,
      lastDrawDate: latest.date,
      lastNumbers: latest.numbers,
      lastStrong: latest.strong,
      totalDraws: current.length,
      addedNewDraw: isNew,
      homepageMatched: homepageDraw ? sameDraw(latest, homepageDraw) : false,
      archiveFormat: 2,
    },
  };

  await db.ref("lotto").set(payload);

  return {
    success: true,
    addedNewDraw: isNew,
    totalDraws: current.length,
    lastDraw: latest,
    homepageDraw,
  };
}

exports.checkLotteryResults = onSchedule(
  {
    schedule: "0 0 * * *",
    timeZone: "Asia/Jerusalem",
    region: REGION,
    runtime: "nodejs22",
    timeoutSeconds: 120,
    memory: "256MiB",
  },
  async () => {
    const result = await syncLotteryResults();
    console.log("Lottery sync finished", result);
    return result;
  }
);

exports.checkLotteryNow = onRequest(
  {
    region: REGION,
    runtime: "nodejs22",
    timeoutSeconds: 120,
    cors: true,
  },
  async (req, res) => {
    try {
      const result = await syncLotteryResults();
      res.status(200).json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/** Incremental draws since a given draw id — tiny response when up to date */
exports.lottoDelta = onRequest(
  {
    region: REGION,
    runtime: "nodejs22",
    timeoutSeconds: 60,
    cors: true,
  },
  async (req, res) => {
    try {
      const sinceId = Number(req.query.since || 0) || 0;
      const db = getDatabase();
      const [metaSnap, resultsSnap, statsSnap] = await Promise.all([
        db.ref("lotto/meta").get(),
        db.ref("lotto/results").get(),
        db.ref("lotto/stats").get(),
      ]);
      const meta = metaSnap.val() || {};
      const results = resultsSnap.val() || [];
      const draws = results.filter((draw) => draw && Number(draw.id) > sinceId);
      res.status(200).json({
        success: true,
        sinceId,
        meta,
        stats: statsSnap.val() || null,
        totalDraws: results.length,
        added: draws.length,
        draws,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);
