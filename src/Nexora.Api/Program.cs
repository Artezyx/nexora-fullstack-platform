using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Nexora.Api;

var builder=WebApplication.CreateBuilder(args);
var jwtKey=builder.Configuration["NEXORA_JWT_KEY"]
    ??throw new InvalidOperationException("Configura NEXORA_JWT_KEY (32 caracteres o más).");
if(Encoding.UTF8.GetByteCount(jwtKey)<32)
    throw new InvalidOperationException("NEXORA_JWT_KEY debe contener al menos 32 bytes.");
var connectionString=builder.Configuration.GetConnectionString("Default")
    ??throw new InvalidOperationException("ConnectionStrings__Default es obligatorio.");
if(string.IsNullOrWhiteSpace(connectionString))
    throw new InvalidOperationException("ConnectionStrings__Default no puede estar vacío.");

builder.Services.AddDbContext<NexoraDbContext>(opt=>opt.UseSqlServer(connectionString,sql=>sql.EnableRetryOnFailure()));
builder.Services.AddScoped<IdentityService>();
builder.Services.AddScoped<WorkItemService>();
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opt=>{
        opt.MapInboundClaims=false;
        opt.TokenValidationParameters=new TokenValidationParameters{
            ValidateIssuer=true,ValidIssuer="Nexora",
            ValidateAudience=true,ValidAudience="NexoraWeb",
            ValidateLifetime=true,ValidateIssuerSigningKey=true,
            IssuerSigningKey=new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ClockSkew=TimeSpan.FromSeconds(30),
            NameClaimType=System.Security.Claims.ClaimTypes.Name,
            RoleClaimType=System.Security.Claims.ClaimTypes.Role
        };
    });
builder.Services.AddAuthorization(options=>options.AddPolicy("Owner",policy=>policy.RequireRole("Owner")));
builder.Services.AddRateLimiter(options=>{
    options.RejectionStatusCode=429;
    options.AddPolicy("auth",http=>RateLimitPartition.GetFixedWindowLimiter(
        http.Connection.RemoteIpAddress?.ToString()??"unknown",_=>new FixedWindowRateLimiterOptions{
            PermitLimit=10,Window=TimeSpan.FromMinutes(1),QueueLimit=0,AutoReplenishment=true
        }));
});
var app=builder.Build();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
// Local development only: this is not a substitute for versioned EF migrations.
if(app.Environment.IsDevelopment())
{
    for(var attempt=1;attempt<=12;attempt++)
    {
        try{
            using var scope=app.Services.CreateScope();
            await scope.ServiceProvider.GetRequiredService<NexoraDbContext>().Database.EnsureCreatedAsync();
            break;
        }
        catch(Exception ex) when(attempt<12)
        {
            app.Logger.LogWarning(ex,"SQL Server todavía no está disponible, intento {Attempt}",attempt);
            await Task.Delay(TimeSpan.FromSeconds(5));
        }
    }
}
app.MapNexora();
app.Run();
public partial class Program { }
