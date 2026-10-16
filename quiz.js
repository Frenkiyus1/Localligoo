import { readProgress, saveProgress } from "./progress.js";
import { questions } from "./questions.js";
const deck = document.getElementById("question-deck");
let order = [], position = 0, category = "all";
const labels = { nature:"Nature & Wildlife", food:"Local Food", people:"People & Tradition", festivals:"Festivals & Seasons" };
function shuffle(items) {
  const result=[...items];
  for(let i=result.length-1;i>0;i--) {const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}
  if(result.length>1 && result.every((item,i)=>item===items[i])) result.push(result.shift());
  return result;
}
function node(tag,text,className) {const el=document.createElement(tag);el.textContent=text;if(className)el.className=className;return el;}
function draw() {
  const state=readProgress();
  const filtered=questions.filter(q=>category==="all"||q.category===category);
  order=shuffle(filtered);position=0;deck.replaceChildren();
  order.forEach((question,index)=>{
    const card=node("article","","question-card");card.dataset.questionId=question.id;card.hidden=index!==position;
    card.append(node("p",labels[question.category],"question-category"));
    const heading=node("h3",question.prompt);heading.id=`question-${question.id}`;card.setAttribute("aria-labelledby",heading.id);card.append(heading);
    const choices=node("div","","question-choices");
    const feedback=node("p","","answer-feedback");feedback.setAttribute("role","status");
    question.choices.forEach((choice,i)=>{
      const button=node("button",`${String.fromCharCode(65+i)}. ${choice}`,"question-choice");
      button.type="button";button.dataset.choice=i;
      button.addEventListener("click",()=>{
        saveProgress(progress=>{progress.explore[question.id]=i;});
        reveal(card,question,i,feedback); update();
      });
      choices.append(button);
    });
    card.append(choices,feedback);deck.append(card);
    const selected=state.explore[question.id];
    if(Number.isInteger(selected)&&selected>=0&&selected<question.choices.length) reveal(card,question,selected,feedback);
  });
  update();
}
function reveal(card,question,selected,feedback) {
  card.querySelectorAll(".question-choice").forEach((button,i)=>{
    button.disabled=true;
    button.classList.toggle("correct",i===question.answer);
    button.classList.toggle("incorrect",i===selected&&i!==question.answer);
    button.setAttribute("aria-pressed",String(i===selected));
  });
  const correct=selected===question.answer;
  feedback.textContent=(correct?"That's right! ":"Good try! ")+`Answer: ${question.choices[question.answer]}`;
  feedback.classList.toggle("answer-correct",correct);
}
function update() {
  const state=readProgress();
  const answered=questions.filter(q=>Number.isInteger(state.explore[q.id])).length;
  const correct=questions.filter(q=>state.explore[q.id]===q.answer).length;
  document.getElementById("question-position").textContent=`${position+1} / ${order.length}`;
  document.getElementById("quiz-progress-text").textContent=`${answered}/${questions.length} answered · ${correct} correct`;
  document.getElementById("quiz-progress").value=answered;
  document.getElementById("quiz-progress").max=questions.length;
  document.getElementById("previous-question").disabled=position===0;
  document.getElementById("next-question").disabled=position===order.length-1;
}
function move(step) {
  position=Math.max(0,Math.min(order.length-1,position+step));
  [...deck.children].forEach((card,i)=>{card.hidden=i!==position;});
  update();deck.querySelector(".question-card:not([hidden]) h3").setAttribute("tabindex","-1");deck.querySelector(".question-card:not([hidden]) h3").focus({preventScroll:true});
}
document.getElementById("previous-question").addEventListener("click",()=>move(-1));
document.getElementById("next-question").addEventListener("click",()=>move(1));
document.getElementById("shuffle-questions").addEventListener("click",draw);
document.getElementById("quiz-category").addEventListener("change",event=>{category=event.target.value;draw();});
document.getElementById("reset-quiz").addEventListener("click",()=>{
  const dialog=document.getElementById("reset-dialog");dialog.showModal();
});
document.getElementById("confirm-reset").addEventListener("click",()=>{
  saveProgress(state=>{state.explore={};});document.getElementById("reset-dialog").close();draw();
});
document.querySelectorAll("[data-quiz-category]").forEach(button=>button.addEventListener("click",()=>{
  category=button.dataset.quizCategory;document.getElementById("quiz-category").value=category;draw();
  document.getElementById("explore-quiz").scrollIntoView({behavior:"smooth",block:"center"});
}));
window.addEventListener("storage",draw);
draw();
