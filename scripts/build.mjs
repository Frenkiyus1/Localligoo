import { cp, mkdir, readdir, unlink } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const project=new URL("../",import.meta.url), output=new URL("../dist/",import.meta.url);
await mkdir(output,{recursive:true});
for(const entry of await readdir(output,{withFileTypes:true})) if(entry.isFile()) await unlink(new URL(entry.name,output));
for(const entry of ["index.html","explore.html","explore-nature-wildlife.html","explore-local-food.html","explore-people-tradition.html","explore-festivals-seasons.html","explore-stories.css","learn.html","my-house.html","speaking.html","reading.html","grammar.html","writing.html","writing.css","writing.js","grammar.css","grammar.js","grammar-content.js","reading.css","reading.js","reading-content.js","styles.css","chrome.css","element-geometry.css","explore.css","learn.css","quiz.css","app.js","progress.js","quiz.js","vocabulary.js","vocabulary.css","questions.js","missions.js","speaking.js","speaking.css","audio.js","assets","VOCABULARY"]) await cp(new URL(entry,project),new URL(entry,output),{recursive:true});
console.log("Frontend built in "+fileURLToPath(output));
