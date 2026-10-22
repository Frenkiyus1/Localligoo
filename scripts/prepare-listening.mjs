import { copyFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const source = new URL("../LISTENING/", import.meta.url);
const target = new URL("../assets/listening/", import.meta.url);
await mkdir(target, { recursive: true });
// Preserve the original recording and photo; prepare lighter copies of the supplied artwork.
for (const [file, output] of [["1013.mp4", "visit.mp4"], ["Ảnh 1.png", "stilt-house.png"]]) {
 await copyFile(new URL(file, source), new URL(output, target));
}
const pictures = [
 ["cầu thang.png", "wooden-stairs.webp"],
 ["đệm ngồi.png", "brocade-cushion.webp"],
 ["bàn gỗ.png", "wooden-table.webp"],
 ["ghế tre.png", "bamboo-bench.webp"],
];
for (const [file, output] of pictures) {
 await sharp(fileURLToPath(new URL(file, source))).resize({ width: 800, withoutEnlargement: true }).webp({ quality: 88 }).toFile(fileURLToPath(new URL(output, target)));
}
// The page already has a live header, so trim the header baked into the supplied cover.
await sharp(fileURLToPath(new URL("1.png", source))).extract({ left: 0, top: 178, width: 2405, height: 1627 }).resize({ width: 1920 }).webp({ quality: 90 }).toFile(fileURLToPath(new URL("cover.webp", target)));
console.log("Prepared Listening audio, cover and four matching pictures.");
