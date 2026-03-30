# 2048bot

A Playwright-powered bot that automatically plays the [2048 game](http://keyscome.io/2048/) using a greedy heuristic strategy. It reads the live board state from the browser and picks the best move each tick by maximizing empty tiles, the maximum tile value, and the immediate merge score.

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or later

## Installation

```bash
mkdir 2048bot && cd 2048bot
npm init -y
npm i playwright
npx playwright install chromium
```

## Usage

```bash
node bot2048.mjs
```

A Chromium browser window will open, navigate to the game, and the bot will start playing automatically.

## How it works

1. **Board reading** – every tick, the bot queries all `.tile` DOM elements and reconstructs the 4 × 4 board.
2. **Move simulation** – it simulates all four moves (`up`, `right`, `down`, `left`) using `slideAndMerge`, which filters zeros, merges equal adjacent tiles, and pads the result back to length 4.
3. **Heuristic scoring** – each resulting board is scored with:
   - `empty tiles × 300` – strongly prefer boards with more free space.
   - `log₂(max tile) × 120` – reward keeping a high-value tile.
   - `merge gain × 1.2` – reward moves that produce large merges.
4. **Best move** – the move with the highest score is sent as an arrow-key press via Playwright's keyboard API.
5. **Loop** – steps 1–4 repeat every ~120 ms, which gives animations time to finish before the next read.

