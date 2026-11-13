import {describe,it,expect} from 'vitest';
import {allowedNext,priorityLabel,totalByStatus,abbreviate} from './workflow';
describe('reglas visibles de flujo de trabajo',()=>{
 it('el miembro no puede finalizar una tarea',()=>expect(allowedNext('Review','Member')).toEqual(['Active']));
 it('el administrador puede aprobar la finalización',()=>expect(allowedNext('Review','Owner')).toContain('Done'));
 it('contabiliza tareas por estado',()=>{
  const rows=[{status:'Backlog'},{status:'Done'},{status:'Done'}] as unknown as Parameters<typeof totalByStatus>[0];
  expect(totalByStatus(rows)).toEqual({Backlog:1,Active:0,Review:0,Done:2});
 });
 it('presenta etiquetas coherentes',()=>{expect(priorityLabel('Critical')).toBe('Crítica');expect(abbreviate('Ana Torres')).toBe('AT')});
});
