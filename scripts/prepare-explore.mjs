// Prepare the provided EXPLORE assets and four static topic pages.
// Run manually after updating the source artwork or the mobile transcription.
import sharp from "sharp";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { exploreTopics } from "./explore-content.mjs";
const root = new URL("../", import.meta.url);
const source = new URL("../EXPLORE/", import.meta.url);
const target = new URL("../assets/explore/stories/", import.meta.url);
await mkdir(target, { recursive: true });
const escape = text => text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const shared = await readFile(new URL("writing.html", root), "utf8");
const header = shared.match(/<header class="writing-header">[\s\S]*?<\/header>/)[0].replaceAll("writing-", "story-").replace('href="./explore.html"', 'href="./explore.html" aria-current="page"');
const footer = shared.match(/<footer class="site-footer">[\s\S]*?<\/footer>/)[0];
const mobileNav = shared.match(/<nav class="mobile-nav"[\s\S]*?<\/nav>/)[0].replace('href="./explore.html"', 'href="./explore.html" aria-current="page"');
const dialog = shared.match(/<dialog class="journey-dialog"[\s\S]*?<\/dialog>/)[0];
async function prepare(file, name) {
  const image = sharp(fileURLToPath(new URL(file, source))).trim();
  const { data, info } = await image.webp({ lossless: true }).toBuffer({ resolveWithObject: true });
  await writeFile(new URL(name, target), data);
  return { src: `./assets/explore/stories/${name}`, width: info.width, height: info.height };
}
const background = sharp(fileURLToPath(new URL("NATURE&WILDLIFE/FULL O ELM.png", source)));
await background.extract({ left: 0, top: 500, width: 180, height: 500 }).webp({ quality: 90 }).toFile(fileURLToPath(new URL("paper.webp", target)));
const paperCard = await sharp(fileURLToPath(new URL("NATURE&WILDLIFE/1.png", source))).trim().toBuffer();
await sharp(paperCard).extract({ left: 100, top: 920, width: 300, height: 40 }).webp({ quality: 90 }).toFile(fileURLToPath(new URL("card-paper.webp", target)));
for (const topic of exploreTopics) {
  const titleArt = await prepare(`${topic.folder}/${topic.titleFile}`, `${topic.id}-title.webp`);
  const articles = [];
  for (const [index, story] of topic.stories.entries()) {
    const artwork = await prepare(`${topic.folder}/${story.file}`, `${topic.id}-${index + 1}.webp`);
    articles.push(`<article class="topic-story" aria-labelledby="story-${index + 1}">
      <img class="story-art" src="${artwork.src}" width="${artwork.width}" height="${artwork.height}" alt="" ${index ? 'loading="lazy"' : 'fetchpriority="high"'}>
      <div class="story-copy"><h2 id="story-${index + 1}">${escape(story.title)}</h2><div class="story-paragraphs">${story.paragraphs.map(paragraph => `<p>${escape(paragraph)}</p>`).join("\n")}</div></div>
    </article>`);
  }
  const html = `<!doctype html>
<html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#b4c04c">
<title>${escape(topic.title)} · Explore — LOCALINGO</title>
<link rel="icon" href="./assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="./styles.css"><link rel="stylesheet" href="./chrome.css"><link rel="stylesheet" href="./explore-stories.css">
<script src="./app.js" type="module"></script>
</head><body class="explore-story-body">
<a class="skip-link" href="#story-content">Skip to ${escape(topic.title)} stories</a>
${header}
<main id="story-content" tabindex="-1" data-topic="${topic.id}">
  <div class="story-toolbar"><a class="story-back" href="./explore.html#topics">← Back to Explore topics</a></div>
  <h1 class="sr-only">${escape(topic.title)}</h1>
  <img class="topic-title-art" src="${titleArt.src}" width="${titleArt.width}" height="${titleArt.height}" alt="">
  <div class="topic-story-list">${articles.join("\n")}</div>
  <nav class="story-bottom-nav" aria-label="Explore navigation"><a class="story-back" href="./explore.html#topics">← Back to Explore topics</a></nav>
</main>
${mobileNav}
${footer}
${dialog}
</body></html>\n`;
  await writeFile(new URL(`explore-${topic.id}.html`, root), html);
}
console.log("Prepared four Explore topic pages and twelve source story cards.");
