// Prepare the supplied WRITING canvases (run manually after source changes).
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const source = new URL("../WRITING/", import.meta.url);
const target = new URL("../assets/writing/", import.meta.url);
await mkdir(target, { recursive: true });
async function crop(file, name, bounds, width) {
  let image = sharp(fileURLToPath(new URL(file, source))).extract(bounds);
  if (width) image = image.resize({ width, withoutEnlargement: true });
  await image.webp({ quality: 90 }).toFile(fileURLToPath(new URL(name, target)));
}
await crop("1/1 O ELM.png", "guest.webp", { left: 0, top: 178, width: 2405, height: 1627 }, 1920);
await crop("3/TRANG 3 O ELM.png", "sent.webp", { left: 0, top: 178, width: 2405, height: 1627 }, 1920);
await crop("2/2 o elm.png", "homestay.webp", { left: 0, top: 178, width: 2405, height: 1530 }, 1920);
await crop("1/1 O ELM.png", "badge.webp", { left: 65, top: 240, width: 880, height: 200 }, 660);
await crop("2/2 o elm.png", "paper.webp", { left: 650, top: 2700, width: 500, height: 500 });
await crop("1/1 O ELM.png", "background.webp", { left: 0, top: 500, width: 50, height: 500 });
console.log("Writing artwork prepared in assets/writing/");
