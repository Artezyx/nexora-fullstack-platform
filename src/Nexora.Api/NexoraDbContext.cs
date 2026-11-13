using Microsoft.EntityFrameworkCore;

namespace Nexora.Api;
public sealed class NexoraDbContext(DbContextOptions<NexoraDbContext> options):DbContext(options)
{
    public DbSet<Organization> Organizations => Set<Organization>();
    public DbSet<Account> Accounts => Set<Account>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<WorkItem> WorkItems => Set<WorkItem>();
    public DbSet<AuditEvent> Audits => Set<AuditEvent>();
    public DbSet<OutboxMessage> Outbox => Set<OutboxMessage>();
    public DbSet<IdempotencyRecord> Idempotency => Set<IdempotencyRecord>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Organization>(e=>{e.HasKey(x=>x.Id);e.Property(x=>x.Name).HasMaxLength(120).IsRequired();});
        b.Entity<Account>(e=>{
            e.HasKey(x=>x.Id);e.HasIndex(x=>x.Email).IsUnique();e.HasIndex(x=>x.OrganizationId);
            e.Property(x=>x.Email).HasMaxLength(254).IsRequired();
            e.Property(x=>x.DisplayName).HasMaxLength(120).IsRequired();
            e.Property(x=>x.Role).HasMaxLength(20).IsRequired();
            e.Property(x=>x.PasswordHash).IsRequired();
            e.HasOne<Organization>().WithMany().HasForeignKey(x=>x.OrganizationId).OnDelete(DeleteBehavior.Restrict);
        });
        b.Entity<Project>(e=>{
            e.HasKey(x=>x.Id);e.HasIndex(x=>new{x.OrganizationId,x.Name}).IsUnique();
            e.Property(x=>x.Name).HasMaxLength(140).IsRequired();e.Property(x=>x.Description).HasMaxLength(2000);
            e.HasOne<Organization>().WithMany().HasForeignKey(x=>x.OrganizationId).OnDelete(DeleteBehavior.Restrict);
        });
        b.Entity<WorkItem>(e=>{
            e.HasKey(x=>x.Id);e.Property(x=>x.Title).HasMaxLength(180).IsRequired();
            e.Property(x=>x.Description).HasMaxLength(4000);
            e.Property(x=>x.Status).HasMaxLength(20).IsRequired();
            e.Property(x=>x.Priority).HasMaxLength(20).IsRequired();
            e.Property(x=>x.Revision).IsConcurrencyToken();
            e.HasIndex(x=>new{x.OrganizationId,x.Status,x.UpdatedAt});
            e.HasIndex(x=>new{x.OrganizationId,x.ProjectId,x.CreatedAt});
            e.HasOne<Project>().WithMany().HasForeignKey(x=>x.ProjectId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<Account>().WithMany().HasForeignKey(x=>x.AssigneeId).OnDelete(DeleteBehavior.Restrict);
        });
        b.Entity<AuditEvent>(e=>{
            e.HasKey(x=>x.Id);e.Property(x=>x.Action).HasMaxLength(90).IsRequired();
            e.HasIndex(x=>new{x.OrganizationId,x.WorkItemId,x.CreatedAt});
            e.HasOne<WorkItem>().WithMany().HasForeignKey(x=>x.WorkItemId).OnDelete(DeleteBehavior.Restrict);
        });
        b.Entity<OutboxMessage>(e=>{
            e.HasKey(x=>x.Id);e.Property(x=>x.EventType).HasMaxLength(90).IsRequired();
            e.HasIndex(x=>new{x.OrganizationId,x.PublishedAt,x.OccurredAt});
        });
        b.Entity<IdempotencyRecord>(e=>{
            e.HasKey(x=>x.Id);e.HasIndex(x=>new{x.OrganizationId,x.RequestKey}).IsUnique();
            e.Property(x=>x.RequestKey).HasMaxLength(120).IsRequired();e.Property(x=>x.PayloadHash).HasMaxLength(64).IsRequired();
        });
    }
}
