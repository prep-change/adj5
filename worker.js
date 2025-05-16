// worker.js
const baseDenominations = [10000, 5000, 1000, 500, 100, 50, 10, 5, 1];
const targetCounts = [0, 15, 42, 50, 100, 50, 100, 16, 20]; // 155600円

onmessage = async (e) => {
  const { inventory, maxTry } = e.data;
  const bestResult = await findOptimalAdjustment(inventory, targetCounts, maxTry);
  postMessage(bestResult);
};

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function getTotalAmount(counts) {
  return counts.reduce((sum, count, i) => sum + count * baseDenominations[i], 0);
}

function getShortageAndSubstitute(current, target) {
  const shortage = [];
  const substitute = [];

  for (let i = 0; i < target.length; i++) {
    const diff = target[i] - current[i];
    shortage[i] = Math.max(diff, 0);
  }

  let remain = shortage.reduce((sum, c, i) => sum + c * baseDenominations[i], 0);

  const substitutePlan = Array(baseDenominations.length).fill(0);
  for (let i = 0; i < baseDenominations.length && remain > 0; i++) {
    const value = baseDenominations[i];
    while (inventory[i] > current[i] + substitutePlan[i] && remain >= value) {
      substitutePlan[i]++;
      remain -= value;
    }
  }

  return {
    shortage,
    substitute: substitutePlan,
    totalShortageValue: shortage.reduce((sum, c, i) => sum + c * baseDenominations[i], 0),
    totalSubstituteCount: substitutePlan.reduce((a, b) => a + b, 0),
  };
}

function* generateAdjustmentPatterns(maxTry) {
  for (let tryCount = 0; tryCount < maxTry; tryCount++) {
    const pattern = [0, 0, 0, 0, 0, 0, 0, 0, 0];

    // 調整パターンの生成ルール（例: 5000円は 0 か 1 増やす）
    pattern[1] = tryCount % 2; // 5000円（固定で0か1）

    // その他の金種はランダムに調整（自然数で増やす or そのまま）
    for (let i = 2; i < pattern.length; i++) {
      pattern[i] = Math.floor(Math.random() * 3); // 0〜2枚増やす
    }

    yield pattern;
  }
}

async function findOptimalAdjustment(input, baseTargets, maxTry = 10) {
  let best = null;
  let bestScore = Infinity;

  for (const adjustment of generateAdjustmentPatterns(maxTry)) {
    const current = baseTargets.map((v, i) => v + adjustment[i]);
    const result = getShortageAndSubstitute(current, baseTargets);
    const score = result.totalShortageValue * 1000 + result.totalSubstituteCount; // 優先度: 金額＞枚数

    if (score < bestScore) {
      best = {
        adjusted: current,
        shortage: result.shortage,
        substitute: result.substitute,
      };
      bestScore = score;

      // 即時打ち切り条件（理想的な状態）
      if (result.totalShortageValue === 0 && result.totalSubstituteCount === 0) {
        break;
      }
    }
  }

  return best;
}
