import { chromium } from "playwright";

const URL = "http://keyscome.io/2048/";

function slideAndMerge(line) {
  const nz = line.filter(x => x !== 0);
  let gain = 0;
  const out = [];
  for (let i = 0; i < nz.length; i++) {
    if (i + 1 < nz.length && nz[i] === nz[i + 1]) {
      const v = nz[i] * 2;
      out.push(v);
      gain += v;
      i++;
    } else out.push(nz[i]);
  }
  while (out.length < 4) out.push(0);
  return { out, gain };
}
const rotR = b => b[0].map((_, i) => b.map(r => r[i]).reverse());
const rotL = b => b[0].map((_, i) => b.map(r => r[r.length - 1 - i]));
const flip = b => rotR(rotR(b));
const eq = (a, c) => a.flat().every((v, i) => v === c.flat()[i]);

function moveSim(board, dir) {
  let b = board;
  if (dir === "up") b = rotL(b);
  else if (dir === "right") b = flip(b);
  else if (dir === "down") b = rotR(b);

  let gain = 0;
  const out = b.map(r => {
    const s = slideAndMerge(r);
    gain += s.gain;
    return s.out;
  });

  let f = out;
  if (dir === "up") f = rotR(f);
  else if (dir === "right") f = flip(f);
  else if (dir === "down") f = rotL(f);

  return { board: f, moved: !eq(board, f), gain };
}

const log2 = x => (x ? Math.log2(x) : 0);
const empty = b => b.flat().filter(x => x === 0).length;
const maxv = b => Math.max(...b.flat());
function evalBoard(b, gain) {
  return empty(b) * 300 + log2(maxv(b) || 1) * 120 + gain * 1.2;
}
function chooseMove(b) {
  const dirs = ["up", "right", "down", "left"];
  let best = null, bv = -1e9;
  for (const d of dirs) {
    const m = moveSim(b, d);
    if (!m.moved) continue;
    const v = evalBoard(m.board, m.gain);
    if (v > bv) bv = v, best = d;
  }
  return best;
}

const KEY = { up: "ArrowUp", right: "ArrowRight", down: "ArrowDown", left: "ArrowLeft" };

async function main() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  await page.goto(URL, { waitUntil: "domcontentloaded" });

  // 点一下棋盘拿焦点
  await page.click(".game-container");

  // 确保能读到 tile
  await page.waitForTimeout(200);

  while (true) {
    const board = await page.evaluate(() => {
      const b = Array.from({ length: 4 }, () => Array(4).fill(0));
      document.querySelectorAll(".tile").forEach(t => {
        const cls = t.className;
        const v = cls.match(/tile-(\d+)\b/);
        const p = cls.match(/tile-position-(\d)-(\d)\b/);
        if (!v || !p) return;
        const val = +v[1], x = +p[1] - 1, y = +p[2] - 1;
        b[y][x] = Math.max(b[y][x], val);
      });
      return b;
    });

    const dir = chooseMove(board);
    if (dir) {
      await page.keyboard.press(KEY[dir]);
    }
    await page.waitForTimeout(120); // 给动画/合并留时间
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
