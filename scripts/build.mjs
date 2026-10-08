import { cp, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const project = new URL("../", import.meta.url);
const output = new URL("../dist/", import.meta.url);
await mkdir(output, { recursive: true });
for (const entry of ["index.html", "styles.css", "element-geometry.css", "app.js", "assets"]) {
  await cp(new URL(entry, project), new URL(entry, output), { recursive: true });
}
console.log(`Static frontend built in ${fileURLToPath(output)}`);
