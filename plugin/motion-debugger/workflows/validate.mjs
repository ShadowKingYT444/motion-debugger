#!/usr/bin/env node
// Validate a declarative plan. This module neither runs nodes nor edits source.
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const fail = message => { throw new Error(`Invalid workflow: ${message}`); };
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
function strings(values, label) {
  if (!Array.isArray(values) || values.some(value => !nonempty(value))) fail(`${label} must be a string array`);
  if (new Set(values).size !== values.length) fail(`duplicate ${label}`);
}

export function validateWorkflow(graph) {
  if (!graph || graph.schemaVersion !== 1 || !nonempty(graph.id)) fail('missing supported schemaVersion or id');
  if (graph.execution !== 'host-agent' || graph.runnerIncluded !== false) fail('must declare host-agent execution without a runner');
  if (graph.referenceBase !== 'plugin-root') fail('references must be plugin-root relative');
  if (!Number.isInteger(graph.maxRepairAttempts) || graph.maxRepairAttempts < 0) fail('invalid maxRepairAttempts');
  if (graph.authoring !== undefined) {
    const authoring = graph.authoring;
    if (!authoring || !Number.isInteger(authoring.maxCandidates) || authoring.maxCandidates < 1 || authoring.maxCandidates > 3) fail('authoring requires at most three candidates');
    for (const key of ['functionalFirst','protectedByteHashesRequired','nativeEventFrameEvidenceRequired','abstentionAllowed','lastVerifiedCheckpointRequired']) if (authoring[key] !== true) fail(`authoring requires ${key}`);
    if (authoring.posePreviewMayEstablishTiming !== false) fail('pose preview cannot establish native timing');
    for (const [key, expected] of Object.entries({roles:['current','minimal-revision','alternative-staging'],criteria:['meaning','response','trackability','visual-preference'],costIncludes:['candidate-rendering','review','decoding','failed-attempts']})) {
      strings(authoring[key], `authoring ${key}`);
      if (JSON.stringify([...authoring[key]].sort()) !== JSON.stringify([...expected].sort())) fail(`invalid authoring ${key}`);
    }
  }
  if (!Array.isArray(graph.nodes) || !graph.nodes.length || !Array.isArray(graph.edges)) fail('missing nodes or edges');
  const nodes = new Map(), outgoing = new Map();
  for (const node of graph.nodes) {
    if (!node || !nonempty(node.id) || !nonempty(node.label)) fail('missing node id or label');
    if (nodes.has(node.id)) fail(`duplicate node ${node.id}`);
    if (!['task', 'inspection', 'repair', 'verification', 'terminal'].includes(node.kind)) fail(`invalid kind at ${node.id}`);
    strings(node.outcomes, `outcomes at ${node.id}`);
    strings(node.steps, `steps at ${node.id}`);
    if (!node.steps.length) fail(`missing steps at ${node.id}`);
    if (node.kind === 'terminal') {
      strings(node.results, `terminal results at ${node.id}`);
      if (node.outcomes.length || !node.results.length) fail(`invalid terminal ${node.id}`);
    } else {
      if (!node.outcomes.length) fail(`nonterminal ${node.id} has no outcomes`);
      strings(node.references, `references at ${node.id}`);
      if (!node.references.length || node.references.some(ref => !ref.startsWith('skills/') || ref.split('/').includes('..') || ref.includes('\\'))) fail(`invalid references at ${node.id}`);
    }
    if (['repair', 'verification'].includes(node.kind) && (!Number.isInteger(node.attempt) || node.attempt < 1)) fail(`invalid attempt at ${node.id}`);
    nodes.set(node.id, node); outgoing.set(node.id, []);
  }
  if (!nodes.has(graph.entry)) fail(`missing entry node ${graph.entry}`);
  const terminals = graph.nodes.filter(node => node.kind === 'terminal');
  if (!terminals.length) fail('missing terminal node');
  const transitions = new Set();
  for (const edge of graph.edges) {
    if (!edge || !nodes.has(edge.from) || !nodes.has(edge.to)) fail('edge references a missing node');
    const source = nodes.get(edge.from), target = nodes.get(edge.to);
    if (source.kind === 'terminal') fail(`terminal ${source.id} has an outgoing edge`);
    if (!source.outcomes.includes(edge.outcome)) fail(`undeclared outcome at ${edge.from}`);
    const key = JSON.stringify([edge.from, edge.outcome]);
    if (transitions.has(key)) fail(`duplicate transition for ${edge.from}/${edge.outcome}`);
    transitions.add(key);
    if (target.kind === 'terminal') {
      if (!target.results.includes(edge.result)) fail(`invalid terminal result for ${edge.from}/${edge.outcome}`);
    } else if (edge.result !== undefined) fail(`nonterminal edge ${edge.from}/${edge.outcome} has a result`);
    outgoing.get(edge.from).push(edge);
  }
  for (const node of graph.nodes) for (const outcome of node.outcomes) {
    if (!transitions.has(JSON.stringify([node.id, outcome]))) fail(`missing transition for ${node.id}/${outcome}`);
  }
  // Check every component, not only the entry's component, before reachability.
  const visiting = new Set(), visited = new Set(), order = [];
  function visit(id) {
    if (visiting.has(id)) fail(`cycle at ${id}`);
    if (visited.has(id)) return;
    visiting.add(id);
    for (const edge of outgoing.get(id)) visit(edge.to);
    visiting.delete(id); visited.add(id); order.push(id);
  }
  for (const id of nodes.keys()) visit(id);
  const reachable = new Set();
  function reach(id) { if (reachable.has(id)) return; reachable.add(id); for (const edge of outgoing.get(id)) reach(edge.to); }
  reach(graph.entry);
  for (const node of graph.nodes) if (!reachable.has(node.id)) fail(`unreachable ${node.kind === 'terminal' ? 'terminal' : 'node'} ${node.id}`);
  const longest = new Map();
  for (const id of order) {
    const tails = outgoing.get(id);
    // In a finite DAG, every nonterminal path must end in a terminal.
    if (!tails.length && nodes.get(id).kind !== 'terminal') fail(`path cannot reach a terminal from ${id}`);
    longest.set(id, (nodes.get(id).kind === 'repair' ? 1 : 0) + (tails.length ? Math.max(...tails.map(edge => longest.get(edge.to))) : 0));
  }
  const maxRepairsOnPath = longest.get(graph.entry);
  if (maxRepairsOnPath > graph.maxRepairAttempts) fail(`repair path exceeds maxRepairAttempts (${maxRepairsOnPath} > ${graph.maxRepairAttempts})`);
  const repairs = graph.nodes.filter(node => node.kind === 'repair');
  const verifications = graph.nodes.filter(node => node.kind === 'verification');
  if (repairs.length !== graph.maxRepairAttempts || verifications.length !== repairs.length) fail('repair/verification node count must match maxRepairAttempts');
  for (const [index, repair] of [...repairs].sort((a, b) => a.attempt - b.attempt).entries()) {
    if (repair.attempt !== index + 1) fail('repair attempts must be unique and consecutively numbered');
    const peers = verifications.filter(node => node.attempt === repair.attempt);
    if (peers.length !== 1) fail(`missing or duplicate verification for repair ${repair.attempt}`);
    const next = outgoing.get(repair.id).filter(edge => edge.outcome === 'repaired');
    if (next.length !== 1 || next[0].to !== peers[0].id) fail(`repair ${repair.attempt} must lead directly to its verification`);
  }
  return { ok: true, id: graph.id, nodes: nodes.size, edges: graph.edges.length, terminals: terminals.map(node => node.id), maxRepairsOnPath };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const graph = JSON.parse(await readFile(new URL('./build-inspect-repair.json', import.meta.url), 'utf8'));
  console.log(JSON.stringify(validateWorkflow(graph), null, 2));
}
