// The bar across the top of the homepage.
// 1. status.json is edited by hand: { "down": true, "message": "Restarting for an update." }
//    down:true gives a red bar, a message alone gives a yellow one, an empty message hides it.
// 2. If nobody has written a notice but the server stops answering /healthz twice in a row, a yellow bar says so.
(function () {
  var bar = document.getElementById('bar');
  if (!bar) return;

  var manual = null;       // what status.json says: { kind, text } or null
  var unreachable = false; // the server did not answer /healthz twice in a row

  function render() {
    var m = manual;
    if (!m && unreachable) m = { kind: 'warn', text: 'Aduna isn’t responding right now. It may be restarting.' };
    if (!m) { bar.className = ''; bar.textContent = ''; return; }
    bar.className = 'show ' + m.kind;
    bar.textContent = m.text;
  }

  function loadStatus() {
    return fetch('status.json?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (s) {
        if (s.down) manual = { kind: 'down', text: s.message || 'Aduna is down. Back soon.' };
        else if (s.message) manual = { kind: 'warn', text: s.message };
        else manual = null;
      })
      .catch(function () { /* keep whatever we had */ });
  }

  function ping() {
    var ctl = typeof AbortController === 'function' ? new AbortController() : null;
    var stop = ctl ? setTimeout(function () { ctl.abort(); }, 5000) : null;
    return fetch(ADUNA.health + '?t=' + Date.now(), { cache: 'no-store', signal: ctl ? ctl.signal : undefined })
      .then(function (r) { return r.ok ? r.text() : ''; })
      .then(function (t) { return t.trim() === 'ok'; })
      .catch(function () { return false; })
      .then(function (up) { if (stop) clearTimeout(stop); return up; });
  }

  var misses = 0;
  function check() {
    loadStatus().then(function () { return ping(); }).then(function (up) {
      if (up || navigator.onLine === false) { misses = 0; unreachable = false; render(); return; }
      misses += 1;
      // one miss can be a blip; two in a row is worth telling people about
      if (misses >= 2) { unreachable = true; render(); return; }
      render();
      setTimeout(check, 5000);
    });
  }

  check();
  setInterval(check, 30000);
})();
