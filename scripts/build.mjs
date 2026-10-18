import { cp, mkdir, readdir, unlink } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const project=new URL("../",import.meta.url), output=new URL("../dist/",import.meta.url);
await mkdir(output,{recursive:true});
for(const entry of await readdir(output,{withFileTypes:true})) if(entry.isFile()) await unlink(new URL(entry.name,output));
for(const entry of ["index.html","explore.html","learn.html","my-house.html","speaking.html","styles.css","chrome.css","element-geometry.css","explore.css","learn.css","quiz.css","app.js","progress.js","quiz.js","vocabulary.js","vocabulary.css","questions.js","missions.js","speaking.js","audio.js","assets"]) await cp(new URL(entry,project),new URL(entry,output),{recursive:true});
console.log("Frontend built in "+fileURLToPath(output));
