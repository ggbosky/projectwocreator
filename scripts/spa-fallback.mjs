// Copies dist/index.html to dist/404.html so client-side routes work on GitHub Pages / static hosts.
import { copyFileSync, existsSync } from "node:fs";
if (existsSync("dist/index.html")) {
  copyFileSync("dist/index.html", "dist/404.html");
  console.log("✓ dist/404.html created (SPA fallback)");
}
