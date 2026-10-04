import {createHash} from 'node:crypto';
import {lstat,readFile,realpath} from 'node:fs/promises';
import path from 'node:path';
import {validateTransitionPlan,type TransitionPlan} from './transitions';

export interface ProtectedDesignManifest {schemaVersion:1;files:{file:string;sha256:string;bytes:number}[]}
async function readOwned(root:string,file:string):Promise<Buffer> {
  if(!file || path.isAbsolute(file) || file.includes('\\') || file.split('/').some(part => !part || part === '.' || part === '..') || /^[a-zA-Z]:/.test(file) || file.split('/').some(part=>/^\.env(?:$|[._-])/.test(part)||['.aws','.ssh','.git','.codex','.claude','node_modules'].includes(part)))throw new Error('Expected project-relative file');
  const base=await realpath(root);let location=base;
  for(const part of file.split('/')) {location=path.join(location,part);if((await lstat(location)).isSymbolicLink())throw new Error('Design files cannot traverse symlinks');}
  const stat=await lstat(location);if(!stat.isFile()||stat.size>16*1024*1024)throw new Error('Expected ordinary design file below 16 MiB');
  const resolved=await realpath(location);if(!resolved.startsWith(base+path.sep))throw new Error('Design file escaped project root');
  const bytes=await readFile(location);if(bytes.length>16*1024*1024)throw new Error('Design file grew beyond 16 MiB');return bytes;
}
const hash=(bytes:Buffer)=>createHash('sha256').update(bytes).digest('hex');
/** Freeze exact protected bytes before normal host edits. Missing/unreadable files fail closed. */
export async function snapshotProtectedDesign(root:string,files:readonly string[]):Promise<ProtectedDesignManifest> {
  if(files.length>128||new Set(files).size!==files.length)throw new Error('Bounded unique protected files required');
  const records:ProtectedDesignManifest['files']=[];let total=0;
  for(const file of files){const bytes=await readOwned(root,file);total+=bytes.length;if(total>64*1024*1024)throw new Error('Protected design exceeds 64 MiB');records.push({file,sha256:hash(bytes),bytes:bytes.length});}
  return {schemaVersion:1,files:records};
}
export async function verifyProtectedDesign(root:string,manifest:ProtectedDesignManifest):Promise<{passed:boolean;changedFiles:string[]}> {
  if(manifest.schemaVersion!==1||manifest.files.length>128||new Set(manifest.files.map(item=>item.file)).size!==manifest.files.length)throw new Error('Invalid protected manifest');
  const changedFiles:string[]=[];
  for(const record of manifest.files){if(!/^[a-f0-9]{64}$/.test(record.sha256)||!Number.isInteger(record.bytes)||record.bytes<0)throw new Error('Invalid protected byte hash');try{const bytes=await readOwned(root,record.file);if(hash(bytes)!==record.sha256||bytes.length!==record.bytes)changedFiles.push(record.file);}catch{changedFiles.push(record.file);}}
  return {passed:changedFiles.length===0,changedFiles};
}
export interface AuthoringEvidence {captureId:string;eventId:string;frameSha256:string;mode:'native-replay'|'pose-preview'}
export interface MotionCandidate {
  id:string;role:'current'|'minimal-revision'|'alternative-staging';functional:'passed'|'failed'|'unverified';protectedDesign:'passed'|'failed'|'unverified';
  cost:{renderMs:number;reviewMs:number;decodeMs:number;failedAttemptMs:number;toolCalls:number;decodedFrames:number};
  evidence:AuthoringEvidence[];
}
export interface CandidateJudgment {candidateId:string;criterion:'meaning'|'response'|'trackability'|'visual-preference';reason:string;evidence:AuthoringEvidence[]}
export interface AuthoringSelection {status:'selected'|'abstained';candidateId?:string;reasons:string[];rejected:string[];cost:MotionCandidate['cost']}
/** Functional failures are eliminated before human/critic nominations. No summed aesthetic score. */
export function selectMotionCandidate(candidates:MotionCandidate[],judgments:CandidateJudgment[],nomination:string|null,budgetMs:number):AuthoringSelection {
  if(candidates.length<1||candidates.length>3||new Set(candidates.map(candidate=>candidate.id)).size!==candidates.length||new Set(candidates.map(candidate=>candidate.role)).size!==candidates.length||!candidates.some(candidate=>candidate.role==='current'))throw new Error('Up to three distinct candidates including current required');
  if(!Array.isArray(judgments)||judgments.length>12||judgments.some(judgment=>!['meaning','response','trackability','visual-preference'].includes(judgment.criterion)||typeof judgment.reason!=='string'||judgment.reason.length>1024||!Array.isArray(judgment.evidence)||judgment.evidence.length>12))throw new Error('Bounded separate criterion judgments required');
  if(!Number.isFinite(budgetMs)||budgetMs<=0)throw new Error('Positive total authoring budget required');
  const cost={renderMs:0,reviewMs:0,decodeMs:0,failedAttemptMs:0,toolCalls:0,decodedFrames:0};
  for(const candidate of candidates){if(!candidate.id||!['current','minimal-revision','alternative-staging'].includes(candidate.role)||!['passed','failed','unverified'].includes(candidate.functional)||!['passed','failed','unverified'].includes(candidate.protectedDesign))throw new Error('Invalid candidate');for(const key of Object.keys(cost) as (keyof typeof cost)[]){const value=candidate.cost[key];if(!Number.isFinite(value)||value<0||['toolCalls','decodedFrames'].includes(key)&&!Number.isInteger(value))throw new Error('Nonnegative measured candidate costs required');cost[key]+=value;}if(!Array.isArray(candidate.evidence)||candidate.evidence.length>12)throw new Error('Bounded candidate evidence required');for(const item of candidate.evidence)validateEvidence(item);}
  const rejected=candidates.filter(candidate=>candidate.functional!=='passed'||candidate.protectedDesign!=='passed').map(candidate=>candidate.id);
  const abstain=(reason:string):AuthoringSelection=>({status:'abstained',reasons:[reason],rejected,cost});
  if(cost.renderMs+cost.reviewMs+cost.decodeMs+cost.failedAttemptMs>budgetMs)return abstain('Total budget includes candidate renders, reviews, decoding and failed attempts');
  if(nomination===null)return abstain('No evidence-backed preference established; retain last verified checkpoint');
  const chosen=candidates.find(candidate=>candidate.id===nomination);
  if(!chosen||rejected.includes(nomination))return abstain('Nominated candidate failed or lacks functional/design verification');
  const cited=judgments.filter(judgment=>judgment.candidateId===nomination);
  if(!(['meaning','response','trackability','visual-preference'] as const).every(criterion=>cited.some(judgment=>judgment.criterion===criterion)))return abstain('Keep motion meaning, response, trackability and visual preference separate');
  const key=(item:AuthoringEvidence)=>JSON.stringify([item.captureId,item.eventId,item.frameSha256,item.mode]);
  const delivered=new Set(chosen.evidence.filter(item=>item.mode==='native-replay').map(key));
  for(const judgment of cited){if(!judgment.reason.trim()||!judgment.evidence.length)return abstain('Judgment lacks an event/frame explanation');for(const item of judgment.evidence){validateEvidence(item);if(!delivered.has(key(item)))return abstain('Judgment must cite actual delivered native event/frame evidence');}}
  return {status:'selected',candidateId:nomination,reasons:cited.map(judgment=>`${judgment.criterion}: ${judgment.reason}`),rejected,cost};
}
function validateEvidence(item:AuthoringEvidence){if(!item.captureId||!item.eventId||!/^[a-f0-9]{64}$/.test(item.frameSha256)||!['native-replay','pose-preview'].includes(item.mode))throw new Error('Actual capture/event and frame SHA-256 required');}
export interface VerifiedMotionCheckpoint {schemaVersion:1;candidateId:string;plan:TransitionPlan;protectedDesign:ProtectedDesignManifest;evidence:AuthoringEvidence[];files:{file:string;sha256:string;bytesBase64:string}[]}
/** Save recoverable authorized source bytes only after functional and protected-design checks. Host owns restoration. */
export async function createVerifiedMotionCheckpoint(root:string,input:TransitionPlan,candidate:MotionCandidate,manifest:ProtectedDesignManifest):Promise<VerifiedMotionCheckpoint> {
  const plan=validateTransitionPlan(input);
  if(candidate.functional!=='passed'||candidate.protectedDesign!=='passed'||!candidate.evidence.some(item=>item.mode==='native-replay'))throw new Error('Only native-verified functional candidates qualify for checkpoints');
  if(plan.edits.protectedFiles.some(file=>!manifest.files.some(record=>record.file===file)))throw new Error('Protected manifest misses plan files');
  if(!(await verifyProtectedDesign(root,manifest)).passed)throw new Error('Protected design changed; checkpoint rejected');
  candidate.evidence.forEach(validateEvidence);
  const files:VerifiedMotionCheckpoint['files']=[];let total=0;
  for(const file of plan.edits.permittedFiles){const bytes=await readOwned(root,file);total+=bytes.length;if(total>16*1024*1024)throw new Error('Checkpoint source exceeds 16 MiB');files.push({file,sha256:hash(bytes),bytesBase64:bytes.toString('base64')});}
  return {schemaVersion:1,candidateId:candidate.id,plan,protectedDesign:structuredClone(manifest),evidence:structuredClone(candidate.evidence),files};
}
