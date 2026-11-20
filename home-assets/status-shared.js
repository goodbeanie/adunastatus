// Shared by the homepage bar, the connect page and the admin preview.
// Reads the live notice from /status-notice (set in /admin.html). If that is not reachable, falls back to status.json.
// A notice looks like { down, message, backAt (ISO time or null) }.
(function () {
  function when(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    try {
      return d.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
    } catch (e) { return d.toString(); }
  }

  // Turns a stored notice into { down, text }, or null when there is nothing to show.
  // The back-up time is shown in the visitor's own time zone.
  function describe(s) {
    if (!s || (!s.down && !s.message)) return null;
    var text = (s.message || 'Server restart. Back soon.').trim();
    if (s.backAt) {
      var t = Date.parse(s.backAt);
      if (!isNaN(t)) {
        if (!/[.!?]$/.test(text)) text += '.';
        text += t > Date.now() ? ' Back up around ' + when(s.backAt) + '.' : ' Should be back any moment.';
      }
    }
    return { down: !!s.down, text: text };
  }

  function getJson(url) {
    return fetch(url + (url.indexOf('?') < 0 ? '?' : '&') + 't=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('status ' + r.status); return r.json(); });
  }

  // Resolves to { down, text } or null. Rejects only if neither source could be read.
  function load() {
    return getJson('/status-notice')
      .catch(function () { return getJson('status.json'); })
      .then(describe);
  }

  window.AdunaStatus = { load: load, describe: describe, when: when };
})();
