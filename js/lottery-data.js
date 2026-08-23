(function (global) {
  const FIREBASE_LOTTO_URL = "https://loto-hot-default-rtdb.firebaseio.com/lotto.json";
  const LOCAL_RESULTS_URL = "/lottery_results.json";

  async function fetchJson(url) {
    const response = await fetch(url, { cache: "no-store" });
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

  async function load() {
    try {
      const remote = normalizePayload(await fetchJson(FIREBASE_LOTTO_URL));
      if (remote) {
        remote.sourceKind = "firebase";
        return remote;
      }
    } catch (error) {
      console.warn("Firebase lottery archive unavailable, using local file", error);
    }

    const local = normalizePayload(await fetchJson(LOCAL_RESULTS_URL));
    if (!local) {
      throw new Error("Lottery archive is empty");
    }
    local.sourceKind = "local";
    return local;
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

  global.LottoData = {
    load,
    toLegacyRows,
    toHeaderRows,
    toHistory,
  };
})(window);
