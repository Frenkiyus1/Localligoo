import { copyFile, mkdir } from "node:fs/promises";
// Retain the supplied recording and introductory photo without changing their content.
const source = new URL("../LISTENING/", import.meta.url);
const target = new URL("../assets/listening/", import.meta.url);
await mkdir(target, { recursive: true });
for (const [file, output] of [["1013.mp4", "visit.mp4"], ["Ảnh 1.png", "stilt-house.png"]]) {
 await copyFile(new URL(file, source), new URL(output, target));
}
console.log("Prepared Listening audio and introductory photo.");
