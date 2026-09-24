// src/config/users.json is gitignored (password hashes). On a fresh clone, seed it
// from the committed template so `next dev` / `next build` can import it.
import { copyFileSync, existsSync } from "node:fs";

const target = new URL("../src/config/users.json", import.meta.url);
const template = new URL("../src/config/users.example.json", import.meta.url);

if (!existsSync(target)) {
  copyFileSync(template, target);
  console.log("Created src/config/users.json from users.example.json");
}