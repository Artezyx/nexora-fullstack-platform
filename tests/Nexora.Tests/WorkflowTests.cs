using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Nexora.Api;
using Xunit;

namespace Nexora.Tests;
public class WorkflowTests
{
    [Theory]
    [InlineData("Backlog","Active","Member",true)]
    [InlineData("Active","Review","Member",true)]
    [InlineData("Review","Done","Member",false)]
    [InlineData("Review","Done","Owner",true)]
    [InlineData("Done","Backlog","Owner",false)]
    public void Validates_workflow_and_authorization(string from,string to,string role,bool expected)
        =>Assert.Equal(expected,WorkflowRules.CanMove(from,to,role));

    [Fact]
    public async Task Tenant_isolation_and_audit_are_enforced()
    {
        await using var connection=new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();
        var options=new DbContextOptionsBuilder<NexoraDbContext>().UseSqlite(connection).Options;
        await using var db=new NexoraDbContext(options);
        await db.Database.EnsureCreatedAsync();
        var tenantA=Guid.NewGuid();var tenantB=Guid.NewGuid();var actor=Guid.NewGuid();
        db.Organizations.AddRange(new Organization{Id=tenantA,Name="Tenant A"},new Organization{Id=tenantB,Name="Tenant B"});
        var project=new Project{OrganizationId=tenantA,Name="Operations"};
        db.Projects.Add(project);
        await db.SaveChangesAsync();
        var service=new WorkItemService(db);
        var request=new ItemRequest(project.Id,"Auditar solicitud","Test","High",null);
        var (created,replayed)=await service.CreateAsync(tenantA,actor,request,"tenant-a-req");
        Assert.False(replayed);
        Assert.Equal("Backlog",created.Status);
        var (again,wasReplayed)=await service.CreateAsync(tenantA,actor,request,"tenant-a-req");
        Assert.True(wasReplayed);
        Assert.Equal(created.Id,again.Id);
        Assert.Single(await db.WorkItems.ToListAsync());
        Assert.Single(await db.Audits.ToListAsync());
        Assert.Single(await db.Outbox.ToListAsync());
        var missing=await Assert.ThrowsAsync<DomainError>(()=>service.ChangeStatusAsync(tenantB,actor,"Owner",created.Id,new StatusRequest("Active",1)));
        Assert.Equal(404,missing.StatusCode);
        var active=await service.ChangeStatusAsync(tenantA,actor,"Member",created.Id,new StatusRequest("Active",1));
        Assert.Equal(2,active.Revision);
        Assert.Equal(2,await db.Audits.CountAsync());
        var stale=await Assert.ThrowsAsync<DomainError>(()=>service.ChangeStatusAsync(tenantA,actor,"Member",created.Id,new StatusRequest("Review",1)));
        Assert.Equal(409,stale.StatusCode);
    }

    [Fact]
    public async Task Cross_tenant_assignee_is_rejected()
    {
        await using var connection=new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();
        var options=new DbContextOptionsBuilder<NexoraDbContext>().UseSqlite(connection).Options;
        await using var db=new NexoraDbContext(options);
        await db.Database.EnsureCreatedAsync();
        var a=Guid.NewGuid();var b=Guid.NewGuid();var actor=Guid.NewGuid();
        db.Organizations.AddRange(new Organization{Id=a,Name="A"},new Organization{Id=b,Name="B"});
        db.Accounts.Add(new Account{Id=actor,OrganizationId=b,Email="b@example.com",DisplayName="B",PasswordHash="hash",Role="Member"});
        var project=new Project{OrganizationId=a,Name="A project"};db.Projects.Add(project);
        await db.SaveChangesAsync();
        var service=new WorkItemService(db);
        var error=await Assert.ThrowsAsync<DomainError>(()=>service.CreateAsync(a,actor,
            new ItemRequest(project.Id,"Tarea","", "High",actor),"request-2"));
        Assert.Equal(400,error.StatusCode);
    }
}
