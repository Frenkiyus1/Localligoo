const buttons = [...document.querySelectorAll('.vocab-word')];
const status = document.querySelector('#vocab-audio-status');
let currentUtterance;
function clearSpeaking() {
  buttons.forEach(button => button.classList.remove('is-speaking'));
}
buttons.forEach(button => {
  button.addEventListener('click', () => {
    const word = button.dataset.word;
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
      status.textContent = 'English pronunciation is unavailable in this browser. Try Chrome, Edge or Safari.';
      return;
    }
    window.speechSynthesis.cancel();
    clearSpeaking();
    const utterance = new SpeechSynthesisUtterance(word);
    currentUtterance = utterance;
    utterance.lang = 'en-US';
    utterance.rate = .8;
    const voices = window.speechSynthesis.getVoices();
    utterance.voice = voices.find(voice => voice.lang === 'en-US') || voices.find(voice => voice.lang.startsWith('en')) || null;
    button.classList.add('is-speaking');
    status.textContent = `Listen: ${word}`;
    utterance.onend = () => {
      if (currentUtterance !== utterance) return;
      clearSpeaking();
      status.textContent = `Try saying: ${word}`;
    };
    utterance.onerror = event => {
      if (currentUtterance !== utterance) return;
      clearSpeaking();
      if (event.error !== 'canceled' && event.error !== 'interrupted') {
        status.textContent = 'Could not play the pronunciation. Check your audio settings and try again.';
      }
    };
    window.speechSynthesis.speak(utterance);
  });
});
window.addEventListener('pagehide', () => {
  currentUtterance = null;
  window.speechSynthesis?.cancel();
});
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
