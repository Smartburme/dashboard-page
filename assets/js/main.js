/* main.js — WAYNE AI frontend
   - Sends JSON POST to Cloudflare Worker endpoint
   - Supports: text + optional image (base64), local history, generator mocks
*/

    // Cloudflare Worker API Configuration
    const API_CONFIG = {
        endpoint: 'https://morning-cell-1282.mysvm.workers.dev/api/chat',
        retries: 3,
        timeout: 10000,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    };

// DOM
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const chatBody = document.getElementById('chatBody');
const historyList = document.getElementById('historyList');
const newChatBtn = document.getElementById('newChatBtn');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const imageUpload = document.getElementById('imageUpload');
const imagePreview = document.getElementById('imagePreview');
const statusText = document.getElementById('statusText');
const promptInput = document.getElementById('promptInput');
const genTextBtn = document.getElementById('genTextBtn');
const genImageBtn = document.getElementById('genImageBtn');
const genCodeBtn = document.getElementById('genCodeBtn');
const outputsList = document.getElementById('outputsList');

let pendingImage = null; // dataURL
let conversations = loadConversations(); // array of {id, title, messages:[{who,text,image,at}], createdAt}
let activeConversationId = null;

// initialize
renderHistory();
if (!conversations.length) createNewConversation();
else openConversation(conversations[0].id);

// ---------- helpers ----------
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,8); }

function saveConversations() {
  try {
    localStorage.setItem('wayne_conversations_v1', JSON.stringify(conversations));
    statusText.textContent = 'Local history saved';
  } catch (e) {
    console.error('Save failed', e);
    statusText.textContent = 'Local save failed';
  }
}

function loadConversations() {
  try {
    return JSON.parse(localStorage.getItem('wayne_conversations_v1') || '[]');
  } catch (e) {
    return [];
  }
}

function createNewConversation(title = 'New Chat') {
  const conv = { id: uid(), title, messages: [], createdAt: Date.now() };
  conversations.unshift(conv);
  saveConversations();
  renderHistory();
  openConversation(conv.id);
  return conv;
}

function openConversation(id) {
  activeConversationId = id;
  const conv = conversations.find(c => c.id === id);
  if (!conv) return;
  // render messages
  chatBody.innerHTML = '';
  conv.messages.forEach(m => renderMessage(m));
  // scroll
  chatBody.scrollTop = chatBody.scrollHeight;
  highlightActiveHistory();
}

function appendToConversation(who, text = '', image = null) {
  const conv = conversations.find(c => c.id === activeConversationId);
  if (!conv) return;
  const msg = { who, text, image, at: Date.now() };
  conv.messages.push(msg);
  saveConversations();
  renderMessage(msg);
}

function renderMessage(msg) {
  const el = document.createElement('div');
  el.className = `message ${msg.who === 'user' ? 'user' : 'ai'}`;
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  if (msg.image) {
    const img = document.createElement('img');
    img.src = msg.image;
    img.className = 'msg-img';
    img.alt = 'attached';
    bubble.appendChild(img);
  }
  const p = document.createElement('p');
  p.textContent = msg.text || '';
  bubble.appendChild(p);
  el.appendChild(bubble);
  chatBody.appendChild(el);
  chatBody.scrollTop = chatBody.scrollHeight;
}

function renderHistory() {
  historyList.innerHTML = '';
  conversations.forEach(conv => {
    const li = document.createElement('li');
    li.className = 'history-item';
    li.innerHTML = `<div>
                      <strong>${conv.title}</strong><br>
                      <small class="muted">${new Date(conv.createdAt).toLocaleString()}</small>
                    </div>
                    <div>
                      <button class="btn" data-id="${conv.id}" title="Open">Open</button>
                    </div>`;
    historyList.appendChild(li);
  });
  // attach click open handlers
  historyList.querySelectorAll('button[data-id]').forEach(b => {
    b.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      openConversation(id);
    });
  });
  highlightActiveHistory();
}

function highlightActiveHistory() {
  historyList.querySelectorAll('.history-item').forEach((item, idx) => {
    const conv = conversations[idx];
    if (!conv) return;
    if (conv.id === activeConversationId) item.style.outline = '2px solid rgba(55,161,255,0.12)';
    else item.style.outline = 'none';
  });
}

