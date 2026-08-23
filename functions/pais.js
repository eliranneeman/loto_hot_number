const CSV_URL = "https://www.pais.co.il/Lotto/lotto_resultsDownload.aspx";
const LOTTO_PAGE_URL = "https://www.pais.co.il/lotto/";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const CURRENT_METHOD_START = "2011-05-14";

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "he-IL,he;q=0.9,en;q=0.8",
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  for (const encoding of ["utf8", "latin1"]) {
    const text = buffer.toString(encoding);
    if (text.includes("הגרלה") || text.includes("lotto") || /,/.test(text)) {
      return text;
    }
  }
  return buffer.toString("utf8");
}

function decodeHebrewCsv(buffer) {
  // Official Pais CSV is Windows-1255 / cp1255.
  try {
    return new TextDecoder("windows-1255").decode(buffer);
  } catch (error) {
    return buffer.toString("latin1");
  }
}

async function downloadOfficialCsv() {
  const response = await fetch(CSV_URL, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/csv,text/plain,*/*",
    },
  });
  if (!response.ok) {
    throw new Error(`CSV download failed: ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  return decodeHebrewCsv(buffer);
}

function parseCsv(csvText) {
  const draws = [];
  const lines = csvText.split(/\r?\n/).slice(1);
  for (const line of lines) {
    const parts = line.split(",").map((part) => part.trim());
    if (parts.length < 9) continue;
    const drawId = Number(parts[0]);
    const dateMatch = parts[1].match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!Number.isInteger(drawId) || !dateMatch) continue;
    const [, day, month, year] = dateMatch;
    const iso = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    const numbers = parts.slice(2, 8).map((value) => Number(value));
    const strong = Number(parts[8]);
    if (numbers.some((value) => !Number.isInteger(value)) || !Number.isInteger(strong)) {
      continue;
    }
    draws.push({
      id: drawId,
      date: iso,
      dateDisplay: `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`,
      numbers,
      strong,
    });
  }
  draws.sort((a, b) => (a.date === b.date ? b.id - a.id : a.date < b.date ? 1 : -1));
  return draws;
}

function isCurrentMethod(draw) {
  return (
    draw.date >= CURRENT_METHOD_START &&
    draw.numbers.length === 6 &&
    new Set(draw.numbers).size === 6 &&
    draw.numbers.every((number) => number >= 1 && number <= 37) &&
    draw.strong >= 1 &&
    draw.strong <= 7
  );
}

function extractLatestFromHomepage(html) {
  const pastBlockMatch = html.match(/<div class="lotto_past">([\s\S]*?)<div class="past_info_title extra"/i);
  const block = pastBlockMatch ? pastBlockMatch[1] : html;

  const idMatch = block.match(/תוצאות הגרלה מס[\s\S]*?<div class="result_num">\s*(\d{3,5})\s*<\/div>/i);
  const dateMatch = block.match(/מתאריך[\s\S]*?<div class="result_num">\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s*<\/div>/i);
  const strongMatch = block.match(/<div class="lotto_num strong">\s*<div>\s*(\d{1,2})\s*<\/div>/i);

  const numbers = [];
  const numberRegex = /<div class="lotto_num">\s*<div>\s*(\d{1,2})\s*<\/div>/gi;
  let match;
  while ((match = numberRegex.exec(block)) && numbers.length < 6) {
    const value = Number(match[1]);
    if (value >= 1 && value <= 37 && !numbers.includes(value)) {
      numbers.push(value);
    }
  }

  const strong = strongMatch ? Number(strongMatch[1]) : null;
  if (numbers.length !== 6 || !(strong >= 1 && strong <= 7)) {
    return null;
  }

  const draw = {
    id: idMatch ? Number(idMatch[1]) : null,
    numbers,
    strong,
  };
  if (dateMatch) {
    const [, day, month, year] = dateMatch;
    draw.date = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    draw.dateDisplay = `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
  }
  return draw;
}

function computeStats(draws) {
  const regular = {};
  const strong = {};
  for (let i = 1; i <= 37; i += 1) regular[String(i)] = 0;
  for (let i = 1; i <= 7; i += 1) strong[String(i)] = 0;
  for (const draw of draws) {
    for (const number of draw.numbers) {
      regular[String(number)] += 1;
    }
    strong[String(draw.strong)] += 1;
  }
  return {
    regular_stats: regular,
    strong_stats: strong,
    last_updated: new Date().toISOString(),
    total_draws: draws.length,
  };
}

function sameDraw(a, b) {
  if (!a || !b) return false;
  if (a.id && b.id && a.id === b.id) return true;
  return (
    a.date === b.date &&
    a.strong === b.strong &&
    JSON.stringify([...a.numbers].sort((x, y) => x - y)) ===
      JSON.stringify([...b.numbers].sort((x, y) => x - y))
  );
}

async function collectCurrentMethodDraws() {
  const csvText = await downloadOfficialCsv();
  const current = parseCsv(csvText).filter(isCurrentMethod);
  let homepageDraw = null;
  try {
    const html = await fetchText(LOTTO_PAGE_URL);
    homepageDraw = extractLatestFromHomepage(html);
  } catch (error) {
    console.warn("Homepage check failed:", error.message);
  }

  if (homepageDraw && isCurrentMethod({ ...homepageDraw, date: homepageDraw.date || "9999-12-31" })) {
    const alreadyThere = current.some((draw) => sameDraw(draw, homepageDraw));
    if (!alreadyThere && homepageDraw.date) {
      current.unshift(homepageDraw);
      current.sort((a, b) => (a.date === b.date ? b.id - a.id : a.date < b.date ? 1 : -1));
    }
  }

  return { current, homepageDraw };
}

module.exports = {
  CSV_URL,
  LOTTO_PAGE_URL,
  CURRENT_METHOD_START,
  collectCurrentMethodDraws,
  computeStats,
  sameDraw,
};
