// =============================
// Cloudflare Worker API Config
// =============================
const API_CONFIG = {
    endpoint: 'https://morning-cell-1282.mysvm.workers.dev/api/chat',
    retries: 3,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
};

// =============================
// DOM Elements
// =============================
const chatBody = document.getElementById("chatBody");
const userInput = document.getElementById("userInput");
const sendButton = document.getElementById("sendButton");
const historyList = document.getElementById("historyList");
const newChatBtn = document.getElementById("newChatBtn");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");
const imageUpload = document.getElementById("imageUpload");
const imagePreview = document.getElementById("imagePreview");

let chatHistory = JSON.parse(localStorage.getItem("chatHistory") || "[]");
let uploadedImageBase64 = null;

// =============================
// Init
// =============================
renderHistory();
imageUpload.addEventListener("change", handleImageUpload);
sendButton.addEventListener("click", handleSend);
userInput.addEventListener("keypress", e => {
    if (e.key === "Enter") handleSend();
});
newChatBtn.addEventListener("click", startNewChat);
clearHistoryBtn.addEventListener("click", clearHistory);

// =============================
// Image Upload Handler
// =============================
function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        uploadedImageBase64 = reader.result;
        imagePreview.innerHTML = `
            <div class="img-thumb">
                <img src="${uploadedImageBase64}" />
                <span class="remove-img">&times;</span>
            </div>
        `;
        imagePreview.querySelector(".remove-img").addEventListener("click", () => {
            uploadedImageBase64 = null;
            imagePreview.innerHTML = "";
        });
    };
    reader.readAsDataURL(file);
}

// =============================
// API Call with Retry + Timeout
// =============================
async function sendMessageToAPI(message, imageBase64) {
    for (let attempt = 1; attempt <= API_CONFIG.retries; attempt++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

            const res = await fetch(API_CONFIG.endpoint, {
                method: "POST",
                headers: API_CONFIG.headers,
                body: JSON.stringify({
                    message,
                    image: imageBase64 || null
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json();
        } catch (err) {
            if (attempt === API_CONFIG.retries) {
                console.error("API failed after retries:", err);
                return { error: "API connection failed" };
            }
            console.warn(`Retry ${attempt} failed, retrying...`);
        }
    }
}

// =============================
// Chat Send Logic
// =============================
async function handleSend() {
    const text = userInput.value.trim();
    if (!text && !uploadedImageBase64) return;

    appendMessage("user", text, uploadedImageBase64);
    userInput.value = "";
    imagePreview.innerHTML = "";

    appendLoading();
    const res = await sendMessageToAPI(text, uploadedImageBase64);
    removeLoading();

    if (res.error) {
        appendMessage("ai", "⚠️ " + res.error);
    } else {
        appendMessage("ai", res.reply || JSON.stringify(res));
    }

    saveToHistory();
}

// =============================
// UI Helpers
// =============================
function appendMessage(sender, text, image) {
    const msgEl = document.createElement("div");
    msgEl.className = `message ${sender}`;
    msgEl.innerHTML = `
        <div class="bubble">
            ${image ? `<img src="${image}" class="msg-img"/>` : ""}
            <p>${text}</p>
        </div>
    `;
    chatBody.appendChild(msgEl);
    chatBody.scrollTop = chatBody.scrollHeight;
}

function appendLoading() {
    const loadingEl = document.createElement("div");
    loadingEl.className = "message ai loading";
    loadingEl.innerHTML = `<div class="bubble"><span class="dots"></span></div>`;
    chatBody.appendChild(loadingEl);
}

function removeLoading() {
    const loadingEl = document.querySelector(".loading");
    if (loadingEl) loadingEl.remove();
}

// =============================
// History System
// =============================
function saveToHistory() {
    chatHistory.push(chatBody.innerHTML);
    localStorage.setItem("chatHistory", JSON.stringify(chatHistory));
    renderHistory();
}

function renderHistory() {
    historyList.innerHTML = "";
    chatHistory.forEach((_, idx) => {
        const li = document.createElement("li");
        li.textContent = `Chat ${idx + 1}`;
        li.addEventListener("click", () => {
            chatBody.innerHTML = chatHistory[idx];
        });
        historyList.appendChild(li);
    });
}

function startNewChat() {
    chatBody.innerHTML = "";
    uploadedImageBase64 = null;
}

function clearHistory() {
    localStorage.removeItem("chatHistory");
    chatHistory = [];
    renderHistory();
}
