import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import type {FormEvent} from 'react';
import {Activity,ArrowRight,CheckCircle2,ChevronLeft,ChevronRight,Clock3,FolderKanban,ListFilter,Plus,RefreshCw,Search,ShieldCheck,Users,Workflow,X} from 'lucide-react';
import {ApiError,NexoraClient,type ItemInput} from './api';
import {Banner,Empty,SectionHeading,Shell,type Tab} from './components';
import type {Account,AuditEvent,Dashboard,Priority,Project,Role,Session,Status,WorkItem} from './types';
import {priorities,statuses} from './types';
import {allowedNext,abbreviate,prettyDate,priorityLabel} from './workflow';

type Notice={text:string;error:boolean}|null;
function errorMessage(error:unknown){return error instanceof Error?error.message:'Ocurrió un error inesperado.'}
function count(dashboard:Dashboard|null,status:Status){return dashboard?.counts.find(x=>x.status===status)?.count??0}
function StatusPill({status}: {status:Status}){return <span className={`status status-${status.toLowerCase()}`}>{({Backlog:'Pendiente',Active:'En progreso',Review:'En revisión',Done:'Finalizada'} as Record<Status,string>)[status]}</span>}
function PriorityPill({priority}:{priority:Priority}){return <span className={`priority priority-${priority.toLowerCase()}`}><i/> {priorityLabel(priority)}</span>}

