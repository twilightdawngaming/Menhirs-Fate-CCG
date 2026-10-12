// ---------------------------------------------------------------------------
// net.js — websocket transport for online duels
// ---------------------------------------------------------------------------
export const wsEndpoint = () => {
  const cfg = (typeof window !== 'undefined' && window.MF_CONFIG) || {};
  if (cfg.wsUrl) return cfg.wsUrl;
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${location.host}/ws`;
};

export function connect() {
  const ws = new WebSocket(wsEndpoint());
  const handlers = new Map();
  const queue = [];
  ws.addEventListener('open', () => { while (queue.length) ws.send(queue.shift()); });
  ws.addEventListener('message', (ev) => {
    let msg = null;
    try { msg = JSON.parse(ev.data); } catch (e) { return; }
    const list = handlers.get(msg.type) || [];
    for (const fn of list) fn(msg);
    for (const fn of handlers.get('*') || []) fn(msg);
  });
  return {
    ws,
    send(obj) { if (ws.readyState === 1) ws.send(JSON.stringify(obj)); else queue.push(JSON.stringify(obj)); },
    on(type, fn) { if (!handlers.has(type)) handlers.set(type, []); handlers.get(type).push(fn); return this; },
    close() { try { ws.close(); } catch (e) { /* ignore */ } },
  };
}
