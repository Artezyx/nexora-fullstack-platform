namespace Nexora.Api;

public sealed class Organization
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public required string Name { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
public sealed class Account
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OrganizationId { get; set; }
    public required string Email { get; set; }
    public required string DisplayName { get; set; }
    public required string PasswordHash { get; set; }
    public required string Role { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
public sealed class Project
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OrganizationId { get; set; }
    public required string Name { get; set; }
    public string Description { get; set; } = "";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
public sealed class WorkItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OrganizationId { get; set; }
    public Guid ProjectId { get; set; }
    public Guid? AssigneeId { get; set; }
    public required string Title { get; set; }
    public string Description { get; set; } = "";
    public string Priority { get; set; } = "Normal";
    public string Status { get; set; } = "Backlog";
    public long Revision { get; set; } = 1;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
public sealed class AuditEvent
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OrganizationId { get; set; }
    public Guid ActorId { get; set; }
    public Guid WorkItemId { get; set; }
    public required string Action { get; set; }
    public required string DetailsJson { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
public sealed class OutboxMessage
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OrganizationId { get; set; }
    public required string EventType { get; set; }
    public required string PayloadJson { get; set; }
    public DateTimeOffset OccurredAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? PublishedAt { get; set; }
}
public sealed class IdempotencyRecord
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OrganizationId { get; set; }
    public required string RequestKey { get; set; }
    public required string PayloadHash { get; set; }
    public Guid WorkItemId { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public static class WorkflowRules
{
    private static readonly Dictionary<string,string[]> Transitions = new(StringComparer.Ordinal)
    {
        ["Backlog"] = ["Active"],
        ["Active"] = ["Backlog", "Review"],
        ["Review"] = ["Active", "Done"],
        ["Done"] = ["Active"]
    };
    public static bool IsKnownStatus(string value) => Transitions.ContainsKey(value);
    public static bool CanMove(string from,string to,string role) =>
        Transitions.TryGetValue(from,out var choices) && choices.Contains(to,StringComparer.Ordinal) &&
        (to != "Done" || role == "Owner");
    public static bool IsPriority(string value) => value is "Low" or "Normal" or "High" or "Critical";
}

public sealed class DomainError(int statusCode,string message) : Exception(message)
{
    public int StatusCode { get; } = statusCode;
}
