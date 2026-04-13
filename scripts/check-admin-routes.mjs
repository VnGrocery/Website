import fs from "node:fs";

const app = fs.readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const layout = fs.readFileSync(new URL("../src/components/Layout.jsx", import.meta.url), "utf8");

const requiredRoutes = ["buyer-checks", "freshness-reports", "moderation-logs", "tools", "events"];
for (const route of requiredRoutes) {
  if (!app.includes(`path=\"${route}\"`)) {
    throw new Error(`Missing route: ${route}`);
  }
}

const requiredNav = ["/buyer-checks", "/freshness-reports", "/moderation-logs"];
for (const nav of requiredNav) {
  if (!layout.includes(`to: \"${nav}\"`)) {
    throw new Error(`Missing nav: ${nav}`);
  }
}

console.log("admin route checks passed");
