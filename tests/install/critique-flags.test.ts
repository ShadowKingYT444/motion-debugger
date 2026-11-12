import test from 'node:test';
import assert from 'node:assert/strict';
import {parseSeverity,findingsAtOrAbove,severityCounts,githubAnnotations,imageToOpen,viewerCommand,openImage} from '../../packages/cli/critique-flags';
import type {CritiqueFinding} from '../../packages/core/critique';

const finding=(id:string,severity:CritiqueFinding['severity'],extra:Partial<CritiqueFinding>={}):CritiqueFinding=>({id,severity,area:'motion',title:`${id} title`,evidence:'Evidence.',fix:'Fix it.',...extra});
const findings=[finding('a','blocker'),finding('b','major'),finding('c','minor'),finding('d','polish')];

test('--fail-on accepts the four severities and rejects anything else',()=>{
  for(const severity of ['blocker','major','minor','polish'])assert.equal(parseSeverity(severity),severity);
  for(const bad of [undefined,'','critical','Major','--json'])assert.throws(()=>parseSeverity(bad),/blocker, major, minor, polish/);
});

test('--fail-on gates on findings at or above the threshold',()=>{
  assert.deepEqual(findingsAtOrAbove(findings,'blocker').map(f=>f.id),['a']);
  assert.deepEqual(findingsAtOrAbove(findings,'major').map(f=>f.id),['a','b']);
  assert.deepEqual(findingsAtOrAbove(findings,'minor').map(f=>f.id),['a','b','c']);
  assert.deepEqual(findingsAtOrAbove(findings,'polish').map(f=>f.id),['a','b','c','d']);
  assert.deepEqual(findingsAtOrAbove([finding('c','minor'),finding('d','polish')],'major'),[]);
  assert.deepEqual(findingsAtOrAbove([],'polish'),[]);
  assert.equal(severityCounts(findings),'1 blocker, 1 major, 1 minor, 1 polish');
});

test('--github maps severities to annotation levels and escapes workflow-command characters',()=>{
  const lines=githubAnnotations(findings);
  assert.deepEqual(lines.map(line=>line.split(' ')[0]),['::error','::error','::warning','::notice']);
  assert.equal(lines[0],'::error title=a::a title. Evidence. (fix: Fix it.)');
  const [tricky]=githubAnnotations([finding('x:y,z','minor',{title:'100% wide',evidence:'line one\r\nline two',fix:'a::b'})]);
  assert.equal(tricky,'::warning title=x%3Ay%2Cz::100%25 wide. line one%0D%0Aline two (fix: a::b)');
  assert.ok(!/[\r\n]/.test(tricky),'an annotation stays on one line');
  assert.deepEqual(githubAnnotations([]),[]);
});

test('--open picks the outlined defects first and uses each platform\'s viewer',()=>{
  assert.equal(imageToOpen({craft:'craft.png',desktopScroll:'desktop-scroll.png'}),'craft.png');
  assert.equal(imageToOpen({desktopScroll:'desktop-scroll.png',mobile:'mobile.png'}),'desktop-scroll.png');
  assert.equal(imageToOpen({mobile:'mobile.png'}),'mobile.png');
  assert.equal(imageToOpen({}),undefined);
  assert.deepEqual(viewerCommand('darwin','/tmp/a b.png'),{command:'open',args:['/tmp/a b.png'],verbatim:false});
  assert.deepEqual(viewerCommand('linux','/tmp/a b.png'),{command:'xdg-open',args:['/tmp/a b.png'],verbatim:false});
  assert.deepEqual(viewerCommand('win32','C:\\out dir\\craft.png'),{command:'cmd',args:['/c','start','""','"C:\\out dir\\craft.png"'],verbatim:true});
});

test('--open never fails the command when the viewer cannot start',()=>{
  const calls:unknown[][]=[];
  const fake=((command:string,args:string[],options:object)=>{calls.push([command,args,options]);return {on(){return this},unref(){}}}) as never;
  assert.equal(openImage('/tmp/craft.png','linux',fake),true);
  assert.deepEqual(calls[0].slice(0,2),['xdg-open',['/tmp/craft.png']]);
  assert.equal(openImage('/tmp/craft.png','linux',(()=>{throw new Error('spawn ENOENT')}) as never),false);
});