// ---------- image upload ----------
imageUpload.addEventListener('change', (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) return alert('Image file ထည့်ပါ');
  const reader = new FileReader();
  reader.onload = () => {
    pendingImage = reader.result; // data URL
    imagePreview.innerHTML = `<img src="${pendingImage}" alt="preview"> <button class="btn icon remove" title="Remove image">&times;</button>`;
    const rem = imagePreview.querySelector('.remove');
    rem && rem.addEventListener('click', () => {
      pendingImage = null;
      imagePreview.innerHTML = '';
      imageUpload.value = '';
    });
  };
  reader.readAsDataURL(file);
});

// ---------- send / API ----------
sendButton.addEventListener('click', sendHandler);
userInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendHandler(); });

async function sendHandler() {
  const text = userInput.value.trim();
  if (!text && !pendingImage) return;

  // append user's message to UI & conversation
  appendToConversation('user', text, pendingImage);
  userInput.value = '';
  imagePreview.innerHTML = '';
  imageUpload.value = '';
  const sentImage = pendingImage;
  pendingImage = null;

  // show loading placeholder
  const loadingEl = document.createElement('div');
  loadingEl.className = 'message ai loading';
  loadingEl.innerHTML = `<div class="bubble"><span class="dots"><span></span></span></div>`;
  chatBody.appendChild(loadingEl);
  chatBody.scrollTop = chatBody.scrollHeight;

  try {
    const response = await callWorkerAPI(text, sentImage);
    // remove loading
    loadingEl.remove();

    if (response && response.reply) {
      appendToConversation('ai', response.reply, response.image || null);
    } else {
      appendToConversation('ai', 'ဖျက်တီးချက်: API သို့ သေချာမရောက်ပါ။');
      console.warn('unexpected api response', response);
    }
  } catch (err) {
    loadingEl.remove();
    appendToConversation('ai', '⚠️ Error: ' + (err.message || 'Network error'));
    console.error(err);
  }
}

// POST JSON to worker. If image exists, include base64 data URL under "image"
async function callWorkerAPI(message, imageDataUrl = null) {
  // simple timeout with AbortController
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  const body = { message: message || '', image: imageDataUrl || null };

  const res = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: controller.signal
  }).catch(err => { throw err; });

  clearTimeout(timeout);

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status} ${res.statusText} ${text}`);
  }

  // assume JSON response { reply: "...", image: "data:image/..." (optional) }
  const data = await res.json().catch(() => null);
  return data;
}

// ---------- conversation controls ----------
newChatBtn.addEventListener('click', () => createNewConversation('New Chat'));
clearHistoryBtn.addEventListener('click', () => {
  if (!confirm('Chat history ကို ဖျက်မယ်နည်း?')) return;
  conversations = [];
  activeConversationId = null;
  saveConversations();
  renderHistory();
  chatBody.innerHTML = '';
  createNewConversation('New Chat');
});

// ---------- generator buttons (mock -> also save to outputs list) ----------
genTextBtn && genTextBtn.addEventListener('click', () => {
  const p = (promptInput && promptInput.value.trim()) || '';
  if (!p) return alert('Prompt ရိုက်ပါ။');
  // for now create a mock output and save in outputs list
  const card = createOutputCard('Generated Text', p + '\n\n(Mock output)');
  outputsList.prepend(card);
  // also save as conversation message
  appendToConversation('ai', '(Generated text) ' + p, null);
});

genImageBtn && genImageBtn.addEventListener('click', () => {
  const p = (promptInput && promptInput.value.trim()) || '';
  if (!p) return alert('Prompt ရိုက်ပါ။');
  const placeholder = 'https://via.placeholder.com/480x260.png?text=Generated+Image';
  const card = createOutputCard('Generated Image', `<img src="${placeholder}" alt="generated" style="max-width:100%;border-radius:8px">`);
  outputsList.prepend(card);
  appendToConversation('ai', '(Generated image) ' + p, placeholder);
});

genCodeBtn && genCodeBtn.addEventListener('click', () => {
  const p = (promptInput && promptInput.value.trim()) || '';
  if (!p) return alert('Prompt ရိုက်ပါ။');
  const code = `// mock code for prompt: ${p}\nconsole.log('Hello WAYNE AI');`;
  const card = createOutputCard('Generated Code', `<pre>${escapeHtml(code)}</pre>`);
  outputsList.prepend(card);
  appendToConversation('ai', '(Generated code) ' + p, null);
});

function createOutputCard(title, htmlContent){
  const wrapper = document.createElement('div');
  wrapper.className = 'output-card';
  wrapper.innerHTML = `<strong>${title}</strong><div style="margin-top:8px">${htmlContent}</div>`;
  return wrapper;
}

function escapeHtml(s){ return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

// Save periodically / before unload
window.addEventListener('beforeunload', () => saveConversations());
