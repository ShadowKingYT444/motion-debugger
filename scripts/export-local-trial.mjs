// Preserve the full actual recording of each first completed final recipe.
import {readFile,readdir,mkdir,writeFile,copyFile} from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const root=process.cwd(),media=path.join(root,'docs/assets/workflow-mono-20261003');await mkdir(media,{recursive:true});
const manifest=[];
for(const arm of ['control','treatment']){
 const directory=path.join(root,'artifacts/final-recordings',arm),reports=[];
 for(const id of await readdir(directory))try{reports.push(JSON.parse(await readFile(path.join(directory,id,'report.json'),'utf8')))}catch{}
 if(reports.length!==3)throw new Error(`${arm}: need exactly three completed final recordings`);
 reports.sort((a,b)=>['story','configuration','cart'].findIndex(x=>a.recipe.label.includes(x))-['story','configuration','cart'].findIndex(x=>b.recipe.label.includes(x)));
 const parts=[];
 for(const [index,report]of reports.entries()){
  const part=path.join(root,'artifacts',`${arm}-export-${index}.mp4`),label=`${arm==='control'?'ORDINARY':'MOTION'} / GPT-6-LUNA MAX / ${['STORY','FINISH','BAG THROUGH REMOVAL'][index]}`;
  const result=spawnSync('ffmpeg',['-loglevel','error','-y','-threads','1','-i',report.artifacts.video,'-filter_threads','1','-vf',`pad=iw:ih+28:0:28:color=0x222222,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='${label}':fontcolor=white:fontsize=14:x=16:y=6`,'-an','-c:v','libx264','-threads','1','-preset','veryfast','-crf','21','-pix_fmt','yuv420p','-movflags','+faststart',part],{stdio:'inherit'});if(result.status)throw new Error('Video transcode failed');parts.push(part);
  manifest.push({arm,order:index,reportId:report.id,label:report.recipe.label,source:report.artifacts.video,videoOffsetMs:report.artifacts.videoOffsetMs,export:'Full recording including pre-roll, no speed changes/interpolation; label bar added above recorded viewport.'});
 }
 const concat=path.join(root,'artifacts',`${arm}-concat.txt`);await writeFile(concat,parts.map(p=>`file '${p}'`).join('\n'));
 const result=spawnSync('ffmpeg',['-loglevel','error','-y','-f','concat','-safe','0','-i',concat,'-c','copy','-movflags','+faststart',path.join(media,`${arm}.mp4`)],{stdio:'inherit'});if(result.status)throw new Error('Concatenation failed');
 await copyFile(reports[0].artifacts.poster,path.join(media,`${arm}-poster.png`));
}
await writeFile(path.join(media,'EXPORT.json'),JSON.stringify(manifest,null,2));
const preview=spawnSync('ffmpeg',['-loglevel','error','-y','-i',path.join(media,'control-poster.png'),'-i',path.join(media,'treatment-poster.png'),'-filter_complex','[0:v][1:v]hstack=inputs=2,scale=1280:450','-frames:v','1',path.join(media,'comparison.png')],{stdio:'inherit'});if(preview.status)throw new Error('Preview failed');
console.log('Exported full actual recordings and captured screenshots.');
