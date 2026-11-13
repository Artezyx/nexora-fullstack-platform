using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace Nexora.Api;
public sealed class WorkItemService(NexoraDbContext db)
{
    public async Task<(ItemResponse item,bool replayed)> CreateAsync(
        Guid organizationId,Guid actorId,ItemRequest request,string key,CancellationToken ct=default)
    {
        if(string.IsNullOrWhiteSpace(key)||key.Length>120)throw new DomainError(400,"Idempotency-Key obligatorio (máximo 120 caracteres).");
        if(request.ProjectId==Guid.Empty||string.IsNullOrWhiteSpace(request.Title)||request.Title.Length>180||
           (request.Description?.Length??0)>4000||!WorkflowRules.IsPriority(request.Priority))
            throw new DomainError(400,"Datos de tarea inválidos.");
        if(!await db.Projects.AnyAsync(x=>x.Id==request.ProjectId&&x.OrganizationId==organizationId,ct))
            throw new DomainError(404,"Proyecto no encontrado.");
        if(request.AssigneeId is not null &&
           !await db.Accounts.AnyAsync(x=>x.Id==request.AssigneeId&&x.OrganizationId==organizationId,ct))
            throw new DomainError(400,"Responsable inválido.");
        var canonical=JsonSerializer.Serialize(request with{Title=request.Title.Trim(),Description=request.Description?.Trim()??""});
        var digest=Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(canonical)));
        await using var transaction=await db.Database.BeginTransactionAsync(ct);
        var existing=await db.Idempotency.AsNoTracking().SingleOrDefaultAsync(x=>x.OrganizationId==organizationId&&x.RequestKey==key,ct);
        if(existing is not null)
        {
            if(existing.PayloadHash!=digest)throw new DomainError(409,"La clave ya corresponde a otra solicitud.");
            var old=await db.WorkItems.AsNoTracking().SingleAsync(x=>x.Id==existing.WorkItemId&&x.OrganizationId==organizationId,ct);
            return (ItemResponse.From(old),true);
        }
        var item=new WorkItem{OrganizationId=organizationId,ProjectId=request.ProjectId,
            Title=request.Title.Trim(),Description=request.Description?.Trim()??"",
            Priority=request.Priority,AssigneeId=request.AssigneeId};
        db.WorkItems.Add(item);
        Record(organizationId,actorId,item,"item.created",new{item.Id,item.Title,item.ProjectId});
        db.Idempotency.Add(new IdempotencyRecord{
            OrganizationId=organizationId,RequestKey=key,PayloadHash=digest,WorkItemId=item.Id
        });
        try{await db.SaveChangesAsync(ct);await transaction.CommitAsync(ct);}
        catch(DbUpdateException){throw new DomainError(409,"Conflicto de creación. Consulta la tarea y vuelve a intentar con la misma clave.");}
        return (ItemResponse.From(item),false);
    }
    public async Task<ItemResponse> ChangeStatusAsync(Guid orgId,Guid actorId,string role,
        Guid itemId,StatusRequest input,CancellationToken ct=default)
    {
        var item=await db.WorkItems.SingleOrDefaultAsync(x=>x.Id==itemId&&x.OrganizationId==orgId,ct)
            ??throw new DomainError(404,"Tarea no encontrada.");
        if(item.Revision!=input.ExpectedRevision)throw new DomainError(409,"Versión desactualizada: recarga la tarea.");
        if(!WorkflowRules.CanMove(item.Status,input.Status,role))
            throw new DomainError(400,"Transición inválida o requiere rol Owner.");
        var old=item.Status;item.Status=input.Status;item.Revision++;item.UpdatedAt=DateTimeOffset.UtcNow;
        Record(orgId,actorId,item,"item.status.changed",new{from=old,to=input.Status,item.Revision});
        try{await db.SaveChangesAsync(ct);}
        catch(DbUpdateConcurrencyException){throw new DomainError(409,"Actualización simultánea: recarga la tarea.");}
        return ItemResponse.From(item);
    }
    public async Task<ItemResponse> AssignAsync(Guid orgId,Guid actorId,Guid itemId,AssignRequest input,CancellationToken ct=default)
    {
        var item=await db.WorkItems.SingleOrDefaultAsync(x=>x.Id==itemId&&x.OrganizationId==orgId,ct)
            ??throw new DomainError(404,"Tarea no encontrada.");
        if(item.Revision!=input.ExpectedRevision)throw new DomainError(409,"Versión desactualizada.");
        if(input.AssigneeId is not null &&
            !await db.Accounts.AnyAsync(x=>x.Id==input.AssigneeId&&x.OrganizationId==orgId,ct))
            throw new DomainError(400,"Responsable fuera de la organización.");
        item.AssigneeId=input.AssigneeId;item.Revision++;item.UpdatedAt=DateTimeOffset.UtcNow;
        Record(orgId,actorId,item,"item.assigned",new{input.AssigneeId,item.Revision});
        try{await db.SaveChangesAsync(ct);}
        catch(DbUpdateConcurrencyException){throw new DomainError(409,"Actualización simultánea.");}
        return ItemResponse.From(item);
    }
    private void Record(Guid orgId,Guid actorId,WorkItem item,string eventType,object payload)
    {
        var json=JsonSerializer.Serialize(payload);
        db.Audits.Add(new AuditEvent{OrganizationId=orgId,ActorId=actorId,WorkItemId=item.Id,Action=eventType,DetailsJson=json});
        db.Outbox.Add(new OutboxMessage{OrganizationId=orgId,EventType=eventType,PayloadJson=json});
    }
}
