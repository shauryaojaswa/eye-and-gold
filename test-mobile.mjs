import { chromium, devices } from "playwright";
import fs from "node:fs";

const outDir = "eye-and-gold/shots";
fs.mkdirSync(outDir, { recursive: true });

const BASE = process.env.BASE_URL || "http://localhost:4174/";
const browser = await chromium.launch({ args: ["--use-gl=angle", "--enable-webgl", "--ignore-gpu-blocklist"] });
const context = await browser.newContext({ ...devices["iPhone 13"], locale: "en-GB" });
const page = await context.newPage();

const errors = [];
const failed = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));
page.on("requestfailed", (r) => failed.push(`${r.url()} :: ${r.failure()?.errorText}`));
page.on("response", (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });

await page.goto(BASE, { waitUntil: "networkidle" });

const boot = await page.evaluate(() => {
  const c = document.querySelector("#eyeCanvas");
  const gl = c && (c.getContext("webgl") || c.getContext("experimental-webgl"));
  return {
    act: document.body.dataset.act,
    webgl: !!gl,
    canvasSize: c ? [c.width, c.height] : null,
    overflow: document.documentElement.scrollWidth - window.innerWidth,
    giftHiddenByCss: getComputedStyle(document.querySelector("#gift")).display,
    noJsFallback: getComputedStyle(document.querySelector(".nojs-fallback")).display,
    arrival: document.querySelector("#arrivalDate")?.textContent
  };
});
console.log("boot", boot);

// let the eye open and the copy land
await page.waitForTimeout(3400);
await page.screenshot({ path: `${outDir}/01-eye.png` });

const eyeState = await page.evaluate(() => ({
  act: document.body.dataset.act,
  l1a: document.querySelector("#l1a")?.classList.contains("is-in"),
  l1b: document.querySelector("#l1b")?.classList.contains("is-in"),
  hint: document.querySelector("#eyeHint")?.classList.contains("is-in"),
  overflow: document.documentElement.scrollWidth - window.innerWidth
}));
console.log("eye", eyeState);

// tap the eye → blink + tear
await page.mouse.move(195, 430);
await page.mouse.click(195, 430);
await page.waitForTimeout(700);
await page.screenshot({ path: `${outDir}/02-blink.png` });

// wait for the continue button
await page.waitForSelector("#next1.is-in", { timeout: 9000 });
await page.screenshot({ path: `${outDir}/03-ready.png` });
await page.locator("#next1").click();

// ── act 2 · dive ──────────────────────────────────────────
await page.waitForSelector("#act2.is-on", { timeout: 5000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${outDir}/04-dive.png` });
await page.waitForSelector("#next2.is-in", { timeout: 12000 });
await page.waitForTimeout(400);
await page.screenshot({ path: `${outDir}/05-tunnel.png` });
const tunnel = await page.evaluate(() => ({
  act: document.body.dataset.act,
  l2a: document.querySelector("#l2a")?.classList.contains("is-in"),
  l2b: document.querySelector("#l2b")?.classList.contains("is-in"),
  l2c: document.querySelector("#l2c")?.classList.contains("is-in")
}));
console.log("tunnel", tunnel);
await page.locator("#next2").click();

// ── act 3 · heart ─────────────────────────────────────────
await page.waitForSelector("#act3.is-on", { timeout: 5000 });
await page.waitForTimeout(1350);
await page.screenshot({ path: `${outDir}/06-heart-falling.png` });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${outDir}/07-heart-shattered.png` });

const broken = await page.evaluate(() => {
  const svg = document.querySelector(".heart-svg");
  return {
    exists: !!svg,
    shards: document.querySelectorAll(".heart-svg .shard").length,
    seams: document.querySelectorAll(".heart-svg .seam").length,
    broken: svg?.classList.contains("is-broken"),
    layerOpacity: getComputedStyle(document.querySelector("#heartLayer")).opacity
  };
});
console.log("heart", broken);

await page.waitForSelector("#next3.is-in", { timeout: 25000 });
await page.waitForTimeout(400);
await page.screenshot({ path: `${outDir}/08-heart-gold.png` });

const gold = await page.evaluate(() => {
  const svg = document.querySelector(".heart-svg");
  const seam = document.querySelector(".heart-svg .seam");
  return {
    gold: svg?.classList.contains("is-gold"),
    seamDash: seam ? getComputedStyle(seam).strokeDashoffset : null,
    seamsOpacity: getComputedStyle(document.querySelector(".heart-svg .seams")).opacity,
    l3a: document.querySelector("#l3a")?.classList.contains("is-in"),
    l3b: document.querySelector("#l3b")?.classList.contains("is-in")
  };
});
console.log("gold", gold);

await page.locator("#next3").click();

// ── act 4 · gift ──────────────────────────────────────────
await page.waitForSelector("#gift.is-in", { timeout: 6000 });
await page.waitForTimeout(1600);
await page.screenshot({ path: `${outDir}/09-gift.png`, fullPage: true });

const end = await page.evaluate(() => ({
  act: document.body.dataset.act,
  arrival: document.querySelector("#arrivalDate")?.innerText,
  title: document.querySelector(".gift-title")?.innerText,
  cinematic: getComputedStyle(document.querySelector("#cinematic")).display,
  giftDisplay: getComputedStyle(document.querySelector("#gift")).display,
  overflow: document.documentElement.scrollWidth - window.innerWidth,
  docHeight: document.documentElement.scrollHeight,
  viewH: window.innerHeight
}));
console.log("gift", end);

console.log("console errors", errors);
console.log("failed requests", failed);

await browser.close();
