// Converts dist-artifact/index.html (full document) into page content for the Artifact host,
// which supplies its own <!doctype>/<html>/<head>/<body> skeleton.
import { readFileSync, writeFileSync } from "node:fs";
const html = readFileSync("dist-artifact/index.html", "utf8");
const head = html.match(/<head>([\s\S]*?)<\/head>/i)[1];
const body = html.match(/<body>([\s\S]*?)<\/body>/i)[1];
const keep = head
  .replace(/<meta charset[^>]*>/i, "")
  .replace(/<meta name="viewport"[^>]*>/i, "")
  .replace(/<link rel="icon"[^>]*>/i, "")
  .replace(/<title>[\s\S]*?<\/title>/i, "");
const out = `<title>Creator Studio</title>\n<script>document.documentElement.classList.add("dark");</script>\n${keep}\n<style>html,body{min-height:100%}</style>\n${body}`;
writeFileSync("dist-artifact/creator-studio.html", out);
console.log("✓ dist-artifact/creator-studio.html", (out.length / 1024).toFixed(0), "KB");
