#!/usr/bin/env node
// Fixed LOOP study wrapper: trusted static snapshots, no install/build execution.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {ROOT,parseArgs,launchViewer} from './demo-ants.mjs';

export function parseLoopArgs(argv) {
  const options = parseArgs(argv);
  if (!argv.includes('--port')) options.port = 4121;
  return options;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const options = parseLoopArgs(process.argv.slice(2));
    if (options.help) console.log('node scripts/demo-loop.mjs [--port 0–65535]\nRead-only static frozen LOOP snapshots; default port 4121; no npm/build execution.');
    else {
      const viewer = await launchViewer(ROOT,options.port,{study:'loop-studio'});
      console.log(`LOOP study: ${viewer.origin}`);
      console.log(JSON.stringify(viewer.arms,null,2));
      let stopping = false;
      const stop = async () => {if(stopping)return;stopping=true;await viewer.close();process.exit();};
      process.on('SIGINT',stop);process.on('SIGTERM',stop);
    }
  } catch(error) {console.error(error.message);process.exitCode=1;}
}
