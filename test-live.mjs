import { chromium, devices } from "playwright";
import fs from "node:fs";

fs.mkdirSync("eye-and-gold/shots", { recursive: true });
const URL = process.env.LIVE_URL || "https://shauryaojaswa.github.io/eye-and-gold/";

const browser = await chromium.launch({ args: ["--use-gl=angle"] });
const page = await browser.newPage({ ...devices["iPhone 13"] });
const errors = [];
const failed = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));
page.on("requestfailed", (r) => failed.push(`${r.url()} :: ${r.failure()?.errorText}`));
page.on("response", (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });

await page.goto(URL, { waitUntil: "networkidle" });

const boot = await page.evaluate(() => {
  const c = document.querySelector("#eyeCanvas");
  const gl = c && (c.getContext("webgl") || c.getContext("experimental-webgl"));
  const fb = document.querySelector(".nojs-fallback");
  return {
    url: location.href,
    title: document.title,
    hasCinematic: !!document.querySelector("#cinematic"),
    act: document.body.dataset.act ?? null,
    webgl: !!gl,
    overflow: document.documentElement.scrollWidth - window.innerWidth,
    arrival: document.querySelector("#arrivalDate")?.textContent ?? null,
    noJsFallback: fb ? getComputedStyle(fb).display : null,
    bodyStart: document.body.innerText.slice(0, 120)
  };
});
console.log("boot", boot);

await page.waitForSelector("#next1.is-in", { timeout: 9000 });
await page.locator("#next1").click();
await page.waitForSelector("#next2.is-in", { timeout: 12000 });
await page.locator("#next2").click();

const heart = await page.waitForSelector(".heart-svg", { timeout: 5000 });
console.log("heart", await page.evaluate(() => ({
  shards: document.querySelectorAll(".heart-svg .shard").length,
  seams: document.querySelectorAll(".heart-svg .seam").length
})));

await page.waitForSelector("#next3.is-in", { timeout: 25000 });
console.log("gold", await page.evaluate(() => ({
  gold: document.querySelector(".heart-svg")?.classList.contains("is-gold")
})));

await page.locator("#next3").click();
await page.waitForSelector("#gift.is-in", { timeout: 6000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: "eye-and-gold/shots/live-gift.png", fullPage: true });

const end = await page.evaluate(() => ({
  act: document.body.dataset.act,
  arrival: document.querySelector("#arrivalDate")?.innerText,
  title: document.querySelector(".gift-title")?.innerText,
  overflow: document.documentElement.scrollWidth - window.innerWidth
}));
console.log("gift", end);
console.log("console errors", errors);
console.log("failed requests", failed);

const bad = errors.length || failed.length || end.act !== "4" || boot.overflow > 0 || end.overflow > 0;
console.log(bad ? "LIVE FAIL" : "LIVE OK");
await browser.close();
process.exit(bad ? 1 : 0);
