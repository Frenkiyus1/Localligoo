const buttons = [...document.querySelectorAll('.vocab-word')];
const status = document.querySelector('#vocab-audio-status');
let currentAudio;
function clearSpeaking() {
  buttons.forEach(button => button.classList.remove('is-speaking'));
}
function stopAudio() {
  const audio = currentAudio;
  currentAudio = null;
  if (audio) {
    audio.pause();
    audio.currentTime = 0;
  }
  clearSpeaking();
}
buttons.forEach(button => {
  button.addEventListener('click', () => {
    const word = button.dataset.word;
    stopAudio();
    const audio = new Audio(button.dataset.audio);
    currentAudio = audio;
    button.classList.add('is-speaking');
    status.textContent = `Listen: ${word}`;
    audio.onended = () => {
      if (currentAudio !== audio) return;
      currentAudio = null;
      clearSpeaking();
      status.textContent = `Try saying: ${word}`;
    };
    const onError = () => {
      if (currentAudio !== audio) return;
      stopAudio();
      status.textContent = 'Could not play the pronunciation. Check your audio settings and try again.';
    };
    audio.onerror = onError;
    audio.play().catch(onError);
  });
});
window.addEventListener('pagehide', stopAudio);
const facts = [...document.querySelectorAll('.vocab-fact')];
const position = document.querySelector('.vocab-fact-position');
facts.forEach((fact, index) => {
  fact.querySelector('.vocab-fact-next').addEventListener('click', () => {
    const nextIndex = (index + 1) % facts.length;
    facts.forEach((card, i) => { card.hidden = i !== nextIndex; });
    position.textContent = `Fact ${nextIndex + 1} of ${facts.length}`;
    facts[nextIndex].querySelector('.vocab-fact-next').focus({ preventScroll: true });
  });
});
