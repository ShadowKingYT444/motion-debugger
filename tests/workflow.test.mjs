import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access, mkdtemp, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { validateWorkflow } from '../plugin/motion-debugger/workflows/validate.mjs';

const root = new URL('../', import.meta.url);
const pluginRoot = new URL('../plugin/motion-debugger/', import.meta.url);
const graph = JSON.parse(await readFile(new URL('workflows/build-inspect-repair.json', pluginRoot), 'utf8'));
const clone = () => structuredClone(graph);
function paths(value) {
  const nodes = new Map(value.nodes.map(node => [node.id, node]));
  const results = [];
  function walk(id, trail, repairs) {
    const node = nodes.get(id), sequence = [...trail, id];
    const attempts = repairs + (node.kind === 'repair' ? 1 : 0);
    if (node.kind === 'terminal') return;
    for (const edge of value.edges.filter(edge => edge.from === id)) {
      if (nodes.get(edge.to).kind === 'terminal') results.push({ sequence: [...sequence, edge.to], repairs: attempts, result: edge.result });
      else walk(edge.to, sequence, attempts);
    }
  }
  walk(value.entry, [], 0);
  return results;
}

test('shipped graph validates as a host-agent DAG with exactly two repair attempts', () => {
  assert.deepEqual(validateWorkflow(graph), {
    ok: true, id: 'motion-build-inspect-repair-bounded', nodes: 10, edges: 19,
    terminals: ['report', 'blockedreport'], maxRepairsOnPath: 2,
  });
  assert.equal(graph.runnerIncluded, false);
  assert.match(graph.policy.pass, /recorded intermediate frames/);
  assert.match(graph.policy.comparison, /original capture/);
  assert.match(graph.policy.authority, /authorized source/);
});

test('every route terminates, with early passes, exact blocker exits and bounded unresolved output', () => {
  const routes = paths(graph);
  assert.equal(routes.length, 12);
  for (const route of routes) {
    assert.equal(new Set(route.sequence).size, route.sequence.length, 'no node repeats');
    assert.ok(route.repairs <= 2);
    assert.ok(['report', 'blockedreport'].includes(route.sequence.at(-1)));
    if (route.result === 'passed') {
      assert.ok(route.sequence.includes('inspect'));
      for (let attempt = 1; attempt <= route.repairs; attempt++) assert.ok(route.sequence.includes(`verify${attempt}`));
    }
    if (route.result === 'unresolved') assert.equal(route.repairs, 2);
    if (route.result === 'blocked') assert.equal(route.sequence.at(-1), 'blockedreport');
  }
  assert.deepEqual(routes.filter(route => route.result === 'passed').map(route => route.repairs).sort(), [0, 1, 2]);
  assert.equal(routes.filter(route => route.result === 'unresolved').length, 1);
  for (const node of graph.nodes.filter(node => node.kind !== 'terminal')) {
    assert.ok(graph.edges.some(edge => edge.from === node.id && edge.outcome === 'blocked' && edge.to === 'blockedreport'));
  }
});

test('all shipped skill references and document links resolve', async () => {
  for (const node of graph.nodes) for (const reference of node.references ?? []) await access(new URL(reference, pluginRoot));
  const document = await readFile(new URL('docs/WORKFLOW.md', root), 'utf8');
  for (const match of document.matchAll(/\]\((\.\.\/[^)]+)\)/g)) await access(new URL(match[1], new URL('docs/WORKFLOW.md', root)));
});

test('Mermaid diagram has exactly the graph transitions and no hidden loop', async () => {
  const document = await readFile(new URL('docs/WORKFLOW.md', root), 'utf8');
  const diagram = /```mermaid\n([\s\S]*?)```/.exec(document)?.[1];
  assert.ok(diagram);
  const edges = [...diagram.matchAll(/^\s*(\w+)(?:\["[^"]+"\])? -->\|([^|]+)\| (\w+)(?:\["[^"]+"\])?$/gm)]
    .map(([, from, outcome, to]) => ({ from, outcome, to }));
  const key = edge => JSON.stringify([edge.from, edge.outcome, edge.to]);
  assert.deepEqual(edges.map(key).sort(), graph.edges.map(key).sort());
});

test('rejects missing entry, missing referenced node and duplicate nodes', () => {
  let value = clone(); value.entry = 'missing'; assert.throws(() => validateWorkflow(value), /missing entry node/);
  value = clone(); value.nodes = value.nodes.filter(node => node.id !== 'repair1'); assert.throws(() => validateWorkflow(value), /missing node/);
  value = clone(); value.nodes.push(structuredClone(value.nodes[0])); assert.throws(() => validateWorkflow(value), /duplicate node/);
});

test('rejects missing, duplicate and undeclared outcome transitions', () => {
  let value = clone(); value.edges.shift(); assert.throws(() => validateWorkflow(value), /missing transition/);
  value = clone(); value.edges.push(structuredClone(value.edges[0])); assert.throws(() => validateWorkflow(value), /duplicate transition/);
  value = clone(); value.edges[0].outcome = 'invented'; assert.throws(() => validateWorkflow(value), /undeclared outcome/);
  value = clone(); value.nodes[0].outcomes.push('complete'); assert.throws(() => validateWorkflow(value), /duplicate outcomes/);
});

