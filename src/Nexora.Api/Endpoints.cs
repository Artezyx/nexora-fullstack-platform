using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Nexora.Api;
public static class Endpoints
{
    private static Guid Org(ClaimsPrincipal principal)=>
        Guid.Parse(principal.FindFirst("org_id")?.Value??throw new DomainError(401,"Falta organización."));
    private static Guid Actor(ClaimsPrincipal principal)=>
        Guid.Parse(principal.FindFirst(ClaimTypes.NameIdentifier)?.Value??throw new DomainError(401,"Falta identidad."));
    private static string Role(ClaimsPrincipal principal)=>
        principal.FindFirst(ClaimTypes.Role)?.Value??"Member";
    private static IResult Error(DomainError e)=>Results.Problem(e.Message,statusCode:e.StatusCode);
    public static void MapNexora(this WebApplication app)
    {
        app.MapGet("/health",()=>Results.Ok(new{service="Nexora",status="online"})).AllowAnonymous();

        var auth=app.MapGroup("/api/auth").RequireRateLimiting("auth");
        auth.MapPost("/register",async(RegisterRequest body,IdentityService service,CancellationToken ct)=>{
            try{return Results.Ok(await service.RegisterAsync(body,ct));}
            catch(DomainError ex){return Error(ex);}
        });
        auth.MapPost("/login",async(LoginRequest body,IdentityService service,CancellationToken ct)=>{
            try{return Results.Ok(await service.LoginAsync(body,ct));}
            catch(DomainError ex){return Error(ex);}
        });

        var api=app.MapGroup("/api").RequireAuthorization();
        api.MapGet("/me",(ClaimsPrincipal p)=>Results.Ok(new{
            userId=Actor(p),organizationId=Org(p),displayName=p.Identity?.Name,role=Role(p)
        }));
        api.MapGet("/members",async(ClaimsPrincipal p,NexoraDbContext db,CancellationToken ct)=>
            Results.Ok(await db.Accounts.AsNoTracking().Where(x=>x.OrganizationId==Org(p))
                .OrderBy(x=>x.DisplayName).Select(x=>new{x.Id,x.DisplayName,x.Email,x.Role}).ToListAsync(ct)));
        api.MapPost("/members",async(ClaimsPrincipal p,MemberRequest input,IdentityService service,CancellationToken ct)=>{
            try{return Results.Created("/api/members",await service.CreateMemberAsync(Org(p),input,ct));}
            catch(DomainError ex){return Error(ex);}
        }).RequireAuthorization("Owner");

        api.MapGet("/projects",async(ClaimsPrincipal p,NexoraDbContext db,CancellationToken ct)=>
            Results.Ok(await db.Projects.AsNoTracking().Where(x=>x.OrganizationId==Org(p))
                .OrderBy(x=>x.Name).Select(x=>new{x.Id,x.Name,x.Description,x.CreatedAt}).ToListAsync(ct)));
        api.MapPost("/projects",async(ClaimsPrincipal p,ProjectRequest input,NexoraDbContext db,CancellationToken ct)=>{
            if(string.IsNullOrWhiteSpace(input.Name)||input.Name.Length>140||(input.Description?.Length??0)>2000)
                return Results.BadRequest(new{error="Proyecto inválido."});
            var project=new Project{OrganizationId=Org(p),Name=input.Name.Trim(),Description=input.Description?.Trim()??""};
            db.Projects.Add(project);
            try{await db.SaveChangesAsync(ct);}
            catch(DbUpdateException){return Results.Conflict(new{error="El proyecto ya existe."});}
            return Results.Created($"/api/projects/{project.Id}",new{project.Id,project.Name,project.Description,project.CreatedAt});
        }).RequireAuthorization("Owner");

        api.MapGet("/work-items",async(ClaimsPrincipal p,Guid? projectId,string? status,string? search,int? page,int? pageSize,
            NexoraDbContext db,CancellationToken ct)=>{
            var org=Org(p);
            int size=Math.Clamp(pageSize??20,1,100),number=Math.Clamp(page??1,1,100000);
            var query=db.WorkItems.AsNoTracking().Where(x=>x.OrganizationId==org);
            if(projectId.HasValue)query=query.Where(x=>x.ProjectId==projectId.Value);
            if(!string.IsNullOrWhiteSpace(status))query=query.Where(x=>x.Status==status);
            if(!string.IsNullOrWhiteSpace(search)){
                var term=search.Trim();
                if(term.Length>100)return Results.BadRequest(new{error="Filtro demasiado largo."});
                query=query.Where(x=>x.Title.Contains(term));
            }
            var total=await query.CountAsync(ct);
            var rows=await query.OrderByDescending(x=>x.UpdatedAt).ThenBy(x=>x.Id)
                .Skip((number-1)*size).Take(size).Select(x=>ItemResponse.From(x)).ToListAsync(ct);
            return Results.Ok(new{items=rows,total,page=number,pageSize=size});
        });
        api.MapPost("/work-items",async(ClaimsPrincipal p,HttpRequest http,ItemRequest input,WorkItemService service,CancellationToken ct)=>{
            try{
                var (item,replayed)=await service.CreateAsync(Org(p),Actor(p),input,
                    http.Headers["Idempotency-Key"].ToString(),ct);
                return replayed?Results.Ok(item):Results.Created($"/api/work-items/{item.Id}",item);
            }catch(DomainError ex){return Error(ex);}
        });
        api.MapPatch("/work-items/{id:guid}/status",async(Guid id,ClaimsPrincipal p,StatusRequest input,WorkItemService service,CancellationToken ct)=>{
            try{return Results.Ok(await service.ChangeStatusAsync(Org(p),Actor(p),Role(p),id,input,ct));}
            catch(DomainError ex){return Error(ex);}
        });
        api.MapPatch("/work-items/{id:guid}/assignee",async(Guid id,ClaimsPrincipal p,AssignRequest input,WorkItemService service,CancellationToken ct)=>{
            try{return Results.Ok(await service.AssignAsync(Org(p),Actor(p),id,input,ct));}
            catch(DomainError ex){return Error(ex);}
        }).RequireAuthorization("Owner");
        api.MapGet("/work-items/{id:guid}/history",async(Guid id,ClaimsPrincipal p,NexoraDbContext db,CancellationToken ct)=>{
            var org=Org(p);
            if(!await db.WorkItems.AnyAsync(x=>x.Id==id&&x.OrganizationId==org,ct))return Results.NotFound();
            return Results.Ok(await db.Audits.AsNoTracking().Where(x=>x.WorkItemId==id&&x.OrganizationId==org)
                .OrderByDescending(x=>x.CreatedAt).Take(100)
                .Select(x=>new{x.Id,x.ActorId,x.Action,x.DetailsJson,x.CreatedAt}).ToListAsync(ct));
        });
        api.MapGet("/dashboard",async(ClaimsPrincipal p,NexoraDbContext db,CancellationToken ct)=>{
            var org=Org(p);
            var counts=await db.WorkItems.AsNoTracking().Where(x=>x.OrganizationId==org)
                .GroupBy(x=>x.Status).Select(g=>new{status=g.Key,count=g.Count()}).ToListAsync(ct);
            var projects=await db.Projects.CountAsync(x=>x.OrganizationId==org,ct);
            var members=await db.Accounts.CountAsync(x=>x.OrganizationId==org,ct);
            var recent=await db.Audits.AsNoTracking().Where(x=>x.OrganizationId==org)
                .OrderByDescending(x=>x.CreatedAt).Take(10)
                .Select(x=>new{x.WorkItemId,x.Action,x.ActorId,x.CreatedAt}).ToListAsync(ct);
            return Results.Ok(new{projects,members,counts,recent});
        });
    }
}
