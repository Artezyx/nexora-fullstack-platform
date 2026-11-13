export type Role='Owner'|'Member';
export type Status='Backlog'|'Active'|'Review'|'Done';
export type Priority='Low'|'Normal'|'High'|'Critical';
export interface Session {token:string;expiresAt:string;displayName:string;role:Role}
export interface Account {id:string;displayName:string;email:string;role:Role}
export interface Project {id:string;name:string;description:string;createdAt:string}
export interface WorkItem {id:string;projectId:string;assigneeId:string|null;title:string;description:string;priority:Priority;status:Status;revision:number;updatedAt:string}
export interface Page<T>{items:T[];total:number;page:number;pageSize:number}
export interface AuditEvent {id:string;actorId:string;action:string;detailsJson:string;createdAt:string}
export interface Dashboard {projects:number;members:number;counts:{status:Status;count:number}[];recent:{workItemId:string;action:string;actorId:string;createdAt:string}[]}
export const statuses:Status[]=['Backlog','Active','Review','Done'];
export const priorities:Priority[]=['Low','Normal','High','Critical'];