export function App(){
 const [session,setSession]=useState<Session|null>(null);
 const [tab,setTab]=useState<Tab>('overview');
 const [notice,setNotice]=useState<Notice>(null);
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(false);
 const [projects,setProjects]=useState<Project[]>([]);
 const [members,setMembers]=useState<Account[]>([]);
 const [dashboard,setDashboard]=useState<Dashboard|null>(null);
 const [items,setItems]=useState<WorkItem[]>([]);
 const [total,setTotal]=useState(0);
 const [page,setPage]=useState(1);
 const [projectFilter,setProjectFilter]=useState('');
 const [statusFilter,setStatusFilter]=useState('');
 const [search,setSearch]=useState('');
 const [selected,setSelected]=useState<WorkItem|null>(null);
 const [history,setHistory]=useState<AuditEvent[]>([]);
 const [dialog,setDialog]=useState<'project'|'task'|'member'|null>(null);
 const [authMode,setAuthMode]=useState<'login'|'register'>('login');
 const token=useRef<string|null>(null);
 const api=useMemo(()=>new NexoraClient(()=>token.current),[]);
 const notify=(text:string,error=false)=>setNotice({text,error});
 const logout=useCallback(()=>{token.current=null;setSession(null);setItems([]);setProjects([]);setMembers([]);setDashboard(null);setTab('overview');},[]);
 const load=useCallback(async()=>{
  if(!token.current)return;
  setLoading(true);
  try{
   const [projectData,memberData,metrics,taskData]=await Promise.all([
    api.projects(),api.members(),api.dashboard(),
    api.items({page,pageSize:20,projectId:projectFilter||undefined,status:statusFilter||undefined,search:search||undefined})
   ]);
   setProjects(projectData);setMembers(memberData);setDashboard(metrics);
   setItems(taskData.items);setTotal(taskData.total);
  }catch(err){
   if(err instanceof ApiError&&err.status===401)logout();
   notify(errorMessage(err),true);
  }finally{setLoading(false);}
 },[api,page,projectFilter,statusFilter,search,logout]);
 useEffect(()=>{if(session)void load()},[session,load]);
 async function authenticate(input:{email:string;password:string;organization?:string;name?:string}){
  setBusy(true);setNotice(null);
  try{
   const result=authMode==='login'?await api.login({email:input.email,password:input.password}):
    await api.register({email:input.email,password:input.password,organization:input.organization??'',name:input.name??''});
   token.current=result.token;
   setSession(result);
   setPage(1);
  }catch(err){notify(errorMessage(err),true)}
  finally{setBusy(false)}
 }
 async function perform(action:()=>Promise<unknown>,message:string){
  setBusy(true);setNotice(null);
  try{await action();setDialog(null);setSelected(null);notify(message);await load()}
  catch(err){notify(errorMessage(err),true)}
  finally{setBusy(false)}
 }
 async function openHistory(item:WorkItem){
  setSelected(item);setHistory([]);
  try{setHistory(await api.history(item.id))}catch(err){notify(errorMessage(err),true)}
 }
 const currentRole:Role=session?.role??'Member';
 const projectName=(id:string)=>projects.find(x=>x.id===id)?.name??'Proyecto';
 const memberName=(id:string|null)=>members.find(x=>x.id===id)?.displayName??'Sin asignar';
 const totalItems=dashboard?.counts.reduce((sum,c)=>sum+c.count,0)??0;
 const boardColumns=useMemo(()=>statuses.map(status=>({status,items:items.filter(item=>item.status===status)})),[items]);
 if(!session)return <div className="authbackground">
  <div className="authcard"><div className="auth-brand"><span className="brandmark"><Workflow size={24}/></span><span>NEXORA</span></div>
   <div className="auth-hero"><span className="eyebrow">ENTERPRISE OPERATIONS</span><h1>La operación, bajo control.</h1>
    <p>Proyectos, procesos, trazabilidad y decisiones conectados en un mismo lugar.</p>
    <div className="auth-lines"><span><ShieldCheck size={18}/> Accesos por rol</span><span><Activity size={18}/> Auditoría transaccional</span><span><FolderKanban size={18}/> Flujos inteligentes</span></div>
   </div>
   <AuthForm mode={authMode} setMode={setAuthMode} onSubmit={authenticate} busy={busy} notice={notice}/>
  </div>
  <p className="auth-footer">Proyecto de portafolio · Entorno local de desarrollo · No usar con información sensible</p>
 </div>;
 return <Shell tab={tab} setTab={setTab} onLogout={logout} name={session.displayName} role={session.role}>
  <Banner message={notice} onClose={()=>setNotice(null)}/>
  {tab==='overview'&&<>
   <SectionHeading eyebrow="INTELIGENCIA OPERATIVA" title="Panel general" description="Una vista consolidada del trabajo, el equipo y los flujos de tu organización."
    actions={<button className="button secondary" onClick={()=>void load()} disabled={loading}><RefreshCw size={16}/> Actualizar datos</button>}/>
   <div className="metric-grid">
    <Metric icon={<FolderKanban size={20}/>} label="Proyectos" value={dashboard?.projects??0} foot="Espacios de trabajo" variant="blue"/>
    <Metric icon={<Workflow size={20}/>} label="Total de tareas" value={totalItems} foot="Registradas en la plataforma" variant="purple"/>
    <Metric icon={<Clock3 size={20}/>} label="En progreso" value={count(dashboard,'Active')} foot="Trabajo activo" variant="orange"/>
    <Metric icon={<CheckCircle2 size={20}/>} label="Finalizadas" value={count(dashboard,'Done')} foot="Flujo completado" variant="green"/>
   </div>
   <div className="overview-grid">
    <section className="surface"><div className="surface-heading"><div><h2>Estado del trabajo</h2><p>Distribución por etapa del proceso</p></div><ListFilter size={19}/></div>
     <div className="progress-stack">{statuses.map(s=><div key={s} className="progress-row"><div><StatusPill status={s}/><strong>{count(dashboard,s)}</strong></div>
      <div className="progress-track"><span className={`bar ${s.toLowerCase()}`} style={{width:`${totalItems?count(dashboard,s)/totalItems*100:0}%`}}/></div></div>)}</div>
    </section>
    <section className="surface"><div className="surface-heading"><div><h2>Actividad reciente</h2><p>Últimos eventos registrados</p></div><Activity size={19}/></div>
     {dashboard?.recent.length?<div className="activity-list">{dashboard.recent.slice(0,6).map((event,i)=><div key={event.workItemId+event.createdAt+i} className="activity-row"><span className="activity-dot"/><div><strong>{event.action}</strong><small>{prettyDate(event.createdAt)}</small></div></div>)}</div>:
      <Empty title="Sin actividad reciente" description="Los eventos aparecerán aquí al registrar tareas y cambios."/>}
    </section>
   </div>
   <div className="surface"><div className="surface-heading"><div><h2>Últimas tareas</h2><p>Seguimiento de solicitudes y operaciones</p></div>
    <button className="linklike" onClick={()=>setTab('board')}>Ver tablero <ArrowRight size={15}/></button></div>
    <TaskTable items={items.slice(0,5)} projects={projects} members={members} open={openHistory}/>
   </div>
  </>}
  {tab==='board'&&<>
   <SectionHeading eyebrow="GESTIÓN DE PROCESOS" title="Tablero de tareas" description="Gestiona estados, responsables y prioridades con seguimiento auditable."
    actions={<button className="button primary" onClick={()=>setDialog('task')} disabled={!projects.length}><Plus size={17}/> Nueva tarea</button>}/>
   <div className="filter-bar">
    <label className="searchbox"><Search size={18}/><input aria-label="Buscar tareas" value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} placeholder="Buscar por título..."/></label>
    <select aria-label="Filtrar por proyecto" value={projectFilter} onChange={e=>{setProjectFilter(e.target.value);setPage(1)}}><option value="">Todos los proyectos</option>{projects.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select>
    <select aria-label="Filtrar por estado" value={statusFilter} onChange={e=>{setStatusFilter(e.target.value);setPage(1)}}><option value="">Todos los estados</option>{statuses.map(s=><option key={s} value={s}>{s}</option>)}</select>
   </div>
   <div className="board">{boardColumns.map(({status,items:columnItems},i)=><div className="board-column" key={status}>
    <div className="column-head"><span className={`column-indicator ci-${i}`}/><strong>{({Backlog:'Pendientes',Active:'En curso',Review:'Revisión',Done:'Finalizadas'} as Record<Status,string>)[status]}</strong><span className="count-pill">{columnItems.length}</span></div>
    <div className="task-stack">{columnItems.map(item=><article className="task-card" key={item.id}>
     <div className="task-tag"><PriorityPill priority={item.priority}/><span>#{item.id.slice(0,7)}</span></div>
     <button className="task-title" onClick={()=>void openHistory(item)}>{item.title}</button>
     <p>{item.description||'Sin descripción adicional.'}</p>
     <div className="card-project">{projectName(item.projectId)}</div>
     <div className="task-footer"><span className="assignee"><i className="mini-avatar">{abbreviate(memberName(item.assigneeId))}</i>{memberName(item.assigneeId)}</span>
      <select aria-label={`Cambiar estado: ${item.title}`} disabled={busy} value={item.status} onChange={e=>void perform(()=>api.setStatus(item.id,e.target.value as Status,item.revision),'Estado actualizado')}>
       <option value={item.status}>{item.status}</option>{allowedNext(item.status,currentRole).map(next=><option key={next} value={next}>{next}</option>)}
      </select></div></article>)}
      {!columnItems.length&&<div className="column-empty">Sin tareas en esta etapa</div>}
    </div>
   </div>)}</div>
   <div className="pagination"><span>{total} registros · Página {page}</span>
    <div><button aria-label="Página anterior" disabled={page===1} onClick={()=>setPage(p=>p-1)}><ChevronLeft size={17}/></button>
     <button aria-label="Página siguiente" disabled={page*20>=total} onClick={()=>setPage(p=>p+1)}><ChevronRight size={17}/></button></div></div>
   <p className="helper">El tablero muestra hasta 20 tareas por página. No es un tablero drag-and-drop; los cambios de estado se validan en el servidor.</p>
  </>}
  {tab==='projects'&&<>
   <SectionHeading eyebrow="ESTRUCTURA DEL TRABAJO" title="Proyectos" description="Organiza iniciativas y centraliza tareas dentro de cada proyecto."
    actions={currentRole==='Owner'?<button className="button primary" onClick={()=>setDialog('project')}><Plus size={17}/> Nuevo proyecto</button>:undefined}/>
   {projects.length?<div className="project-grid">{projects.map(p=><article className="project-card" key={p.id}><span className="project-symbol"><FolderKanban size={24}/></span>
    <h2>{p.name}</h2><p>{p.description||'Proyecto de trabajo empresarial.'}</p>
    <div className="project-end"><span>Creado {prettyDate(p.createdAt)}</span><button onClick={()=>{setProjectFilter(p.id);setTab('board');setPage(1)}}>Ver tareas <ArrowRight size={15}/></button></div></article>)}</div>:
    <Empty title="Todavía no hay proyectos" description={currentRole==='Owner'?'Crea el primer proyecto para comenzar a organizar tareas.':'El administrador debe crear el primer proyecto.'}/>}
  </>}
  {tab==='members'&&<>
   <SectionHeading eyebrow="GESTIÓN DE ACCESOS" title="Equipo y permisos" description="Controla la pertenencia a tu organización y los roles del personal."
    actions={currentRole==='Owner'?<button className="button primary" onClick={()=>setDialog('member')}><Plus size={17}/> Crear integrante</button>:undefined}/>
   <section className="surface"><div className="surface-heading"><h2>Integrantes de la organización</h2><span className="count-pill">{members.length}</span></div>
    <div className="member-list">{members.map(m=><div key={m.id} className="member"><span className="member-avatar">{abbreviate(m.displayName)}</span>
      <div><strong>{m.displayName}</strong><small>{m.email}</small></div><span className={m.role==='Owner'?'role owner':'role'}>{m.role==='Owner'?'Administrador':'Miembro'}</span></div>)}</div>
   </section><p className="helper">El rol Owner puede crear integrantes, gestionar proyectos y finalizar tareas. El rol Member puede crear y actualizar tareas dentro de su organización.</p>
  </>}
  {tab==='audit'&&<>
   <SectionHeading eyebrow="TRAZABILIDAD" title="Actividad y auditoría" description="Historial de eventos que permite explicar quién cambió el trabajo y cuándo."/>
   <section className="surface"><div className="surface-heading"><h2>Últimos movimientos</h2><Activity size={19}/></div>
    {dashboard?.recent.length?<div className="event-table">{dashboard.recent.map((e,i)=><div className="event-row" key={e.workItemId+e.createdAt+i}><span className="event-icon"><Activity size={16}/></span>
       <div><strong>{e.action}</strong><small>Tarea {e.workItemId.slice(0,8)} · Actor {e.actorId.slice(0,8)}</small></div><span>{prettyDate(e.createdAt)}</span></div>)}</div>:
     <Empty title="Sin eventos" description="Los eventos se generan al crear, asignar y cambiar tareas."/>}</section>
  </>}
  {dialog&&<CreateDialog type={dialog} busy={busy} projects={projects} members={members} close={()=>setDialog(null)}
    submitProject={(n,d)=>perform(()=>api.createProject(n,d),'Proyecto creado')}
    submitMember={(n,e,p)=>perform(()=>api.createMember(n,e,p),'Integrante registrado')}
    submitItem={(input,key)=>perform(()=>api.createItem(input,key),'Tarea registrada')}/>}
  {selected&&<div className="overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setSelected(null)}}>
   <section className="modal" role="dialog" aria-modal="true" aria-label="Historial de tarea"><div className="modal-head"><h2>Historial de la tarea</h2><button onClick={()=>setSelected(null)} aria-label="Cerrar"><X size={21}/></button></div>
     <h3>{selected.title}</h3><p>Revisión actual: {selected.revision} · {projectName(selected.projectId)}</p>
     {history.length?<div className="event-table">{history.map(e=><div className="event-row" key={e.id}><span className="event-icon"><Activity size={16}/></span>
       <div><strong>{e.action}</strong><small>{e.detailsJson}</small></div><span>{prettyDate(e.createdAt)}</span></div>)}</div>:<p>Sin registros disponibles.</p>}
   </section></div>}
 </Shell>;
}

