import { cp, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const dist = resolve(here, "../dist");
const target = resolve(here, "../../extension/app");

await rm(target, { recursive: true, force: true });
await cp(dist, target, { recursive: true });

console.log(`Copied ${dist} -> ${target}`);
console.log('Enable "Use the bundled build" in the Gitlas extension popup settings.');
