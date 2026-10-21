import { copyFile, mkdir } from "node:fs/promises";
import { pronunciationWords } from "../pronunciation-content.js";
const source = new URL("../PRONUNCIATION/", import.meta.url);
const target = new URL("../assets/pronunciation/", import.meta.url);
await mkdir(target, { recursive: true });
for (const { word } of pronunciationWords) await copyFile(new URL(word + ".mp3", source), new URL(word + ".mp3", target));
console.log("Prepared " + pronunciationWords.length + " Pronunciation recordings.");
