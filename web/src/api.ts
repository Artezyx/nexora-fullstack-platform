import type {Session,Account,Project,WorkItem,Page,AuditEvent,Dashboard,Priority,Status} from './types';

export class ApiError extends Error{
 constructor(public readonly status:number,message:string){super(message);this.name='ApiError'}
}
export type Credentials={email:string;password:string};
export type Registration=Credentials&{organization:string;name:string};
export type ItemInput={projectId:string;title:string;description:string;priority:Priority;assigneeId:string|null};
export function parseProblem(body:unknown,fallback:string):string {
 if(typeof body==='object'&&body!==null){
  if('detail' in body && typeof body.detail==='string')return body.detail;
  if('error' in body && typeof body.error==='string')return body.error;
  if('title' in body && typeof body.title==='string')return body.title;
 }
 return fallback;
}
export class NexoraClient{
 constructor(private readonly getToken:()=>string|null){}
 private async request<T>(endpoint:string,options?:RequestInit):Promise<T>{
  const token=this.getToken();
  const response=await fetch(endpoint,{
   ...options,
   headers:{Accept:'application/json',...(options?.body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:`Bearer ${token}`}:{}),...options?.headers}
  });
  if(!response.ok){
   const body:unknown=await response.json().catch(()=>null);
   throw new ApiError(response.status,parseProblem(body,`Error HTTP ${response.status}`));
  }
  return await response.json() as T;
 }
 register(input:Registration){return this.request<Session>('/api/auth/register',{method:'POST',body:JSON.stringify(input)})}
 login(input:Credentials){return this.request<Session>('/api/auth/login',{method:'POST',body:JSON.stringify(input)})}
 dashboard(){return this.request<Dashboard>('/api/dashboard')}
 projects(){return this.request<Project[]>('/api/projects')}
 createProject(name:string,description:string){return this.request<Project>('/api/projects',{method:'POST',body:JSON.stringify({name,description})})}
 members(){return this.request<Account[]>('/api/members')}
 createMember(name:string,email:string,password:string){return this.request<Account>('/api/members',{method:'POST',body:JSON.stringify({name,email,password})})}
 items(query:{page:number;pageSize:number;projectId?:string;status?:string;search?:string}){
  const params=new URLSearchParams({page:String(query.page),pageSize:String(query.pageSize)});
  if(query.projectId)params.set('projectId',query.projectId);
  if(query.status)params.set('status',query.status);
  if(query.search)params.set('search',query.search);
  return this.request<Page<WorkItem>>(`/api/work-items?${params}`);
 }
 createItem(input:ItemInput,key:string){return this.request<WorkItem>('/api/work-items',{method:'POST',headers:{'Idempotency-Key':key},body:JSON.stringify(input)})}
 setStatus(id:string,status:Status,expectedRevision:number){return this.request<WorkItem>(`/api/work-items/${encodeURIComponent(id)}/status`,{method:'PATCH',body:JSON.stringify({status,expectedRevision})})}
 assign(id:string,assigneeId:string|null,expectedRevision:number){return this.request<WorkItem>(`/api/work-items/${encodeURIComponent(id)}/assignee`,{method:'PATCH',body:JSON.stringify({assigneeId,expectedRevision})})}
 history(id:string){return this.request<AuditEvent[]>(`/api/work-items/${encodeURIComponent(id)}/history`)}
}
