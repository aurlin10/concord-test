// Minimal MCP stdio client to drive concord-mcp as a given agent kind.
import { spawn } from 'node:child_process';

export function startAgent(kind, sessionId, repo) {
  const env = { ...process.env, CONCORD_AGENT_KIND: kind, CONCORD_REPO_ROOT: repo };
  // Session variables each harness normally sets; concord reads the one for its kind.
  if (kind === 'claude-code') env.CLAUDE_CODE_SESSION_ID = sessionId;
  if (kind === 'codex') env.CODEX_THREAD_ID = sessionId;
  const proc = spawn('cmd', ['/c', 'concord-mcp'], { cwd: repo, env, stdio: ['pipe', 'pipe', 'pipe'] });
  let buf = '';
  let nextId = 1;
  const pending = new Map();
  const stderr = [];
  proc.stdout.on('data', (d) => {
    buf += d.toString();
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (!line) continue;
      let msg;
      try { msg = JSON.parse(line); } catch { continue; }
      if (msg.id !== undefined && pending.has(msg.id)) {
        pending.get(msg.id)(msg);
        pending.delete(msg.id);
      }
    }
  });
  proc.stderr.on('data', (d) => stderr.push(d.toString()));
  const request = (method, params) =>
    new Promise((resolve, reject) => {
      const id = nextId++;
      const timer = setTimeout(() => reject(new Error(`timeout ${method}`)), 30000);
      pending.set(id, (m) => { clearTimeout(timer); resolve(m); });
      proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
    });
  const notify = (method, params) => proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n');
  return {
    kind,
    stderr,
    async init() {
      const r = await request('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: kind, version: '1' },
      });
      notify('notifications/initialized', {});
      return r;
    },
    listTools: () => request('tools/list', {}),
    async call(name, args) {
      const r = await request('tools/call', { name, arguments: args });
      if (r.error) return { error: r.error };
      return { isError: r.result.isError, text: r.result.content.map((c) => c.text).join('\n') };
    },
    close: () => proc.kill(),
  };
}