test('rejects cycles including disconnected cycles', () => {
  let value = clone(); value.edges.find(edge => edge.from === 'verify1' && edge.outcome === 'repair_needed').to = 'repair1';
  assert.throws(() => validateWorkflow(value), /cycle/);
  value = clone();
  for (const id of ['extra1', 'extra2']) value.nodes.push({ id, kind: 'task', label: id, steps: ['Extra'], references: ['skills/motion-evidence/SKILL.md'], outcomes: ['next'] });
  value.edges.push({ from: 'extra1', outcome: 'next', to: 'extra2' }, { from: 'extra2', outcome: 'next', to: 'extra1' });
  assert.throws(() => validateWorkflow(value), /cycle/);
});

test('rejects unreachable terminals and unreachable work nodes', () => {
  let value = clone(); value.nodes.push({ id: 'lostreport', kind: 'terminal', label: 'Lost', steps: ['Report'], results: ['blocked'], outcomes: [] });
  assert.throws(() => validateWorkflow(value), /unreachable terminal/);
  value = clone(); value.nodes.push({ id: 'losttask', kind: 'task', label: 'Lost', steps: ['Work'], references: ['skills/motion-evidence/SKILL.md'], outcomes: ['blocked'] });
  value.edges.push({ from: 'losttask', outcome: 'blocked', to: 'blockedreport', result: 'blocked' });
  assert.throws(() => validateWorkflow(value), /unreachable node/);
});

test('rejects missing terminals, nonterminal sinks and outgoing terminal edges', () => {
  let value = clone(); value.nodes = value.nodes.filter(node => node.kind !== 'terminal'); assert.throws(() => validateWorkflow(value), /missing terminal/);
  value = clone(); value.nodes[0].outcomes = []; assert.throws(() => validateWorkflow(value), /nonterminal.*no outcomes/);
  value = clone(); value.edges.push({ from: 'report', outcome: 'complete', to: 'brief' }); assert.throws(() => validateWorkflow(value), /terminal.*outgoing/);
});

test('rejects incorrect terminal results or result tags on nonterminal edges', () => {
  let value = clone(); value.edges.find(edge => edge.outcome === 'pass').result = 'blocked'; assert.throws(() => validateWorkflow(value), /invalid terminal result/);
  value = clone(); value.edges[0].result = 'passed'; assert.throws(() => validateWorkflow(value), /nonterminal edge/);
});

test('rejects paths beyond the declared repair bound and invalid attempt numbering', () => {
  let value = clone(); value.maxRepairAttempts = 1; assert.throws(() => validateWorkflow(value), /repair path exceeds maxRepairAttempts/);
  value = clone(); value.maxRepairAttempts = 3; assert.throws(() => validateWorkflow(value), /node count must match/);
  value = clone(); value.nodes.find(node => node.id === 'repair2').attempt = 1; assert.throws(() => validateWorkflow(value), /consecutively numbered/);
  value = clone(); value.nodes.find(node => node.id === 'verify2').attempt = 1; assert.throws(() => validateWorkflow(value), /missing or duplicate verification/);
});

test('repair nodes cannot bypass their own verification', () => {
  const value = clone(); value.edges.find(edge => edge.from === 'repair1' && edge.outcome === 'repaired').to = 'verify2';
  // Keep verify1 reachable so this checks pairing rather than reachability.
  value.edges.find(edge => edge.from === 'inspect' && edge.outcome === 'repair_needed').to = 'verify1';
  value.edges.find(edge => edge.from === 'verify1' && edge.outcome === 'repair_needed').to = 'repair1';
  value.edges.find(edge => edge.from === 'repair1' && edge.outcome === 'blocked').to = 'repair2';
  delete value.edges.find(edge => edge.from === 'repair1' && edge.outcome === 'blocked').result;
  assert.throws(() => validateWorkflow(value), /must lead directly to its verification/);
});

test('validator rejects runner claims and unsafe or missing reference paths', () => {
  let value = clone(); value.runnerIncluded = true; assert.throws(() => validateWorkflow(value), /without a runner/);
  value = clone(); value.nodes[0].references = ['skills/../../secret']; assert.throws(() => validateWorkflow(value), /invalid references/);
  value = clone(); value.nodes[0].references = []; assert.throws(() => validateWorkflow(value), /invalid references/);
});

test('validator CLI works independently of the current directory', () => {
  const output = execFileSync(process.execPath, [fileURLToPath(new URL('workflows/validate.mjs', pluginRoot))], { cwd: '/tmp', encoding: 'utf8' });
  assert.equal(JSON.parse(output).maxRepairsOnPath, 2);
});

test('root npm package includes graph, validator, opt-in instructions and diagram', async t => {
  const cache = await mkdtemp(path.join(tmpdir(), 'motion-workflow-pack-'));
  t.after(() => rm(cache, { recursive: true, force: true }));
  const [packed] = JSON.parse(execFileSync('npm', ['pack', '--dry-run', '--ignore-scripts', '--json', '--cache', cache], { cwd: fileURLToPath(root), encoding: 'utf8' }));
  const files = new Set(packed.files.map(file => file.path));
  for (const file of ['plugin/motion-debugger/workflows/build-inspect-repair.json', 'plugin/motion-debugger/workflows/validate.mjs', 'plugin/motion-debugger/workflows/README.md', 'docs/WORKFLOW.md']) assert.ok(files.has(file), `${file} is packaged`);
});
