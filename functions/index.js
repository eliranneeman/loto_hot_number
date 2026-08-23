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
  const payload = {
    method: "current",
    methodLabel: "6 מתוך 37 + מספר חזק 1-7",
    startedOn: "2011-05-14",
    source: CSV_URL,
    lastUpdated: new Date().toISOString(),
    totalDraws: current.length,
    lastDraw: latest,
    results: current,
    stats,
    meta: {
      lastChecked: new Date().toISOString(),
      lastDrawId: latest.id || null,
      lastDrawDate: latest.date,
      lastNumbers: latest.numbers,
      lastStrong: latest.strong,
      addedNewDraw: isNew,
      homepageMatched: homepageDraw ? sameDraw(latest, homepageDraw) : false,
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
