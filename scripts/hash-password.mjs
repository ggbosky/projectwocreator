// Usage: npm run hash-password -- "MojeSilneHeslo"
// Prints a SHA-256 hash for VITE_DEMO_PASSWORD_HASH so the demo password is never stored in plain text.
import { createHash } from "node:crypto";
const pw = process.argv[2];
if (!pw) {
  console.error('Použití: npm run hash-password -- "VaseHeslo"');
  process.exit(1);
}
console.log(createHash("sha256").update(pw, "utf8").digest("hex"));
