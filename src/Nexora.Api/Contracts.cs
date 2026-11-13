namespace Nexora.Api;
public sealed record RegisterRequest(string Organization,string Name,string Email,string Password);
public sealed record LoginRequest(string Email,string Password);
public sealed record MemberRequest(string Name,string Email,string Password);
public sealed record ProjectRequest(string Name,string Description);
public sealed record ItemRequest(Guid ProjectId,string Title,string Description,string Priority,Guid? AssigneeId);
public sealed record StatusRequest(string Status,long ExpectedRevision);
public sealed record AssignRequest(Guid? AssigneeId,long ExpectedRevision);
public sealed record AuthResponse(string Token,DateTimeOffset ExpiresAt,string DisplayName,string Role);
public sealed record ItemResponse(Guid Id,Guid ProjectId,Guid? AssigneeId,string Title,string Description,string Priority,string Status,long Revision,DateTimeOffset UpdatedAt)
{
    public static ItemResponse From(WorkItem item)=>new(item.Id,item.ProjectId,item.AssigneeId,item.Title,item.Description,item.Priority,item.Status,item.Revision,item.UpdatedAt);
}
