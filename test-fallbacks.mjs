import { chromium, devices } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:4174/";
const browser = await chromium.launch({ args: ["--use-gl=angle"] });

// ── 1 · prefers-reduced-motion ─────────────────────────────
{
  const ctx = await browser.newContext({
    ...devices["iPhone 13"],
    reducedMotion: "reduce",
    locale: "en-GB"
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);

  const rm = await page.evaluate(() => {
    const vis = (s) => {
      const el = document.querySelector(s);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const st = getComputedStyle(el);
      return { shown: st.display !== "none" && st.visibility !== "hidden" && +st.opacity > 0.05, h: Math.round(r.height) };
    };
    return {
      act: document.body.dataset.act,
      reducedClass: document.body.classList.contains("reduced"),
      overflowY: getComputedStyle(document.body).overflow,
      linesIn: [...document.querySelectorAll(".line")].every((l) => l.classList.contains("is-in")),
      heartStatic: document.querySelectorAll(".heart-static .shard").length,
      heartGold: document.querySelector(".heart-static .heart-svg")?.classList.contains("is-gold"),
      gift: vis("#gift"),
      giftDisplay: getComputedStyle(document.querySelector("#gift")).display,
      arrival: document.querySelector("#arrivalDate")?.textContent,
      scrollH: document.documentElement.scrollHeight,
      viewH: window.innerHeight,
      overflowX: document.documentElement.scrollWidth - window.innerWidth,
      // everything must be reachable by plain scrolling, no buttons needed
      nextButtons: [...document.querySelectorAll(".next")].map((b) => getComputedStyle(b).display)
    };
  });
  console.log("reduced-motion", rm);
  console.log("reduced errors", errors);
  await page.screenshot({ path: "eye-and-gold/shots/rm-full.png", fullPage: true });

  const rmOk =
    rm.reducedClass && rm.linesIn && rm.heartStatic > 0 && rm.heartGold &&
    rm.gift.shown && rm.arrival && rm.scrollH > rm.viewH * 1.5 &&
    rm.overflowX === 0 && rm.nextButtons.every((d) => d === "none") &&
    errors.length === 0;
  console.log(rmOk ? "REDUCED OK" : "REDUCED FAIL");
  await ctx.close();
}

// ── 2 · JavaScript disabled ────────────────────────────────
{
  const ctx = await browser.newContext({ ...devices["iPhone 13"], javaScriptEnabled: false, locale: "en-GB" });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "load" });
  await page.waitForTimeout(600);

  const nj = await page.evaluate ? null : null; // evaluate needs JS
  const njInfo = await page.locator(".nojs-fallback").textContent().catch(() => null);
  const giftVisible = await page.locator("#gift").isVisible().catch(() => false);
  const giftText = await page.locator(".gift-title").textContent().catch(() => null);
  const arrival = await page.locator("#arrivalDate").textContent().catch(() => null);
  const htmlClass = await page.locator("html").getAttribute("class").catch(() => null);
  const scrollable = await page.evaluate ? true : true;

  console.log("no-JS", {
    htmlClass,
    fallback: njInfo ? njInfo.replace(/\s+/g, " ").slice(0, 90) : null,
    giftVisible,
    giftText: giftText?.replace(/\s+/g, " "),
    arrival
  });
  await page.screenshot({ path: "eye-and-gold/shots/nojs-full.png", fullPage: true });

  const njOk = htmlClass === "no-js" && !!njInfo && giftVisible && !!arrival;
  console.log(njOk ? "NOJS OK" : "NOJS FAIL");
  await ctx.close();
}

await browser.close();
