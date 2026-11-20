// If you're already signed in, the buttons just open the app (through the connecting page, which waits for the server if it is down).
try{
  if(localStorage.getItem('aduna_in')||localStorage.getItem('aduna_token')){ // aduna_token: people who signed in before cookies existed
    document.querySelectorAll('a.go').forEach(function(a){a.textContent='Open Aduna';a.setAttribute('href','connect.html?go=app');});
    document.querySelectorAll('a.login').forEach(function(a){a.style.display='none'});
  }
}catch(e){}

// Member goal: the hero card shows how many people have joined and how far that is toward the goal.
// The numbers come from GET /api/public/members ({ count, goal }). If they can't be fetched (the server is down, say) the card just states the goal (class "off").
(function () {
  var card = document.getElementById('goal');
  if (!card) return;
  var n = document.getElementById('goal-n'), target = document.getElementById('goal-target'), fill = document.getElementById('goal-fill'),
    track = document.getElementById('goal-track'), note = document.getElementById('goal-note');
  function fmt(v) { try { return v.toLocaleString(); } catch (e) { return String(v); } }

  function show(count, goal) {
    var pct = Math.min(100, count / goal * 100);
    target.textContent = fmt(goal);
    track.setAttribute('aria-valuemax', String(goal));
    track.setAttribute('aria-valuenow', String(Math.min(count, goal)));
    fill.style.width = (count > 0 ? Math.max(pct, 1.5) : 0) + '%'; // a sliver for the first few, so the bar is never mistaken for empty
    note.textContent = count >= goal ? 'We made it. Thank you for gathering with us.' : fmt(goal - count) + ' more to reach ' + fmt(goal) + '. Come be one of them.';
    var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (still || count < 2) { n.textContent = fmt(count); return; }
    var t0 = null;
    (function step(t) {
      if (t0 === null) t0 = t;
      var p = Math.min(1, (t - t0) / 900);
      n.textContent = fmt(Math.round(count * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(step);
    })(performance.now());
  }

  if (!window.fetch) { card.classList.add('off'); return; }
  var ctl = typeof AbortController === 'function' ? new AbortController() : null;
  var stop = ctl ? setTimeout(function () { ctl.abort(); }, 6000) : null; // a stopped server should not leave the card blank
  fetch(ADUNA.members, { headers: { Accept: 'application/json' }, signal: ctl ? ctl.signal : undefined })
    .then(function (r) { if (!r.ok) throw new Error('members ' + r.status); return r.json(); })
    .then(function (d) {
      var count = Math.floor(Number(d && d.count)), goal = Math.floor(Number(d && d.goal));
      if (!isFinite(count) || count < 0) throw new Error('bad count');
      if (!(goal > 0)) goal = 1000;
      show(count, goal);
    })
    .catch(function () { card.classList.add('off'); })
    .then(function () { if (stop) clearTimeout(stop); });
})();
