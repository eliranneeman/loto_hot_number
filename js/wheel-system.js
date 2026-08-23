(function (global) {
  function combinations(values, size) {
    const list = values.slice().sort((a, b) => a - b);
    const result = [];

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

  function binomial(n, k) {
    if (k < 0 || k > n) return 0;
    if (k === 0 || k === n) return 1;
    let result = 1;
    const kk = Math.min(k, n - k);
    for (let i = 1; i <= kk; i += 1) {
      result = (result * (n - kk + i)) / i;
    }
    return Math.round(result);
  }

  /** Target ticket counts for reduced systems by pool size */
  const REDUCED_TARGETS = {
    7: { economy: 7, balanced: 7, wide: 7 },
    8: { economy: 8, balanced: 12, wide: 18 },
    9: { economy: 12, balanced: 30, wide: 48 },
    10: { economy: 20, balanced: 50, wide: 80 },
    11: { economy: 30, balanced: 66, wide: 100 },
    12: { economy: 40, balanced: 84, wide: 120 },
  };

  function pairKey(a, b) {
    return a < b ? a + "," + b : b + "," + a;
  }

  function ticketPairKeys(ticket) {
    const keys = [];
    for (let i = 0; i < ticket.length; i += 1) {
      for (let j = i + 1; j < ticket.length; j += 1) {
        keys.push(pairKey(ticket[i], ticket[j]));
      }
    }
    return keys;
  }

  function countFrequency(tickets) {
    const freq = {};
    tickets.forEach((ticket) => {
      ticket.forEach((n) => {
        freq[n] = (freq[n] || 0) + 1;
      });
    });
    return freq;
  }

  /**
   * Greedy reduced wheel: maximize new pair coverage each step,
   * then fill remaining slots for balance.
   */
  function buildReducedTickets(pool, targetCount) {
    const all = combinations(pool, 6);
    if (all.length <= targetCount) {
      return all.map((t) => t.slice());
    }

    const uncovered = new Set();
    combinations(pool, 2).forEach((pair) => uncovered.add(pairKey(pair[0], pair[1])));

    const selected = [];
    const used = new Set();
    const freq = {};
    pool.forEach((n) => {
      freq[n] = 0;
    });

    while (selected.length < targetCount) {
      let bestIdx = -1;
      let bestScore = -Infinity;

      for (let i = 0; i < all.length; i += 1) {
        if (used.has(i)) continue;
        const ticket = all[i];
        let newPairs = 0;
        ticketPairKeys(ticket).forEach((key) => {
          if (uncovered.has(key)) newPairs += 1;
        });

        let balancePenalty = 0;
        ticket.forEach((n) => {
          balancePenalty += freq[n];
        });

        // Prefer covering new pairs, then more balanced number usage
        const score = newPairs * 1000 - balancePenalty;
        if (score > bestScore) {
          bestScore = score;
          bestIdx = i;
        }
      }

      if (bestIdx < 0) break;

      const ticket = all[bestIdx].slice();
      used.add(bestIdx);
      selected.push(ticket);
      ticket.forEach((n) => {
        freq[n] += 1;
      });
      ticketPairKeys(ticket).forEach((key) => uncovered.delete(key));

      if (uncovered.size === 0 && selected.length >= Math.min(targetCount, Math.ceil(all.length * 0.3))) {
        // Pairs covered — continue only to reach target with balance
        if (selected.length >= targetCount) break;
      }
    }

    return selected;
  }

  /**
   * For every way "hit" of your pool numbers could be the winning regulars,
   * find the worst-case best ticket match. That is the mathematical guarantee.
   */
  function computeGuarantees(pool, tickets) {
    const maxHit = Math.min(6, pool.length);
    const guarantees = [];

    for (let hit = 3; hit <= maxHit; hit += 1) {
      const scenarios = combinations(pool, hit);
      let worstBest = 6;

      for (let s = 0; s < scenarios.length; s += 1) {
        const drawnSet = new Set(scenarios[s]);
        let best = 0;
        for (let t = 0; t < tickets.length; t += 1) {
          let match = 0;
          const ticket = tickets[t];
          for (let i = 0; i < ticket.length; i += 1) {
            if (drawnSet.has(ticket[i])) match += 1;
          }
          if (match > best) best = match;
        }
        if (best < worstBest) worstBest = best;
      }

      guarantees.push({
        ifHit: hit,
        guaranteed: worstBest,
        scenarios: scenarios.length,
      });
    }

    return guarantees;
  }

  function buildSystem(options) {
    const pool = (options.numbers || [])
      .map(Number)
      .filter((n) => Number.isInteger(n) && n >= 1 && n <= 37);
    const unique = [...new Set(pool)].sort((a, b) => a - b);
    const mode = options.mode === "full" ? "full" : "reduced";
    const density = options.density || "balanced";
    const strong = Number(options.strong);

    if (unique.length < 7 || unique.length > 12) {
      throw new Error("בחרו בין 7 ל-12 מספרים רגילים");
    }
    if (!Number.isInteger(strong) || strong < 1 || strong > 7) {
      throw new Error("בחרו מספר חזק בין 1 ל-7");
    }

    const fullCount = binomial(unique.length, 6);
    let tickets;

    if (mode === "full") {
      if (fullCount > 210) {
        throw new Error("מערכת מלאה ל-" + unique.length + " מספרים היא " + fullCount + " טפסים — בחרו שיטה מצומצמת או פחות מספרים");
      }
      tickets = combinations(unique, 6);
    } else {
      const targets = REDUCED_TARGETS[unique.length] || REDUCED_TARGETS[12];
      const target = targets[density] || targets.balanced;
      tickets = buildReducedTickets(unique, target);
    }

    const guarantees = computeGuarantees(unique, tickets);
    const freq = countFrequency(tickets);

    return {
      numbers: unique,
      strong,
      mode,
      density: mode === "reduced" ? density : null,
      tickets,
      ticketCount: tickets.length,
      fullCount,
      savedTickets: Math.max(0, fullCount - tickets.length),
      savePercent: fullCount ? Math.round((1 - tickets.length / fullCount) * 100) : 0,
      guarantees,
      frequency: freq,
    };
  }

  function formatGuaranteeLines(guarantees) {
    return (guarantees || []).map((g) => {
      return (
        "אם " +
        g.ifHit +
        " מהמספרים שבחרתם עולים בהגרלה — מובטח לפחות טופס אחד עם " +
        g.guaranteed +
        " מספרים נכונים"
      );
    });
  }

  global.WheelSystem = {
    combinations,
    binomial,
    buildSystem,
    computeGuarantees,
    formatGuaranteeLines,
    REDUCED_TARGETS,
  };
})(window);
