import {afterEach,describe,it,expect,vi} from 'vitest';
import {NexoraClient,ApiError,parseProblem} from './api';
afterEach(()=>vi.unstubAllGlobals());
describe('cliente API',()=>{
 it('conserva el token en Authorization y envía Idempotency-Key',async()=>{
  const mock=vi.fn().mockResolvedValue({ok:true,json:async()=>({id:'abc'})});
  vi.stubGlobal('fetch',mock);
  const api=new NexoraClient(()=>'token-de-prueba');
  await api.createItem({projectId:'p1',title:'Revisión',description:'',priority:'High',assigneeId:null},'clave-123');
  const options=mock.mock.calls[0][1] as RequestInit;
  expect(new Headers(options.headers).get('Authorization')).toBe('Bearer token-de-prueba');
  expect(new Headers(options.headers).get('Idempotency-Key')).toBe('clave-123');
  expect(options.method).toBe('POST');
 });
 it('muestra detalle seguro de un error HTTP',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false,status:409,json:async()=>({detail:'Versión desactualizada'})}));
  const api=new NexoraClient(()=>null);
  await expect(api.projects()).rejects.toMatchObject({status:409,message:'Versión desactualizada'});
  expect(parseProblem(null,'Error')).toBe('Error');
  expect(new ApiError(400,'Error').status).toBe(400);
 });
});
