import type {Status,Role,WorkItem} from './types';
export const transitionMap:Record<Status,Status[]>={
 Backlog:['Active'],
 Active:['Backlog','Review'],
 Review:['Active','Done'],
 Done:['Active']
};
export function allowedNext(status:Status,role:Role):Status[]{
 return transitionMap[status].filter(next=>next!=='Done'||role==='Owner');
}
export function priorityLabel(value:string):string{
 return ({Low:'Baja',Normal:'Normal',High:'Alta',Critical:'Crítica'} as Record<string,string>)[value]??value;
}
export function totalByStatus(items:readonly WorkItem[]):Record<Status,number>{
 const counts:Record<Status,number>={Backlog:0,Active:0,Review:0,Done:0};
 for(const item of items)counts[item.status]++;
 return counts;
}
export function abbreviate(name:string):string{
 return name.trim().split(/\s+/).slice(0,2).map(s=>s.charAt(0)).join('').toUpperCase()||'NX';
}
export function prettyDate(date:string):string{
 const value=new Date(date);
 return Number.isNaN(value.getTime())?'—':new Intl.DateTimeFormat('es-MX',{day:'2-digit',month:'short',year:'numeric'}).format(value);
}
