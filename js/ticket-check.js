(function (global) {
  function combinations(values, size) {
    const result = [];
    const list = values.slice().sort((a, b) => a - b);

    function walk(start, path) {
      if (path.length === size) {
        result.push(path.slice());
        return;
      }
      for (let i = start; i < list.length; i += 1) {
        path.push(list[i]);
        walk(i + 1, path);
        path.pop();
      }
    }

    walk(0, []);
    return result;
  }

  function drawHasSubset(drawNumbers, subset) {
    const set = new Set(drawNumbers);
    return subset.every((n) => set.has(n));
  }

  function analyzeTicket(ticketNumbers, strongNumber, history) {
    const numbers = ticketNumbers
      .map(Number)
      .filter((n) => Number.isInteger(n) && n >= 1 && n <= 37);
    const unique = [...new Set(numbers)].sort((a, b) => a - b);
    const strong = Number(strongNumber);

    if (unique.length !== 6) {
      throw new Error("יש לבחור בדיוק 6 מספרים שונים בין 1 ל-37");
    }
    if (!Number.isInteger(strong) || strong < 1 || strong > 7) {
      throw new Error("המספר החזק חייב להיות בין 1 ל-7");
    }

    const draws = history || [];
    const levels = [
      { key: "pairs", size: 2, label: "זוגות", singular: "זוג" },
      { key: "triples", size: 3, label: "שלשות", singular: "שלשה" },
      { key: "quads", size: 4, label: "רביעיות", singular: "רביעייה" },
      { key: "quints", size: 5, label: "חמישיות", singular: "חמישייה" },
    ];

    const subsetResults = {};
    levels.forEach((level) => {
      const subsets = combinations(unique, level.size).map((subset) => {
        const matches = [];
        draws.forEach((draw) => {
          if (drawHasSubset(draw.numbers || [], subset)) {
            matches.push({
              id: draw.id,
              date: draw.date,
              numbers: draw.numbers,
              strong: draw.strong,
            });
          }
        });
        return {
          numbers: subset,
          count: matches.length,
          examples: matches.slice(0, 5),
        };
      });

      subsets.sort((a, b) => b.count - a.count || a.numbers.join(",").localeCompare(b.numbers.join(",")));

      const totalHits = subsets.reduce((sum, item) => sum + item.count, 0);
      const withHits = subsets.filter((item) => item.count > 0).length;

      subsetResults[level.key] = {
        label: level.label,
        singular: level.singular,
        size: level.size,
        subsets,
        totalHits,
        withHits,
        totalSubsets: subsets.length,
        maxCount: subsets.length ? subsets[0].count : 0,
      };
    });

    const exactMatches = [];
    const strongHits = [];
    let latestOverlap = null;

    draws.forEach((draw, index) => {
      const drawNums = (draw.numbers || []).slice().sort((a, b) => a - b);
      const overlap = unique.filter((n) => drawNums.includes(n));
      const strongMatch = Number(draw.strong) === strong;

      if (overlap.length === 6) {
        exactMatches.push({
          id: draw.id,
          date: draw.date,
          strong: draw.strong,
          strongMatch,
        });
      }

      if (strongMatch) {
        strongHits.push({
          id: draw.id,
          date: draw.date,
          overlap: overlap.length,
          numbers: draw.numbers,
        });
      }

      if (index === 0) {
        latestOverlap = {
          id: draw.id,
          date: draw.date,
          numbers: draw.numbers,
          strong: draw.strong,
          overlap,
          overlapCount: overlap.length,
          strongMatch,
        };
      }
    });

    return {
      numbers: unique,
      strong,
      totalDraws: draws.length,
      exactMatches,
      strongHitsCount: strongHits.length,
      strongHits: strongHits.slice(0, 8),
      latestOverlap,
      subsetResults,
      levels,
    };
  }

  global.TicketCheck = {
    combinations,
    analyzeTicket,
  };
})(window);
