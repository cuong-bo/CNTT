const { defineConfig } = require("@playwright/test");

const PORT = 4173;

module.exports = defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    // Uses the Edge already installed on Windows; no browser download needed.
    channel: process.env.PW_CHANNEL || "msedge",
    locale: "vi-VN",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: `node tools/serve.js ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: true,
  },
});
