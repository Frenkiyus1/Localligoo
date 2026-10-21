import { completeLesson } from "./progress.js";
const items = [
  { answer: "stilt house", prompt: "type of house", meaning: "stilt house = nhà sàn", good: "You did a great job!!", retry: "Oops! Don’t worry, let’s try again!", explain: 'It stands after the phrase “traditional Thai” → We need a NOUN for a type of house.' },
  { answer: "brocade", prompt: "blanket material or pattern", meaning: "brocade blankets = chăn thổ cẩm", good: "Perfect! Alex is very happy with your email!", retry: "Nice try! Keep going!", explain: 'Stands before “blankets”. We need a word for material/pattern.' },
  { answer: "plum", prompt: "kind of tree", meaning: "plum trees = những cây mận", good: "Awesome! Alex loves your answer!", retry: "Almost there! Check again!", explain: 'Stands before “trees”. We need a fruit name (add -s for many trees).' },
  { answer: "fireplace", prompt: "source of warmth", meaning: "fireplace = bếp lửa / lò sưởi", good: "Great job! You made Alex smile!", retry: "So close! Give it another shot!", explain: 'Comes after “sit around a warm…”. We need a noun for a heat source.' },
  { answer: "hills", prompt: "tea landscape", meaning: "tea hills = các đồi chè", good: "Bingo! Alex is so proud of you!", retry: "Don’t give up! You can do it!", explain: 'Comes after “tea”. We need a noun for small mountains (add -s for many hills).' },
  { answer: "Pine Forest", prompt: "place near Ban Ang", meaning: "Pine Forest = Rừng thông", good: "Fantastic! You got it right!", retry: "Oops! Take a close look!", explain: 'Comes after “Ban Ang”. A famous place, remember to capitalize (pine forest → Pine Forest!).' },
];
const $ = selector => document.querySelector(selector);
const screens = [...document.querySelectorAll('.writing-screen')];
function isCorrect(value, index) {
  const answer = items[index].answer;
  const typed = value.trim();
  return typed === answer || typed === answer[0].toUpperCase() + answer.slice(1);
}
const isComplete = () => values.every(value => value.trim().length > 0);
let values = Array(6).fill('');
let checked = false;
let delivered = false;
let activeAnswer = null;
let hideTimer;
let returningFocus = false;
let suppressHover = false;
let audioContext;
const popup = $('#answer-explanation');
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

function showScreen(id) {
  closeExplanation();
  screens.forEach(screen => { screen.hidden = screen.id !== id; });
  $('#read-alex').hidden = id !== 'compose-screen';
  const screen = document.getElementById(id);
  screen.querySelector('h2')?.focus({ preventScroll: true });
  screen.scrollIntoView({ block: 'start', behavior: 'instant' });
}

function slot(index, mode) {
  const item = items[index];
  const number = `<span class="blank-number">(${index + 1})</span>`;
  if (mode === 'edit') {
    return `<span class="answer-slot">${number}<input type="text" name="blank-${index + 1}" data-blank="${index}" value="${escape(values[index])}" aria-label="Blank ${index + 1}: ${item.prompt}" placeholder="Type here" maxlength="60" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" required></span>`;
  }
  const correct = isCorrect(values[index], index);
  const text = correct ? `<span aria-hidden="true">✓ </span>${escape(values[index].trim())}` : `<del>${escape(values[index])}</del> <span aria-hidden="true">→</span> <span class="corrected-answer">${escape(item.answer)}</span>`;
  const label = `Blank ${index + 1}: ${correct ? 'Correct, ' + values[index].trim() : 'Incorrect, ' + values[index] + '. Correct answer: ' + item.answer}. Show explanation`;
  return `<span class="answer-slot">${number}<button type="button" class="answer-result${correct ? '' : ' is-incorrect'}" data-answer="${index}" data-correct="${correct}" aria-controls="answer-explanation" aria-expanded="false" aria-label="${escape(label)}">${text}</button></span>`;
}

