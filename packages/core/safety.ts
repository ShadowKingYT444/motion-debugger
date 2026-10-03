import {realpath,readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {z} from 'zod';
import type {CaptureRecipe,CoreOptions} from './types';

const selector=z.string().min(1).max(300);
export const RecipeSchema=z.object({
  url:z.string().url().max(2000),selector,label:z.string().max(120).optional(),
  actions:z.array(z.discriminatedUnion('action',[
    z.object({action:z.literal('click'),selector}).strict(),z.object({action:z.literal('hover'),selector}).strict(),
    z.object({action:z.literal('key'),key:z.enum(['Escape','Enter','Space','Tab','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'])}).strict(),
    z.object({action:z.literal('move'),x:z.number().finite().min(0).max(1920),y:z.number().finite().min(0).max(1200)}).strict(),
    z.object({action:z.literal('scroll'),deltaY:z.number().int().min(-1200).max(1200)}).strict(),
    z.object({action:z.literal('wait'),ms:z.number().int().min(0).max(4000)}).strict()
  ])).max(16),
  durationMs:z.number().int().min(500).max(12000).optional(),
  viewport:z.object({width:z.number().int().min(320).max(1920),height:z.number().int().min(320).max(1200)}).strict().optional(),
  reducedMotion:z.enum(['reduce','no-preference']).optional(),
  contract:z.object({targetPresence:z.enum(['continuous','may-disappear']).optional(),maxFrameStepPx:z.number().positive().max(2000).optional(),maxStepAt60HzPx:z.number().positive().max(2000).optional(),maxSampleGapMs:z.number().min(16).max(1000).optional(),maxHeightStepPx:z.number().min(0).max(2000).optional(),maxOpacityDrop:z.number().min(0).max(1).optional(),maxReplacements:z.number().int().min(0).max(20).optional(),maxActiveCancels:z.number().int().min(0).max(50).optional(),containment:z.object({selector,shape:z.enum(['rect','circle']).optional(),maxOverflowPx:z.number().min(0).max(2000),minOpacity:z.number().min(0).max(1).optional()}).strict().optional(),final:z.object({selector:selector.optional(),attributes:z.record(z.string().refine(name=>(/^(data-|aria-)[a-z0-9-]+$/.test(name)||['open','disabled','hidden','role'].includes(name))&&!/private|secret|token|password|credential/i.test(name),'Use non-sensitive data-*/aria-* state attributes or open, disabled, hidden, role'),z.string().max(500)).optional(),textIncludes:z.string().max(500).optional(),visible:z.boolean().optional()}).strict().optional()}).strict().optional(),
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
  if(/(^|\/)(\.env[^/]*|\.aws|\.ssh|\.git|\.codex|node_modules)(\/|$)/.test(file)||! /\.(tsx?|jsx?|css|html)$/.test(file))throw new Error('Only ordinary web source files are accepted');
  if((await stat(file)).size>300000)throw new Error('Source file exceeds 300KB limit');
  const content=await readFile(file,'utf8');if(Buffer.byteLength(content)>300000)throw new Error('Source file exceeds 300KB limit');
  const lines=content.split('\n'),end=Math.min(ref.endLine ?? ref.line+8,ref.line+40);
  if(ref.line>lines.length||end<ref.line)throw new Error('Invalid source line range');
  return {...ref,file,excerpt:lines.slice(ref.line-1,end).join('\n')};
}
