// app.js - glue: UI + storage + api
document.addEventListener('DOMContentLoaded', () => {
  const messagesEl = document.getElementById('messages');
  const inputEl = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendBtn');
  const clearBtn = document.getElementById('clearBtn');
  const themeBtn = document.getElementById('themeBtn');
  const modeSelect = document.getElementById('modeSelect');

  let history = ChatStorage.load() || [];

  // render saved history
  function renderHistory() {
    messagesEl.innerHTML = '';
    history.forEach(m => renderMessage(m.role, m.text, m.ts, /*instant=*/true));
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function timeNow() {
    return new Date().toLocaleTimeString();
  }

  function saveHistory() {
    ChatStorage.save(history);
  }

  // render a single message; if instant true, don't animate typing
  function renderMessage(role, text, ts = null, instant = false) {
    const tpl = document.getElementById('msg-template');
    const node = tpl.content.firstElementChild.cloneNode(true);
    node.classList.add(role === 'user' ? 'user' : 'bot');
    const bubble = node.querySelector('.bubble');
    const timeEl = node.querySelector('.ts');
    timeEl.textContent = ts || timeNow();

    // if code fence present, render as code block
    if (typeof text === 'string' && text.trim().startsWith('```')) {
      // parse ```lang\ncode\n```
      const m = text.trim().match(/^```(\w+)?\n([\s\S]*)\n```$/);
      if (m) {
        const codeLang = m[1] || '';
        const codeText = m[2] || '';
        const pre = document.createElement('pre');
        const code = document.createElement('code');
        code.dataset.lang = codeLang;
        code.textContent = codeText;
        pre.appendChild(code);
        bubble.appendChild(pre);
      } else {
        bubble.textContent = text;
      }
    } else {
      if (instant || role === 'user') {
        bubble.textContent = text;
      } else {
        // for bot and not instant -> typing animation
        // we'll leave empty here and animate later by caller
        bubble.textContent = '';
      }
    }

    messagesEl.appendChild(node);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return { node, bubble };
  }

  // send flow
  async function sendFlow(userText) {
    if (!userText) return;
    // add user message
    const userMsg = { role: 'user', text: userText, ts: timeNow() };
    history.push(userMsg);
    saveHistory();
    renderMessage('user', userText, userMsg.ts, true);

    // typing indicator
    const typingNode = createTypingNode();
    messagesEl.appendChild(typingNode);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    const mode = modeSelect.value || 'chat';
    const currentHistoryForApi = history.slice(-12); // send short context

    const reply = await callWorker(userText, currentHistoryForApi, mode);

    // remove typing
    typingNode.remove();

    // add bot message skeleton
    const botMsg = { role: 'bot', text: reply, ts: timeNow() };
    history.push(botMsg);
    saveHistory();

    const { node, bubble } = renderMessage('bot', '', botMsg.ts, false);

    // if reply is code block we already handled within renderMessage if present, but since we passed '' above,
    // we must handle code block here
    if (typeof reply === 'string' && reply.trim().startsWith('```')) {
      // replace bubble content
      bubble.innerHTML = '';
      const m = reply.trim().match(/^```(\w+)?\n([\s\S]*)\n```$/);
      if (m) {
        const codeText = m[2] || '';
        const pre = document.createElement('pre');
        const code = document.createElement('code');
        code.textContent = codeText;
        pre.appendChild(code);
        bubble.appendChild(pre);
      } else {
        bubble.textContent = reply;
      }
    } else {
      // animate typing for plain text
      await simulateTypingInto(bubble, reply, 12);
    }

    // play receive sound if available
    try { new Audio('assets/sounds/receive.mp3').play().catch(()=>{}); } catch(e){}
  }

  // UI events
  sendBtn.addEventListener('click', () => {
    const txt = inputEl.value.trim();
    if (!txt) return;
    inputEl.value = '';
    try { new Audio('assets/sounds/send.mp3').play().catch(()=>{}); } catch(e){}
    sendFlow(txt);
  });

  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendBtn.click();
    }
  });

  clearBtn.addEventListener('click', () => {
    if (!confirm('Clear chat history?')) return;
    ChatStorage.clear();
    history = [];
    messagesEl.innerHTML = '';
  });

  themeBtn.addEventListener('click', () => {
    if (window.Theme && typeof window.Theme.toggle === 'function') window.Theme.toggle();
  });

  // initial render
  renderHistory();
});
