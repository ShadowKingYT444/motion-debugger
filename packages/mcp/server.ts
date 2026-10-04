import {McpServer,ResourceTemplate} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {readdir} from 'node:fs/promises';
import path from 'node:path';
import {capture,inspect,compact,compare,RecipeSchema,validateLocalUrl,recordedFrames,motionCatalog,motionRecipe} from '../core/index';
import {CaptureFailureError} from '../core/capture';
import type {CoreOptions} from '../core/types';

export function optionsFromEnvironment():CoreOptions {
  const allowedOrigins=(process.env.MOTION_ALLOWED_ORIGINS??'').split(',').map(value=>value.trim()).filter(Boolean);
  for(const origin of allowedOrigins){const url=validateLocalUrl(origin);if(url.origin!==origin)throw new Error('MOTION_ALLOWED_ORIGINS must contain exact loopback origins')}
  return {artifactRoot:path.resolve(process.env.MOTION_ARTIFACT_DIR??'.motion-evidence'),allowedOrigins,sourceRoots:(process.env.MOTION_SOURCE_ROOTS??'').split(path.delimiter).filter(Boolean).map(root=>path.resolve(root))};
}
export function createMotionServer(options=optionsFromEnvironment()) {
  const server=new McpServer({name:'motion-debugger',version:'0.5.0'}, {instructions:'Help create and refine the requested animated interface. Read motion_recipe for concrete interactive patterns when useful. Capture the local preview with meaningful task outcomes, inspect the whole journey and details with motion_frames, then compare repairs under the same recipe. Functional completion, visual quality and temporal integrity are separate results. Interactions can change app state: get appropriate user authorization. No credentials, arbitrary shell, source edits, or external origins. Contracts are caller expectations, not universal quality scores. Return compact findings and evidence paths; use resources for full trace. Do not claim LLM improvement from detector ablation.'});
  const result=(data:unknown)=>({content:[{type:'text' as const,text:JSON.stringify(data,null,2)}],structuredContent:data as Record<string,unknown>});
  const protect=(handler:(args:any,extra?:any)=>Promise<unknown>)=>async(args:any,extra?:any)=>{
    try{return result(await handler(args,extra))}catch(error){if(error instanceof CaptureFailureError)return {...result(compact(error.evidence)),isError:true};return {isError:true,content:[{type:'text' as const,text:error instanceof Error?error.message.split('\n')[0]:String(error)}]}}
  };
  server.registerTool('motion_recipe',{title:'Find runnable motion recipes',description:'Read the bundled original interactive motion catalog or one complete recipe by ID. Returns runnable source, integration guidance and evidence requirements for spring retargeting, scroll choreography, articulated 3D colonies, task handoffs, elapsed-time sequences and drawers. No network, arbitrary file access, installation or source edits. Adapt to the user’s brief, then verify the real result.',inputSchema:{id:z.string().min(1).max(64).optional()},annotations:{readOnlyHint:true,openWorldHint:false}},protect(async({id})=>id?motionRecipe(id):{recipes:motionCatalog()}));
  server.registerTool('motion_capture',{title:'Capture local motion evidence',description:'Run an explicit bounded click/hover/key/pointer/scroll recipe against a caller-chosen loopback URL and CSS target. Scroll deltas are limited to ±1200 pixels per action. Fresh browser; may change local app state. Saves actual WebM, screenshots and temporal evidence. Never imports credentials or edits code.',inputSchema:{recipe:RecipeSchema},annotations:{readOnlyHint:false,destructiveHint:true,openWorldHint:false}},protect(async({recipe},extra)=>compact(await capture(recipe,{...options,signal:extra?.signal}))));
  server.registerTool('motion_inspect',{title:'Inspect a motion capture',description:'Return compact measured contracts, findings, final state and artifact paths. Optionally return selected events and a bounded sample window; no arbitrary file reads.',inputSchema:{captureId:z.string().uuid(),fromMs:z.number().min(0).optional(),toMs:z.number().min(0).optional(),includeSamples:z.boolean().optional()},annotations:{readOnlyHint:true,openWorldHint:false}},protect(async({captureId,fromMs,toMs,includeSamples})=>{
    const report=await inspect(captureId,options);
    return {...compact(report),events:report.events.filter(event=>(fromMs===undefined||event.t>=fromMs)&&(toMs===undefined||event.t<=toMs)).slice(0,100),...(includeSamples?{samples:report.samples.filter(sample=>(fromMs===undefined||sample.t>=fromMs)&&(toMs===undefined||sample.t<=toMs)).slice(0,120)}:{})};
  }));
  server.registerTool('motion_compare',{title:'Compare before/after motion evidence',description:'Compare measured temporal contracts and final state across two captures. Reports evidence deltas, not automated repair or an LLM benchmark.',inputSchema:{beforeId:z.string().uuid(),afterId:z.string().uuid()},annotations:{readOnlyHint:true,openWorldHint:false}},protect(async({beforeId,afterId})=>compare(await inspect(beforeId,options),await inspect(afterId,options))));
  server.registerTool('motion_frames',{title:'See recorded motion frames',description:'Return up to six actual recorded-video frames as native MCP images. Choose journey to cover the full capture, or finding for a defect window. Detail bounds preserve aspect ratio and report downscaling; up to 1280×960. No rerendering, arbitrary paths or external URLs. Video-time alignment is approximate; use the trace for precise metrics.',inputSchema:{captureId:z.string().uuid(),timestampsMs:z.array(z.number().finite().min(0).max(12000)).min(1).max(6).optional(),selection:z.enum(['finding','journey']).optional(),maxWidth:z.number().int().min(120).max(1280).optional(),maxHeight:z.number().int().min(120).max(960).optional()},annotations:{readOnlyHint:true,openWorldHint:false}},async({captureId,timestampsMs,selection,maxWidth,maxHeight},extra)=>{
    try {
      const captured=await recordedFrames(captureId,{...options,signal:extra?.signal},timestampsMs,{selection,maxWidth,maxHeight});
      const metadata={...captured,frames:captured.frames.map(({png,...frame})=>frame)};
      const content:Array<{type:'text';text:string}|{type:'image';mimeType:'image/png';data:string}>=[{type:'text',text:JSON.stringify(metadata,null,2)}];
      for(const frame of captured.frames){content.push({type:'text',text:`Capture ${frame.captureTimeMs}ms; recorded video seek ${frame.videoSeekMs}ms (approximate alignment)`},{type:'image',mimeType:'image/png',data:frame.png.toString('base64')})}
      return {content,structuredContent:metadata};
    }catch(error){return {isError:true,content:[{type:'text' as const,text:error instanceof Error?error.message.split('\n')[0]:String(error)}]}}
  });
  server.registerTool('motion_list',{title:'List local motion captures',description:'List IDs from this server’s configured evidence directory; does not search arbitrary files.',inputSchema:{},annotations:{readOnlyHint:true,openWorldHint:false}},protect(async()=>{
    const ids=await readdir(options.artifactRoot).catch(()=>[]);const reports=[];
    for(const id of ids.filter(id=>/^[a-f\d-]{36}$/.test(id)).slice(-100))try{const report=await inspect(id,options);reports.push({id:report.id,label:report.recipe.label,createdAt:report.createdAt,status:report.status??'complete',passed:report.status!=='incomplete'&&report.assertions.every(a=>a.passed)})}catch{}
    return {captures:reports};
  }));
  server.registerResource('motion-capture',new ResourceTemplate('motion-evidence://capture/{captureId}',{list:undefined}),{description:'Full exported temporal evidence for a capture. Application marks and supplied source refs are annotations, not inferred source attribution.',mimeType:'application/json'},async(uri,{captureId})=>({contents:[{uri:uri.href,mimeType:'application/json',text:JSON.stringify(await inspect(String(captureId),options),null,2)}]}));
  server.registerResource('motion-guide','motion-evidence://guide',{title:'Motion evidence workflow',mimeType:'text/plain'},async uri=>({contents:[{uri:uri.href,text:'1. Define URL, target and bounded interactions. 2. Set explicit continuity/height/containment/final-state contracts. 3. motion_capture baseline; inspect events near findings and use motion_frames for actual recorded images. 4. Edit code using your normal approved coding workflow. 5. motion_capture after with same recipe and contracts. 6. motion_compare; preserve final state. Static screenshots can miss transient defects. Cancellation alone does not prove a defect. Optional source refs require read-only roots configured by the server owner.'}]}));
  return server;
}
