import { readFile } from 'node:fs/promises';
import type {SourceRef,TraceEvent} from '../src/types';

export async function fixtureSources(root:string):Promise<Record<string,SourceRef>> {
  const file='src/fixture/Fixture.tsx';
  const lines=(await readFile(`${root}/${file}`,'utf8')).split('\n');
  const result:Record<string,SourceRef>={};
  const lengths:Record<string,number>={'mount-only-entrance':12,'cancel-on-unmount':6,'request-state':3,'render-key':3};
  for(const [key,count] of Object.entries(lengths)) {
    const index=lines.findIndex(line=>line.includes(`// SOURCE: ${key}`));
    if(index<0)throw new Error(`Missing source marker ${key}`);
    const start=index+1,end=Math.min(start+count,lines.length);
    result[key]={file,line:start+1,endLine:end,excerpt:lines.slice(start,end).join('\n'),label:key.replaceAll('-',' ')};
  }
  return result;
}
export function attachSources(events:TraceEvent[],sources:Record<string,SourceRef>) {
  for(const event of events) {
    const key=event.detail.sourceKey;
    if(typeof key==='string' && sources[key])event.source=sources[key];
    if(event.type==='animation-cancel')event.source=sources['cancel-on-unmount'];
    if(event.type==='animation-start')event.source=sources['mount-only-entrance'];
  }
}
