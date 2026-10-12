// ---------------------------------------------------------------------------
// Runtime configuration. Served as-is by the Node server; the static build
// rewrites this file, and a host can set WS_URL to point at a duel server.
// ---------------------------------------------------------------------------
window.MF_CONFIG = {
  // e.g. 'wss://menhirs-duels.example.com/ws'. Empty string = same origin.
  wsUrl: '',
};
