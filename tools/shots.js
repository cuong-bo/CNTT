// Captures review screenshots of the main screens at common breakpoints, in both themes.
// Run: npm run shots   (starts its own server on port 4180; output goes to ./screenshots)
const { chromium } = require("@playwright/test");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const PORT = 4180;
const BASE = `http://127.0.0.1:${PORT}`;
const OUT = path.join(__dirname, "..", "screenshots");
const SIZES = [
  { name: "320", width: 320, height: 700 },
  { name: "375", width: 375, height: 800 },
  { name: "600", width: 600, height: 900 },
  { name: "768", width: 768, height: 1024 },
  { name: "1024", width: 1024, height: 768 },
  { name: "1440", width: 1440, height: 900 },
];

async function checkOverflow(page, label) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  if (overflow) process.stdout.write("HORIZONTAL OVERFLOW at " + label + "\n");
}

async function seed(page) {
  // Answer a few Module 1 questions so progress and wrong states are visible.
  await page.goto(`${BASE}/#/practice/1`);
  await page.waitForSelector("[data-testid=option-0]");
  for (const pick of [2, 0, 2, 1]) {
    await page.getByTestId(`option-${pick}`).click();
    await page.getByTestId("next").click();
  }
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const server = spawn(process.execPath, [path.join(__dirname, "serve.js"), String(PORT)], { stdio: "ignore" });
  await new Promise((r) => setTimeout(r, 800));
  const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || "msedge" });
  try {
    for (const theme of ["light", "dark"]) {
      for (const size of SIZES) {
        const ctx = await browser.newContext({
          viewport: { width: size.width, height: size.height },
          colorScheme: theme,
          locale: "vi-VN",
        });
        const page = await ctx.newPage();
        await page.goto(BASE);
        await seed(page);
        const tag = `${theme}-${size.name}`;

        await page.goto(`${BASE}/#/practice/1`);
        await page.getByTestId("q-text").waitFor();
        await page.screenshot({ path: path.join(OUT, `quiz-${tag}.png`) });
        await checkOverflow(page, `quiz-${tag}`);

        // Question 2 was answered wrong in seed(): shows the correct answer being revealed.
        // Below 1024px the palette is collapsed behind a toggle.
        if (!(await page.getByTestId("pal-2").isVisible())) await page.locator(".pal-toggle").click();
        await page.getByTestId("pal-2").click();
        await page.getByTestId("feedback").getByText("Chưa đúng").waitFor();
        await page.screenshot({ path: path.join(OUT, `wrong-${tag}.png`), fullPage: true });
        await checkOverflow(page, `wrong-${tag}`);

        // Exam: answer one question, submit, and capture the result.
        await page.goto(`${BASE}/#/`);
        await page.getByTestId("start-exam").click();
        await page.getByTestId("option-1").click();
        await page.screenshot({ path: path.join(OUT, `exam-${tag}.png`) });
        await checkOverflow(page, `exam-${tag}`);
        await page.getByTestId("submit-exam").click();
        await page.getByTestId("dialog-confirm").click();
        await page.getByTestId("score").waitFor();
        await page.screenshot({ path: path.join(OUT, `result-${tag}.png`), fullPage: true });
        await checkOverflow(page, `result-${tag}`);

        await page.goto(`${BASE}/#/`);
        await page.getByTestId("module-grid").waitFor();
        await page.screenshot({ path: path.join(OUT, `home-${tag}.png`), fullPage: true });
        await checkOverflow(page, `home-${tag}`);

        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
        if (overflow) process.stdout.write(`HORIZONTAL OVERFLOW at ${tag}\n`);
        await ctx.close();
      }
    }
    process.stdout.write(`screenshots written to ${OUT}\n`);
  } finally {
    await browser.close();
    server.kill();
  }
}

main().catch((err) => {
  process.stderr.write(`${err.stack}\n`);
  process.exit(1);
});