function email(mode) {
  const blank = index => slot(index, mode);
  return `<div class="mail-address"><p><strong>To:</strong> <em>alex2042002@gmail.com</em></p><p>Reply to your inquiry about Moc Chau Stilt House Homestay</p><p><strong>Subject:</strong> Re: Inquiry about your traditional stilt house homestay</p></div>
    <p>Dear Alex,</p><p>We are very excited to welcome you to Moc Chau!</p>
    <p>Our homestay is a traditional Thai ${blank(0)} with a modern design.</p>
    <p>We have cozy rooms with wooden ceilings. Each room has a bed with colourful ${blank(1)} blankets, and a small table with chairs. From the big window, you can see a beautiful green valley with ${blank(2)} trees. In the evening, we can sit around a warm ${blank(3)} together and join cultural exchanges with local people.</p>
    <p>Also, our homestay is close to beautiful tea ${blank(4)}, Ban Ang ${blank(5)}, and a short walk to Moc Chau Night Market. It is also very convenient to try local food and visit nearby cafés.</p>
    <p>Looking forward to having you in <span lang="vi">Mộc Châu</span> soon!</p><p class="mail-signature">Best regards,<br>Localingo</p>`;
}

function renderDraft() {
  closeExplanation();
  $('#reply-text').innerHTML = email(checked ? 'checked' : 'edit');
  $('#check-answers').hidden = checked;
  $('#try-again').hidden = !checked || values.every(isCorrect);
  $('#send-email').hidden = !checked || !values.every(isCorrect);
  $('#explanation-hint').hidden = !checked;
  if (!checked) {
    $('#answer-feedback').textContent = '';
    $('#answer-feedback').classList.remove('needs-retry');
    updateCheckButton();
  }
}
function updateCheckButton() {
  $('#check-answers').disabled = !isComplete();
}
$('#reply-text').addEventListener('input', event => {
  if (!event.target.matches('input[data-blank]') || checked) return;
  values[Number(event.target.dataset.blank)] = event.target.value;
  updateCheckButton();
});
$('#reply-alex').addEventListener('click', () => { renderDraft(); showScreen('compose-screen'); });
$('#read-alex').addEventListener('click', () => showScreen('guest-screen'));
$('#reply-form').addEventListener('submit', event => {
  event.preventDefault();
  if (checked || !isComplete()) return;
  checked = true;
  renderDraft();
  const score = values.filter(isCorrect).length;
  const feedback = $('#answer-feedback');
  feedback.textContent = score === 6 ? 'Excellent! You got all the answers right!' : `Good try! You got ${score}/6 correct. Check the red boxes and try again!`;
  feedback.classList.toggle('needs-retry', score !== 6);
  feedback.tabIndex = -1;
  feedback.focus({ preventScroll: true });
  feedback.scrollIntoView({ block: 'nearest', behavior: 'instant' });
});
$('#try-again').addEventListener('click', () => {
  const firstWrong = values.findIndex((value, i) => !isCorrect(value, i));
  values = values.map((value, i) => isCorrect(value, i) ? value : '');
  checked = false;
  renderDraft();
  $(`[data-blank="${firstWrong}"]`)?.focus();
});

