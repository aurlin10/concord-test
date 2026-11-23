// Usage: node call.mjs <kind> <session> <tool> <jsonArgsFile>
import { readFileSync } from 'node:fs';
import { startAgent } from './mcp.mjs';
const [kind, session, tool, argsFile] = process.argv.slice(2);
const repo = process.cwd();
const args = JSON.parse(readFileSync(argsFile, 'utf8').replace(/^ï»¿/, ''));
const a = startAgent(kind, session, repo);
await a.init();
const t0 = Date.now();
const r = await a.call(tool, args);
console.log(`[${kind}] ${tool} (${Date.now() - t0} ms)${r.isError ? ' ERROR' : ''}`);
console.log(r.text ?? JSON.stringify(r.error));
a.close();
process.exit(0);
