// theme.js - simple accent/theme adjustments
(function(){
  const root = document.documentElement;
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  let dark = prefersDark;

  function applyTheme() {
    if (dark) {
      root.style.setProperty('--bg','#0f1116');
      root.style.setProperty('--panel','#12121b');
    } else {
      root.style.setProperty('--bg','#f5f7fa');
      root.style.setProperty('--panel','#ffffff');
      root.style.setProperty('--text','#0b1220');
    }
  }

  window.Theme = {
    toggle() { dark = !dark; applyTheme(); },
    setAccent(color){ root.style.setProperty('--accent', color); }
  };

  applyTheme();
})();
