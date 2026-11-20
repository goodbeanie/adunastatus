// The only place the server addresses live.
window.ADUNA = {
  origin: 'https://aduna.dpdns.org',
  app: 'https://aduna.dpdns.org/app',
  health: 'https://aduna.dpdns.org/healthz',
  members: 'https://aduna.dpdns.org/api/public/members',
  source: 'https://github.com/goodbeanie/aduna',
  releases: 'https://github.com/goodbeanie/aduna/releases',
  retrySeconds: 5,
  // where the connecting page sends people once the server answers: connect.html?go=signup
  targets: { app: '/app', signup: '/app#signup', download: '/download' }
};
