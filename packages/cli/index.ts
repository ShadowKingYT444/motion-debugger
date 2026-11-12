import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {createInterface} from 'node:readline/promises';
import {critique,critiqueMarkdown} from '../core/critique';
import {recordedFrames,capture,inspect,compact,compare,validateLocalUrl,validateRecipe,motionReview,motionProbe} from '../core/index';
import {exampleRecipes,type ExampleScenario} from '../../src/examples/recipes';
import {optionsFromEnvironment} from '../mcp/server';
import {clients,configText,init,installSkillsOnly,metadata,type Client,type InitOptions} from './config';
import {doctor,installBrowser} from './browser';
import {shouldUseInitWizard,prepareInitWizard,detectClient} from './wizard';
import {parseSeverity,findingsAtOrAbove,severityCounts,githubAnnotations,imageToOpen,openImage,type Severity} from './critique-flags';

const help=`Motion Debugger ${metadata.version} — temporal evidence for coding agents

  motion-debugger init [--client codex|claude-code|cursor|vscode|opencode] [--config path]
  motion-debugger init ... --skills [--project path] --apply [--confirm <preview-token>]
  motion-debugger skills install --client codex|claude-code|cursor|vscode|opencode [--project path]
  motion-debugger skills install ... --apply [--confirm <preview-token>]
  motion-debugger config [--client generic|codex|claude-code|cursor|vscode|opencode] [--local]
  motion-debugger setup --browser [--client <client>] [--config path]
  motion-debugger doctor [--skip-launch]
  motion-debugger demo [--port 4173] [--data-dir .motion-debugger/demo]
  motion-debugger recipe kinetic|drawer|reveal|cursor [--mode baseline|fixed] [--origin <loopback>]
  motion-debugger agents-md [--skills-dir .agents/skills]   print instructions for AGENTS.md/CLAUDE.md/GEMINI.md
  motion-debugger critique <url|index.html|folder> [--out dir] [--json] [--offline] [--desktop-only]
                           [--fail-on blocker|major|minor|polish] [--github] [--open]
  motion-debugger capture recipe.json
  motion-debugger review review.json
  motion-debugger probe probe.json
  motion-debugger frames <capture-id>
  motion-debugger inspect <capture-id>
  motion-debugger compare <before-id> <after-id>
  motion-debugger mcp

init previews an exact config diff; --skills includes the project skills and namespaced motion-debugger entry.
Skills never overwrite different existing folders. All writes require explicit approval. setup --browser
explicitly downloads Chromium. No postinstall, login, credentials or automatic config changes.
critique --fail-on exits 2 when a finding is at or above that severity (1 still means the page could not
be scanned). --github prints GitHub Actions annotations. --open shows the first image in an interactive terminal.
Config defaults to the exact npm package version. --local uses this installation's absolute path.
Review recipes can bind stable DOM/SVG actors, complete orientation/anchor phases, terminal or
waypoint holds, and versioned beat-to-action indexes. Unsupported or insufficient evidence stays unverified.
Config flags: --origin <loopback-origin>, --artifact-dir <path>, --source-root <path> (repeatable)
Environment: MOTION_ARTIFACT_DIR, MOTION_ALLOWED_ORIGINS, MOTION_SOURCE_ROOTS, CHROMIUM_PATH`;
const [command,...args]=process.argv.slice(2);
export function agentsMarkdown(skillsDir?:string) {
  const skill=skillsDir?`\`${skillsDir.replace(/\/$/,'')}/premium-motion/SKILL.md\``:'the premium-motion skill (installed with `motion-debugger skills install`, or bundled in the motion-debugger package under plugin/motion-debugger/skills/premium-motion)';
  return `## Motion Debugger\n\nFor any web page, UI or animation work in this project, read and follow ${skill} before writing code. It has commands such as \`upgrade\` (vibe-coded to premium), \`audit\`, \`motion\`, \`signature\` and \`polish\`. Review the rendered result with \`motion-debugger critique <folder-or-local-url>\` (or the \`motion_critique\` MCP tool), open the images it writes (craft.png first), fix what they show, and critique again before you finish.\n`;
}
function configOptions(input:string[]):InitOptions {
  const options:InitOptions={client:'generic'};
  for(let i=0;i<input.length;i++) {
    const flag=input[i];
    if(flag==='--local'){options.local=true;continue}if(flag==='--apply'){options.apply=true;continue}if(flag==='--skills'){options.skills=true;continue}
    if(!['--client','--config','--origin','--artifact-dir','--source-root','--confirm','--project'].includes(flag))throw new Error(`Unknown option: ${flag}`);
    const value=input[++i];if(!value||value.startsWith('--'))throw new Error(`${flag} requires a value`);
    if(flag==='--client'){if(!(clients as readonly string[]).includes(value))throw new Error(`Unsupported client ${value}; choose ${clients.join(', ')}`);options.client=value as Client}
    if(flag==='--project')options.project=value;if(flag==='--config')options.config=value;if(flag==='--origin')options.origin=value;if(flag==='--artifact-dir')options.artifactDir=value;
    if(flag==='--source-root')(options.sourceRoots??=[]).push(value);if(flag==='--confirm')options.confirm=value;
  }
  return options;
}
try {
  let result:unknown;
  if(!command||['--help','-h','help'].includes(command)){console.log(help)}
  else if(['--version','-v'].includes(command)){console.log(metadata.version)}
  else if(command==='init'){
    let options=configOptions(args);
    if(shouldUseInitWizard(args,!!process.stdin.isTTY&&!!process.stdout.isTTY)) {
      const input=createInterface({input:process.stdin,output:process.stdout});
      let downloadBrowser=false;
      try {const plan=await prepareInitWizard(options,question=>input.question(question),await detectClient(options.project??process.cwd()));options=plan.options;downloadBrowser=plan.downloadBrowser}finally{input.close()}
      if(downloadBrowser)await installBrowser();
      else console.error('Browser download skipped. Run motion-debugger doctor before capturing; motion-debugger setup --browser installs Chromium explicitly');
    }
    await init(options)
  }
  else if(command==='skills'){if(args[0]!=='install')throw new Error('Use skills install --client <client> [--project path]');const options=configOptions(args.slice(1));if(options.skills)throw new Error('skills install does not accept --skills');await installSkillsOnly(options)}
  else if(command==='config'){const options=configOptions(args);if(options.apply||options.confirm||options.config||options.skills||options.project)throw new Error('config only prints a fresh configuration; use init to preview/merge a destination');process.stdout.write(configText(options))}
  else if(command==='setup') {
    const browser=args.includes('--browser');const remaining=args.filter(arg=>arg!=='--browser');const options=configOptions(remaining);
    if(browser)await installBrowser();
    if(remaining.length){if(process.stdin.isTTY&&process.stdout.isTTY)options.apply=true;await init(options);}
    if(!browser&&!remaining.length)console.log('Choose setup --browser to explicitly install Chromium, or init --client <client> to preview agent configuration');
  }else if(command==='doctor') {
    if(args.some(arg=>arg!=='--skip-launch'))throw new Error('doctor accepts only --skip-launch');result=await doctor(args.includes('--skip-launch'));if(!(result as {ok:boolean}).ok)process.exitCode=1;
  }else if(command==='demo') {
    let port=4173,dataDir=path.resolve('.motion-debugger/demo');
    for(let i=0;i<args.length;i++){const flag=args[i],value=args[++i];if(!value||value.startsWith('--'))throw new Error(`${flag} requires a value`);if(flag==='--port')port=Number(value);else if(flag==='--data-dir')dataDir=path.resolve(value);else throw new Error(`Unknown option: ${flag}`)}
    const {startDemo}=await import('./demo');await startDemo({port,dataDir});
  }else if(command==='mcp') {
    if(args.length)throw new Error('mcp takes no arguments; configure its environment');const {createMotionServer}=await import('../mcp/server');const {StdioServerTransport}=await import('@modelcontextprotocol/sdk/server/stdio.js');await createMotionServer().connect(new StdioServerTransport());
  }else if(command==='recipe') {
    const [scenario,...flags]=args;
    if(!['kinetic','drawer','reveal','cursor'].includes(scenario))throw new Error('recipe requires kinetic, drawer, reveal, or cursor');
    let mode='baseline',origin='http://127.0.0.1:4173';
    for(let i=0;i<flags.length;i++){const flag=flags[i],value=flags[++i];if(!value||value.startsWith('--'))throw new Error(`${flag} requires a value`);if(flag==='--mode')mode=value;else if(flag==='--origin')origin=value;else throw new Error(`Unknown option: ${flag}`)}
    if(!['baseline','fixed'].includes(mode))throw new Error('--mode must be baseline or fixed');
    const url=validateLocalUrl(origin);if(url.origin!==origin)throw new Error('--origin must be an exact loopback origin');
    const recipe=exampleRecipes(origin)[scenario as ExampleScenario][mode==='baseline'?'before':'after'];
    // Annotated sources are opt-in; a consumer need not grant any source-file access.
    delete recipe.sourceRefs;result=validateRecipe(recipe,{artifactRoot:'.motion-evidence'});
  }else if(command==='capture') {
    if(args.length!==1)throw new Error('capture requires exactly one recipe JSON path');const recipe=JSON.parse(await readFile(path.resolve(args[0]),'utf8'));result=compact(await capture(recipe,optionsFromEnvironment()));
  }else if(command==='review'||command==='probe') {
    if(args.length!==1)throw new Error(`${command} requires exactly one request JSON path`);
    const request=JSON.parse(await readFile(path.resolve(args[0]),'utf8'));
    if(command==='review')result=(await motionReview(request,optionsFromEnvironment())).metadata;else result=await motionProbe(request,optionsFromEnvironment());
  }else if(command==='frames') {
    if(args.length!==1)throw new Error('frames requires exactly one capture UUID');
    const strip=await recordedFrames(args[0],optionsFromEnvironment());result={...strip,frames:strip.frames.map(({png,...frame})=>frame)};
  }else if(command==='inspect') {
    if(args.length!==1)throw new Error('inspect requires exactly one capture UUID');result=compact(await inspect(args[0],optionsFromEnvironment()));
  }else if(command==='agents-md') {
    // Provider-neutral standing instructions: append to AGENTS.md, CLAUDE.md, GEMINI.md, .cursorrules, etc.
    const dir=args[0]==='--skills-dir'?args[1]:undefined;if(args.length&&!dir)throw new Error('agents-md accepts only --skills-dir <path>');
    process.stdout.write(agentsMarkdown(dir));
  }else if(command==='critique') {
    let target:string|undefined,outDir:string|undefined,json=false,offline=false,github=false,open=false,failOn:Severity|undefined;const viewports:Array<'desktop'|'mobile'>=['desktop','mobile'];
    for(let i=0;i<args.length;i++){const flag=args[i];if(flag==='--out'){outDir=args[++i];if(!outDir)throw new Error('--out requires a directory')}else if(flag==='--json')json=true;else if(flag==='--offline')offline=true;else if(flag==='--desktop-only')viewports.splice(1);else if(flag==='--fail-on')failOn=parseSeverity(args[++i]);else if(flag==='--github')github=true;else if(flag==='--open')open=true;else if(flag.startsWith('--'))throw new Error(`Unknown option: ${flag}`);else if(target)throw new Error('critique accepts one URL or path');else target=flag}
    if(json&&github)throw new Error('Use --json or --github, not both');
    if(!target)throw new Error('critique requires a loopback URL, an HTML file or a folder containing index.html');
    const report=await critique(target,{outDir,offline,viewports,allowedOrigins:optionsFromEnvironment().allowedOrigins});
    const reportDir=outDir?path.resolve(outDir):path.dirname(Object.values(report.images)[0]??'.');
    if(json)result=report;
    else if(github)process.stdout.write([...githubAnnotations(report.findings),`Motion critique: ${report.grade} (${report.score}/100), ${severityCounts(report.findings)}`,`Full report: ${path.join(reportDir,'report.json')}`].join('\n')+'\n');
    else process.stdout.write(critiqueMarkdown(report,reportDir)+`\nFull report: ${path.join(reportDir,'report.json')}\n`);
    // Only for a person at a terminal; agents and CI read the paths from the report.
    if(open&&process.stdout.isTTY){const image=imageToOpen(report.images);if(image)openImage(path.isAbsolute(image)?image:path.join(reportDir,image))}
    if(failOn){const failing=findingsAtOrAbove(report.findings,failOn);if(failing.length){console.error(`--fail-on ${failOn}: ${failing.length} finding(s) at or above ${failOn} (${failing.map(finding=>finding.id).join(', ')})`);process.exitCode=2}}
  }else if(command==='compare') {
    if(args.length!==2)throw new Error('compare requires before and after capture UUIDs');result=compare(await inspect(args[0],optionsFromEnvironment()),await inspect(args[1],optionsFromEnvironment()));
  }else throw new Error(`Unknown command: ${command}. Run motion-debugger --help`);
  if(result!==undefined)console.log(JSON.stringify(result,null,2));
}catch(error){console.error(error instanceof Error?error.message:String(error));process.exitCode=1}
