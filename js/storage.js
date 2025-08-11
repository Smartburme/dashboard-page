// Chat storage helper (client-side history)
const ChatStorage = {
  KEY: 'wayne_chat_history_v1',
  save(messages = []) {
    try {
      localStorage.setItem(this.KEY, JSON.stringify(messages));
    } catch (e) {
      console.warn('ChatStorage.save failed', e);
    }
  },
  load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn('ChatStorage.load failed', e);
      return [];
    }
  },
  clear() {
    try {
      localStorage.removeItem(this.KEY);
    } catch (e) {
      console.warn('ChatStorage.clear failed', e);
    }
  }
};
