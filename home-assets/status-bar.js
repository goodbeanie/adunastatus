// The bar across the top of the homepage.
// 1. A notice posted from /admin.html (stored at /api/status, with status.json as the fallback) shows as a bar:
//    red when the server is down, yellow for a warning, and nothing when there is no notice.
// 2. If nobody has posted a notice but the server stops answering /healthz twice in a row, the default
//    "Server restart" bar appears by itself and goes away when the server answers again.
(function () {
  var bar = document.getElementById('bar');
  if (!bar) return;

  var DEFAULT_TEXT = 'Server restart. Aduna will be back shortly.';

  var manual = null;       // the posted notice: { kind, text } or null
  var unreachable = false; // the server did not answer /healthz twice in a row

  function render() {
    var m = manual;
    if (!m && unreachable) m = { kind: 'down', text: DEFAULT_TEXT };
    if (!m) { bar.className = ''; bar.textContent = ''; return; }
    bar.className = 'show ' + m.kind;
    bar.textContent = m.text;
  }

  function loadStatus() {
    return AdunaStatus.load()
      .then(function (n) { manual = n ? { kind: n.down ? 'down' : 'warn', text: n.text } : null; })
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