function positionExplanation(reveal = false) {
  if (!activeAnswer || popup.hidden) return;
  let anchor = activeAnswer.getBoundingClientRect();
  const { width, height } = popup.getBoundingClientRect();
  // Keep the explanation above its answer, with room for the downward pointer.
  if (reveal === true && anchor.top < height + 20) {
    suppressHover = true;
    window.scrollBy({ top: anchor.top - height - 20, behavior: 'instant' });
    anchor = activeAnswer.getBoundingClientRect();
  }
  const targetX = anchor.left + anchor.width / 2;
  const left = Math.max(16, Math.min(targetX - width / 2, innerWidth - width - 16));
  popup.style.left = `${left}px`;
  popup.style.top = `${anchor.top - height - 4}px`;
  // Move the pointer independently when the card is clamped at a viewport edge.
  popup.style.setProperty('--pointer-x', `${targetX - left}px`);
}
function explain(button) {
  clearTimeout(hideTimer);
  if (activeAnswer && activeAnswer !== button) activeAnswer.setAttribute('aria-expanded', 'false');
  activeAnswer = button;
  const index = Number(button.dataset.answer);
  const item = items[index];
  const correct = button.dataset.correct === 'true';
  popup.classList.toggle('is-correct', correct);
  const artwork = $('#explanation-art');
  // The visible explanation is the supplied image. Alt text transcribes it for accessibility.
  artwork.src = `./assets/writing/explanation-${index + 1}-${correct ? 'correct' : 'incorrect'}.webp`;
  artwork.alt = `${correct ? item.good : item.retry} Explain: ${item.explain} Answer: ${item.meaning}`;
  button.setAttribute('aria-expanded', 'true');
  popup.hidden = false;
  positionExplanation(true);
}
function closeExplanation(returnFocus = false) {
  clearTimeout(hideTimer);
  if (returnFocus) suppressHover = true;
  const previous = activeAnswer;
  activeAnswer?.setAttribute('aria-expanded', 'false');
  activeAnswer = null;
  popup.hidden = true;
  if (returnFocus && previous?.isConnected) {
    returningFocus = true;
    previous.focus({ preventScroll: true });
    returningFocus = false;
  }
}
function scheduleClose() {
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    if (document.activeElement !== activeAnswer && !popup.contains(document.activeElement) && !popup.matches(':hover')) closeExplanation();
  }, 180);
}
for (const region of [$('#reply-text'), $('#sent-email-text')]) {
  region.addEventListener('pointermove', event => {
    const button = event.target.closest('[data-answer]');
    if (button && !suppressHover && event.pointerType !== 'touch' && (button !== activeAnswer || popup.hidden)) explain(button);
  });
  region.addEventListener('pointerout', event => {
    if (event.target.closest('[data-answer]') && !event.relatedTarget?.closest?.('[data-answer]')) scheduleClose();
  });
  region.addEventListener('focusin', event => { if (!returningFocus && event.target.matches('[data-answer]')) explain(event.target); });
  region.addEventListener('focusout', scheduleClose);
  region.addEventListener('click', event => { const button = event.target.closest('[data-answer]'); if (button) explain(button); });
}
// Hiding a bubble can expose an answer under the stationary pointer.
// Wait for actual pointer movement before allowing hover to reopen it.
document.addEventListener('pointermove', event => {
  if (!suppressHover) return;
  suppressHover = false;
  const button = event.target.closest('[data-answer]');
  if (button && event.pointerType !== 'touch') explain(button);
});
popup.addEventListener('pointerdown', event => {
  if (!event.target.closest('button')) {
    event.preventDefault();
    popup.focus({ preventScroll: true });
  }
});
popup.addEventListener('pointerenter', () => clearTimeout(hideTimer));
popup.addEventListener('pointerleave', scheduleClose);
popup.addEventListener('focusout', scheduleClose);
$('#close-explanation').addEventListener('click', () => closeExplanation(true));
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !popup.hidden) { event.preventDefault(); closeExplanation(true); } });
document.addEventListener('pointerdown', event => { if (!popup.hidden && !popup.contains(event.target) && !event.target.closest('[data-answer]')) closeExplanation(); });
$('#explanation-art').addEventListener('load', positionExplanation);
window.addEventListener('resize', positionExplanation);
window.addEventListener('scroll', positionExplanation, { passive: true });

function playSendSound() {
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    const context = audioContext = new Audio();
    void context.resume().then(() => {
      [523.25, 659.25, 783.99].forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const start = context.currentTime + index * .09;
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(.08, start + .015);
        gain.gain.exponentialRampToValueAtTime(.001, start + .25);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(start);
        oscillator.stop(start + .27);
        if (index === 2) oscillator.onended = () => { void context.close().catch(() => {}); };
      });
    }).catch(() => {});
  } catch { /* The learning flow also works when sound is unavailable. */ }
}
$('#send-email').addEventListener('click', () => {
  if (!checked || delivered || !values.every(isCorrect)) return;
  delivered = true;
  completeLesson("my-house", "writing");
  $('#sent-email-text').innerHTML = email('sent');
  $('#confetti').replaceChildren(...Array.from({ length: 32 }, (_, i) => {
    const piece = document.createElement('i');
    piece.className = 'confetti-piece';
    piece.style.setProperty('--x', `${15 + (i * 17 % 70)}%`);
    piece.style.setProperty('--color', ['#e2a72d', '#83a34d', '#ef8f72', '#8ccdc5'][i % 4]);
    piece.style.setProperty('--delay', `${i % 6 * .055}s`);
    piece.style.setProperty('--drift', `${i % 2 ? 60 : -60}px`);
    return piece;
  }));
  showScreen('sent-screen');
  $('#sent-screen').classList.add('is-celebrating');
  playSendSound();
});
$('#view-sent').addEventListener('click', () => showScreen('sent-preview'));
$('#back-to-sent').addEventListener('click', () => { $('#sent-screen').classList.remove('is-celebrating'); showScreen('sent-screen'); });
window.addEventListener('pagehide', () => { clearTimeout(hideTimer); void audioContext?.close().catch(() => {}); });
renderDraft();
$('#reply-alex').disabled = false;
