import {realpath,readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {z} from 'zod';
import type {CaptureRecipe,CoreOptions} from './types';

const selector=z.string().min(1).max(300);
const ActorCommonSchema=z.object({
  id:z.string().min(1).max(80),
  acceptance:z.object({continuity:z.enum(['position','position-and-velocity','none']).optional(),inputPolicy:z.enum(['retarget','direct-scrub','cut']).optional(),maxStepAt60HzPx:z.number().positive().max(2000).optional(),maxVelocityChangePxPerMs:z.number().positive().max(1000).optional(),maxReplacements:z.number().int().min(0).max(20).optional(),destination:z.object({x:z.number().finite(),y:z.number().finite(),tolerancePx:z.number().min(0).max(2000),deadlineMs:z.number().min(0).max(12000),settleMs:z.number().min(0).max(4000).optional()}).strict().optional(),minTravelPx:z.number().min(0).max(10000).optional()}).strict().optional()
}).strict();
export const ActorBindingSchema=z.discriminatedUnion('kind',[ActorCommonSchema.extend({kind:z.enum(['dom','svg']),selector}).strict(),ActorCommonSchema.extend({kind:z.literal('scene')}).strict()]);
const outcomeAttributes=z.record(z.string().refine(name=>(/^(data-|aria-)[a-z0-9-]+$/.test(name)||['open','disabled','hidden','role'].includes(name))&&!/private|secret|token|password|credential/i.test(name),'Use non-sensitive observable state attributes'),z.string().max(500)).refine(value=>Object.keys(value).length>0&&Object.keys(value).length<=12,'Require 1–12 state attributes');
const outcomes=z.object({
  timeoutMs:z.number().int().min(1).max(12000).optional().describe('Deadline from capture START, including all actions and waits; not an extra post-action timeout. Omit to use durationMs. Positive checks run after actions, so leave time before this deadline.'),
  required:z.array(z.object({id:z.string().min(1).max(80),selector,attributes:outcomeAttributes.optional(),textIncludes:z.string().min(1).max(500).optional(),visible:z.boolean().optional()}).strict().refine(value=>value.visible!==undefined||value.textIncludes!==undefined||value.attributes!==undefined,'Require an observable condition')).min(1).max(12).refine(value=>new Set(value.map(item=>item.id)).size===value.length,'Outcome IDs must be unique'),
  forbiddenVisible:z.array(selector).max(12).optional()
}).strict();
export const RecipeSchema=z.object({
  url:z.string().url().max(2000),selector,label:z.string().max(120).optional(),
  actions:z.array(z.discriminatedUnion('action',[
    z.object({action:z.literal('click'),selector}).strict(),z.object({action:z.literal('hover'),selector}).strict(),
    z.object({action:z.literal('key'),key:z.enum(['Escape','Enter','Space','Tab','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'])}).strict(),
    z.object({action:z.literal('move'),x:z.number().finite().min(0).max(1920),y:z.number().finite().min(0).max(1200)}).strict(),
    z.object({action:z.literal('drag'),selector,points:z.array(z.object({x:z.number().finite().min(0).max(1),y:z.number().finite().min(0).max(1)}).strict()).min(2).max(12).describe('Ordered selector-relative coordinates in [0,1]; native pointer remains held through reversals. Border coordinates are inset half a CSS pixel.'),end:z.enum(['release','cancel']).optional().describe('Cancel uses a native held touch contact ending in pointercancel; default mouse drag releases normally.'),durationMs:z.number().int().min(100).max(2000).describe('Total held drag time, 100–2000ms, included in capture deadline.'),steps:z.number().int().min(2).max(60).optional().describe('Interpolation steps across the complete path; defaults to 24. Every supplied waypoint is visited, with at most 60 moves.')}).strict(),
    z.object({action:z.literal('scroll'),deltaY:z.number().int().min(-1200).max(1200)}).strict(),
    z.object({action:z.literal('resize'),width:z.number().int().min(320).max(1920),height:z.number().int().min(320).max(1200)}).strict(),
    z.object({action:z.literal('pointer-cancel')}).strict(),
    z.object({action:z.literal('reduced-motion'),value:z.enum(['reduce','no-preference'])}).strict(),
    z.object({action:z.literal('wait'),ms:z.number().int().min(0).max(4000).describe('Each wait is at most 4000ms; all waits total at most 10000ms. Leave room for actual input before the capture/outcome deadline.')}).strict()
  ])).max(16),
  durationMs:z.number().int().min(500).max(12000).optional().describe('Entire recorded interaction window, maximum 12000ms. Includes input and waits. Use ordinary browser tools for longer journeys.'),
  viewport:z.object({width:z.number().int().min(320).max(1920),height:z.number().int().min(320).max(1200)}).strict().optional(),
  reducedMotion:z.enum(['reduce','no-preference']).optional(),
  actors:z.array(ActorBindingSchema).max(24).refine(actors=>new Set(actors.map(actor=>actor.id)).size===actors.length,'Actor IDs must be unique').refine(actors=>actors.filter(actor=>actor.kind!=='scene').length<=8&&actors.filter(actor=>actor.kind==='scene').length<=16,'At most eight DOM/SVG and sixteen scene actors').optional(),
  contract:z.object({outcomes:outcomes.optional(),targetPresence:z.enum(['continuous','may-disappear']).optional(),maxFrameStepPx:z.number().positive().max(2000).optional(),maxStepAt60HzPx:z.number().positive().max(2000).optional(),maxSampleGapMs:z.number().min(16).max(1000).optional(),maxHeightStepPx:z.number().min(0).max(2000).optional(),maxOpacityDrop:z.number().min(0).max(1).optional(),maxReplacements:z.number().int().min(0).max(20).optional(),maxActiveCancels:z.number().int().min(0).max(50).optional(),containment:z.object({selector,shape:z.enum(['rect','circle']).optional(),maxOverflowPx:z.number().min(0).max(2000),minOpacity:z.number().min(0).max(1).optional()}).strict().optional(),final:z.object({selector:selector.optional(),attributes:z.record(z.string().refine(name=>(/^(data-|aria-)[a-z0-9-]+$/.test(name)||['open','disabled','hidden','role'].includes(name))&&!/private|secret|token|password|credential/i.test(name),'Use non-sensitive data-*/aria-* state attributes or open, disabled, hidden, role'),z.string().max(500)).optional(),textIncludes:z.string().max(500).optional(),visible:z.boolean().optional()}).strict().optional()}).strict().optional(),
  sourceRefs:z.record(z.string().max(80),z.object({file:z.string().max(500),line:z.number().int().positive(),endLine:z.number().int().positive().optional()}).strict()).optional()
}).strict();

export function validateLocalUrl(raw:string,allowedOrigins:string[]=[]):URL {
  const url=new URL(raw);
  if(!['http:','https:'].includes(url.protocol)||!['localhost','127.0.0.1','[::1]'].includes(url.hostname)||url.username||url.password)throw new Error('Only credential-free loopback HTTP(S) URLs are permitted');
  if([...url.searchParams.keys()].some(key=>/token|password|secret|authorization|api.?key/i.test(key)))throw new Error('Credential-like URL parameters are not accepted');
  if(allowedOrigins.length && !allowedOrigins.includes(url.origin))throw new Error(`Origin ${url.origin} is not in the configured local allowlist`);
  return url;
}
export function validateRecipe(value:unknown,options:CoreOptions):CaptureRecipe {
  const recipe=RecipeSchema.parse(value) as CaptureRecipe;
  validateLocalUrl(recipe.url,options.allowedOrigins);
  const waitTotal=recipe.actions.reduce((sum,action)=>sum+(action.action==='wait'?action.ms:0),0);
  if(waitTotal>10000)throw new Error('Recipe wait time must not exceed 10000ms');
  const viewport=recipe.viewport ?? {width:1440,height:960};
  for(const action of recipe.actions)if(action.action==='move'&&(action.x>viewport.width||action.y>viewport.height))throw new Error('Pointer coordinates must be inside the capture viewport');
  return recipe;
}
export async function readSourceRef(ref:{file:string;line:number;endLine?:number},sourceRoots:string[]) {
  if(!sourceRoots.length)throw new Error('Source references require explicitly configured read-only source roots');
  const file=await realpath(path.resolve(ref.file));
  const roots=await Promise.all(sourceRoots.map(root=>realpath(root)));
  if(!roots.some(root=>file===root||file.startsWith(root+path.sep)))throw new Error('Source reference escapes configured read-only roots');
  if(/(^|\/)(\.env[^/]*|\.aws|\.ssh|\.git|\.codex|node_modules)(\/|$)/.test(file)||! /\.(tsx?|jsx?|mjs|cjs|css|html)$/.test(file))throw new Error('Only ordinary web source files are accepted');
  if((await stat(file)).size>300000)throw new Error('Source file exceeds 300KB limit');
  const content=await readFile(file,'utf8');if(Buffer.byteLength(content)>300000)throw new Error('Source file exceeds 300KB limit');
  const lines=content.split('\n'),end=Math.min(ref.endLine ?? ref.line+8,ref.line+40);
  if(ref.line>lines.length||end<ref.line)throw new Error('Invalid source line range');
  return {...ref,file,sha256:createHash('sha256').update(content).digest('hex'),excerpt:lines.slice(ref.line-1,end).join('\n')};
}

/** Keep failed deadline captures observable while making impossible schedules explicit. */
export function recipeWarnings(recipe:CaptureRecipe):string[] {
  const deadline=Math.min(recipe.contract?.outcomes?.timeoutMs??recipe.durationMs??2400,recipe.durationMs??2400);
  const scheduled=recipe.actions.reduce((sum,action)=>sum+(action.action==='wait'?action.ms:action.action==='drag'?action.durationMs:0),0);
  return scheduled>=deadline?[`Scheduled waits and drags total ${scheduled}ms, at least the ${deadline}ms interaction/outcome deadline measured from capture start. Positive outcomes, when requested, are checked after actions; leave time for input and observation or use an ordinary browser for longer journeys.`]:[];
}
