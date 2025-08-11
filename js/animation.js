// animation.js - typing animation helpers

// Type text into an element char-by-char
function simulateTypingInto(element, text, speed = 14) {
  element.textContent = '';
  return new Promise(resolve => {
    let i = 0;
    const t = setInterval(() => {
      element.textContent += text.charAt(i++);
      element.parentElement?.scrollIntoView({behavior:'smooth', block:'end'});
      if (i >= text.length) {
        clearInterval(t);
        resolve();
      }
    }, speed);
  });
}

// Create a typing indicator node (returns the wrapper)
function createTypingNode() {
  const wrapper = document.createElement('div');
  wrapper.className = 'message bot';
  wrapper.innerHTML = `<div class="bubble typing"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div><time class="ts"></time>`;
  return wrapper;
}

// sanitize (escape) to avoid injection when using innerHTML (we prefer textContent)
function escapeHtml(str) {
  return String(str)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#39;');
}
