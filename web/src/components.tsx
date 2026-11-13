import type {ReactNode} from 'react';
import {Activity,ChartNoAxesCombined,ClipboardList,FolderKanban,LayoutDashboard,LogOut,ShieldCheck,Users} from 'lucide-react';
import type {Role} from './types';

export type Tab='overview'|'board'|'projects'|'members'|'audit';
const entries:{key:Tab;label:string;icon:typeof LayoutDashboard}[]=[
 {key:'overview',label:'Resumen',icon:LayoutDashboard},
 {key:'board',label:'Tablero de trabajo',icon:FolderKanban},
 {key:'projects',label:'Proyectos',icon:ClipboardList},
 {key:'members',label:'Equipo y acceso',icon:Users},
 {key:'audit',label:'Actividad',icon:Activity}
];
export function Shell({tab,setTab,onLogout,name,role,children}:{
 tab:Tab;setTab:(tab:Tab)=>void;onLogout:()=>void;name:string;role:Role;children:ReactNode
}){
 return <div className="application">
  <aside className="sidebar">
   <div className="logo"><span className="brandmark"><ChartNoAxesCombined size={23}/></span><span><b>NEXORA</b><small>OPERATIONS PLATFORM</small></span></div>
   <div className="workspace"><small>ESPACIO DE TRABAJO</small><strong>Operations Hub</strong><span>Entorno de desarrollo</span></div>
   <nav aria-label="Navegación principal">
    <span className="nav-label">PLATAFORMA</span>
    {entries.map(({key,label,icon:Icon})=><button key={key} className={tab===key?'navitem active':'navitem'} onClick={()=>setTab(key)} aria-current={tab===key?'page':undefined}><Icon size={18}/>{label}</button>)}
   </nav>
   <div className="sidebottom"><div className="profile"><span className="avatar">{name.slice(0,2).toUpperCase()}</span><span><strong>{name}</strong><small>{role==='Owner'?'Administrador':'Miembro'}</small></span></div>
   <button className="logout" onClick={onLogout}><LogOut size={17}/> Cerrar sesión</button></div>
  </aside>
  <div className="mainarea">
   <div className="topbar"><div className="breadcrumb">Workspace <span>/</span> {entries.find(x=>x.key===tab)?.label}</div>
     <div className="topright"><span className="secured"><ShieldCheck size={16}/> Espacio protegido</span><span className="online"><i/> Operativo</span></div>
   </div>
   <div className="content">{children}</div>
  </div>
 </div>;
}
export function SectionHeading({eyebrow,title,description,actions}:{
 eyebrow:string;title:string;description:string;actions?:ReactNode
}){
 return <div className="section-head"><div><p className="kicker">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>{actions&&<div className="head-actions">{actions}</div>}</div>;
}
export function Empty({title,description}: {title:string;description:string}){
 return <div className="empty"><ClipboardList size={32}/><strong>{title}</strong><p>{description}</p></div>;
}
export function Banner({message,onClose}: {message:{text:string;error:boolean}|null;onClose:()=>void}){
 return message?<div className={message.error?'banner error':'banner'} role="status"><span>{message.text}</span><button aria-label="Cerrar notificación" onClick={onClose}>×</button></div>:null;
}