function Metric({icon,label,value,foot,variant}:{icon:React.ReactNode;label:string;value:number;foot:string;variant:string}){
 return <article className="metric-card"><div className="metric-top"><span className={`metric-icon ${variant}`}>{icon}</span><span className="metric-line">Último estado</span></div>
  <small>{label}</small><strong>{value.toLocaleString('es-MX')}</strong><p>{foot}</p></article>;
}
function AuthForm({mode,setMode,onSubmit,busy,notice}:{
 mode:'login'|'register';setMode:(m:'login'|'register')=>void;
 onSubmit:(input:{email:string;password:string;organization?:string;name?:string})=>void;
 busy:boolean;notice:Notice
}){
 const [email,setEmail]=useState('');const [password,setPassword]=useState('');
 const [organization,setOrganization]=useState('');const [name,setName]=useState('');
 function submit(e:FormEvent){e.preventDefault();onSubmit({email,password,organization,name})}
 return <section className="auth-panel"><div className="auth-toggle"><button className={mode==='login'?'chosen':''} onClick={()=>setMode('login')}>Iniciar sesión</button>
  <button className={mode==='register'?'chosen':''} onClick={()=>setMode('register')}>Crear organización</button></div>
  <h2>{mode==='login'?'Bienvenido de nuevo':'Comienza con Nexora'}</h2><p>{mode==='login'?'Accede a tu espacio de operaciones.':'Crea un espacio aislado y recibe el rol administrador.'}</p>
  {notice&&<div role="alert" className={notice.error?'auth-notice error':'auth-notice'}>{notice.text}</div>}
  <form onSubmit={submit} className="stack-form">
   {mode==='register'&&<><label>Nombre de la organización<input required maxLength={120} value={organization} onChange={e=>setOrganization(e.target.value)} placeholder="Acme Operations"/></label>
   <label>Tu nombre<input required maxLength={120} value={name} onChange={e=>setName(e.target.value)} placeholder="Nombre y apellido"/></label></>}
   <label>Correo electrónico<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" placeholder="nombre@empresa.com"/></label>
   <label>Contraseña<input required type="password" minLength={mode==='register'?12:undefined} value={password} onChange={e=>setPassword(e.target.value)}
    autoComplete={mode==='register'?'new-password':'current-password'} placeholder={mode==='register'?'Al menos 12 caracteres':'Tu contraseña'}/></label>
   <button className="button primary large" disabled={busy} type="submit">{busy?'Procesando...':mode==='login'?'Ingresar a plataforma':'Crear espacio de trabajo'} <ArrowRight size={16}/></button>
  </form><p className="auth-tip">Autenticación JWT · Contraseñas con hash · Restricción de acceso por organización</p>
 </section>;
}
function TaskTable({items,projects,members,open}: {items:WorkItem[];projects:Project[];members:Account[];open:(item:WorkItem)=>void}){
 if(items.length===0)return <Empty title="No hay tareas para mostrar" description="Crea un proyecto y registra una tarea para comenzar."/>;
 return <div className="table-scroll"><table><thead><tr><th>Tarea</th><th>Proyecto</th><th>Prioridad</th><th>Estado</th><th>Responsable</th><th>Última actualización</th></tr></thead>
  <tbody>{items.map(item=><tr key={item.id}><td><button className="textbutton" onClick={()=>void open(item)}>{item.title}</button></td>
   <td>{projects.find(p=>p.id===item.projectId)?.name??'—'}</td><td><PriorityPill priority={item.priority}/></td>
   <td><StatusPill status={item.status}/></td><td>{members.find(m=>m.id===item.assigneeId)?.displayName??'Sin asignar'}</td><td>{prettyDate(item.updatedAt)}</td></tr>)}</tbody></table></div>;
}
function CreateDialog({type,busy,projects,members,close,submitProject,submitItem,submitMember}:{
 type:'project'|'task'|'member';busy:boolean;projects:Project[];members:Account[];close:()=>void;
 submitProject:(name:string,description:string)=>void;submitItem:(input:ItemInput,key:string)=>void;
 submitMember:(name:string,email:string,password:string)=>void
}){
 const [name,setName]=useState('');const [description,setDescription]=useState('');
 const [email,setEmail]=useState('');const [password,setPassword]=useState('');
 const [projectId,setProjectId]=useState(projects[0]?.id??'');
 const [assigneeId,setAssigneeId]=useState('');
 const [priority,setPriority]=useState<Priority>('Normal');
 const pending=useRef<{body:string;key:string}|null>(null);
 function submit(e:FormEvent){
  e.preventDefault();
  if(type==='project')submitProject(name,description);
  if(type==='member')submitMember(name,email,password);
  if(type==='task'){
   const input:ItemInput={projectId,title:name,description,priority,assigneeId:assigneeId||null};
   const body=JSON.stringify(input);
   if(!pending.current||pending.current.body!==body)pending.current={body,key:crypto.randomUUID()};
   submitItem(input,pending.current.key);
  }
 }
 return <div className="overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)close()}}>
  <section className="modal" role="dialog" aria-modal="true" aria-label={type==='project'?'Nuevo proyecto':type==='task'?'Nueva tarea':'Nuevo integrante'}>
   <div className="modal-head"><h2>{type==='project'?'Crear proyecto':type==='task'?'Nueva tarea':'Invitar integrante (cuenta local)'}</h2><button onClick={close} aria-label="Cerrar"><X size={21}/></button></div>
   <p className="modal-desc">{type==='task'?'Define responsable, alcance y prioridad de la tarea.':type==='project'?'Agrupa el trabajo en un proyecto con nombre único.':'Crea una cuenta local con rol Member. Comparte la contraseña por un medio seguro.'}</p>
   <form className="stack-form" onSubmit={submit}>
    <label>{type==='project'?'Nombre del proyecto':type==='task'?'Título de la tarea':'Nombre del integrante'}<input value={name} onChange={e=>setName(e.target.value)}
       maxLength={type==='task'?180:type==='project'?140:120} required/></label>
    {type==='member'?<>
      <label>Correo<input type="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)}/></label>
      <label>Contraseña provisional<input type="password" required minLength={12} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)}/></label>
    </>:<label>Descripción<textarea value={description} onChange={e=>setDescription(e.target.value)}
     maxLength={type==='task'?4000:2000} rows={3}/></label>}
    {type==='task'&&<>
     <label>Proyecto<select required value={projectId} onChange={e=>setProjectId(e.target.value)}>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
     <label>Prioridad<select value={priority} onChange={e=>setPriority(e.target.value as Priority)}>{priorities.map(p=><option key={p} value={p}>{priorityLabel(p)}</option>)}</select></label>
     <label>Responsable<select value={assigneeId} onChange={e=>setAssigneeId(e.target.value)}><option value="">Sin asignar</option>{members.map(m=><option key={m.id} value={m.id}>{m.displayName}</option>)}</select></label>
    </>}
    <div className="dialog-actions"><button className="button secondary" type="button" onClick={close}>Cancelar</button>
      <button className="button primary" disabled={busy||type==='task'&&!projectId} type="submit">{busy?'Guardando...':'Guardar cambios'}</button></div>
   </form>
  </section>
 </div>;
}
