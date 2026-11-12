// Output options for `motion-debugger critique`: a CI gate (--fail-on), GitHub Actions annotations (--github)
// and opening the first image to look at (--open). Pure helpers, so the CLI wiring stays thin and testable.
import {spawn} from 'node:child_process';
import type {CritiqueFinding,CritiqueReport} from '../core/critique';

export const severities=['blocker','major','minor','polish'] as const;
export type Severity=typeof severities[number];

export function parseSeverity(value:string|undefined):Severity {
  if(!value||!(severities as readonly string[]).includes(value))throw new Error('--fail-on requires one of: blocker, major, minor, polish');
  return value as Severity;
}

// Findings at or above the threshold: --fail-on major fails on blocker and major findings.
export function findingsAtOrAbove(findings:CritiqueFinding[],threshold:Severity):CritiqueFinding[] {
  const limit=severities.indexOf(threshold);
  return findings.filter(finding=>severities.indexOf(finding.severity)<=limit);
}

export function severityCounts(findings:CritiqueFinding[]):string {
  return severities.map(severity=>`${findings.filter(finding=>finding.severity===severity).length} ${severity}`).join(', ');
}

// GitHub workflow commands: message data escapes % and line breaks; property values also escape ":" and ",".
const escapeData=(text:string)=>text.replace(/%/g,'%25').replace(/\r/g,'%0D').replace(/\n/g,'%0A');
const escapeProperty=(text:string)=>escapeData(text).replace(/:/g,'%3A').replace(/,/g,'%2C');
const annotationLevel:Record<Severity,'error'|'warning'|'notice'>={blocker:'error',major:'error',minor:'warning',polish:'notice'};

export function githubAnnotations(findings:CritiqueFinding[]):string[] {
  return findings.map(finding=>`::${annotationLevel[finding.severity]} title=${escapeProperty(finding.id)}::${escapeData(`${finding.title}. ${finding.evidence} (fix: ${finding.fix})`)}`);
}

// The image a person should look at first: the outlined finish defects, else the desktop scroll contact sheet.
export function imageToOpen(images:CritiqueReport['images']):string|undefined {
  return images.craft??images.desktopScroll??images.desktopEntrance??Object.values(images)[0];
}

export function viewerCommand(platform:NodeJS.Platform,file:string):{command:string;args:string[];verbatim:boolean} {
  if(platform==='darwin')return {command:'open',args:[file],verbatim:false};
  // `start` is a cmd builtin; its first quoted argument is the window title, so pass an empty one.
  if(platform==='win32')return {command:'cmd',args:['/c','start','""',`"${file}"`],verbatim:true};
  return {command:'xdg-open',args:[file],verbatim:false};
}

// Best effort: a missing viewer must never fail the critique.
export function openImage(file:string,platform:NodeJS.Platform=process.platform,launch:typeof spawn=spawn):boolean {
  try{
    const {command,args,verbatim}=viewerCommand(platform,file);
    const child=launch(command,args,{detached:true,stdio:'ignore',windowsHide:true,windowsVerbatimArguments:verbatim});
    child.on('error',()=>{});child.unref();
    return true;
  }catch{return false}
}
