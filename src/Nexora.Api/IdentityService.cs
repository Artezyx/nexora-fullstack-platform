using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace Nexora.Api;
public sealed class IdentityService(NexoraDbContext db,IConfiguration config)
{
    private readonly PasswordHasher<Account> _hasher = new();
    public static string NormalizeEmail(string email)=>email.Trim().ToLowerInvariant();
    public static bool ValidEmail(string? email)=>
        !string.IsNullOrWhiteSpace(email) && email.Length<=254 &&
        new System.ComponentModel.DataAnnotations.EmailAddressAttribute().IsValid(email);
    public static bool ValidPassword(string? password)=>password is {Length:>=12 and <=128};
    public async Task<AuthResponse> RegisterAsync(RegisterRequest input,CancellationToken ct)
    {
        if(string.IsNullOrWhiteSpace(input.Organization)||input.Organization.Length>120||
           string.IsNullOrWhiteSpace(input.Name)||input.Name.Length>120||
           !ValidEmail(input.Email)||!ValidPassword(input.Password))
            throw new DomainError(400,"Datos inválidos. Contraseña de 12 a 128 caracteres.");
        var normalized=NormalizeEmail(input.Email);
        if(await db.Accounts.AnyAsync(x=>x.Email==normalized,ct)) throw new DomainError(409,"Correo ya registrado.");
        var org=new Organization{Name=input.Organization.Trim()};
        var user=new Account{OrganizationId=org.Id,DisplayName=input.Name.Trim(),Email=normalized,Role="Owner",PasswordHash=""};
        user.PasswordHash=_hasher.HashPassword(user,input.Password);
        db.Organizations.Add(org);db.Accounts.Add(user);
        try { await db.SaveChangesAsync(ct); }
        catch(DbUpdateException) {throw new DomainError(409,"No se pudo registrar esa cuenta.");}
        return Token(user);
    }
    public async Task<AuthResponse> LoginAsync(LoginRequest input,CancellationToken ct)
    {
        if(!ValidEmail(input.Email)||string.IsNullOrEmpty(input.Password))throw new DomainError(401,"Credenciales incorrectas.");
        var user=await db.Accounts.SingleOrDefaultAsync(x=>x.Email==NormalizeEmail(input.Email),ct);
        // Same externally visible error for unknown account and invalid password.
        if(user is null || _hasher.VerifyHashedPassword(user,user.PasswordHash,input.Password)==PasswordVerificationResult.Failed)
            throw new DomainError(401,"Credenciales incorrectas.");
        return Token(user);
    }
    public async Task<object> CreateMemberAsync(Guid orgId,MemberRequest input,CancellationToken ct)
    {
        if(string.IsNullOrWhiteSpace(input.Name)||input.Name.Length>120||
           !ValidEmail(input.Email)||!ValidPassword(input.Password))
            throw new DomainError(400,"Datos de integrante inválidos.");
        var email=NormalizeEmail(input.Email);
        if(await db.Accounts.AnyAsync(x=>x.Email==email,ct))throw new DomainError(409,"Correo ya registrado.");
        var user=new Account{OrganizationId=orgId,DisplayName=input.Name.Trim(),Email=email,Role="Member",PasswordHash=""};
        user.PasswordHash=_hasher.HashPassword(user,input.Password);
        db.Accounts.Add(user);
        try {await db.SaveChangesAsync(ct);}
        catch(DbUpdateException) {throw new DomainError(409,"No se pudo crear la cuenta.");}
        return new {user.Id,user.Email,user.DisplayName,user.Role};
    }
    private AuthResponse Token(Account user)
    {
        var key=config["NEXORA_JWT_KEY"]??throw new InvalidOperationException("NEXORA_JWT_KEY missing.");
        var expires=DateTimeOffset.UtcNow.AddHours(2);
        var claims=new[]{
            new Claim(JwtRegisteredClaimNames.Sub,user.Id.ToString()),
            new Claim(ClaimTypes.NameIdentifier,user.Id.ToString()),
            new Claim(ClaimTypes.Name,user.DisplayName),
            new Claim(ClaimTypes.Role,user.Role),
            new Claim("org_id",user.OrganizationId.ToString()),
            new Claim(JwtRegisteredClaimNames.Jti,Guid.NewGuid().ToString())
        };
        var jwt=new JwtSecurityToken(
            issuer:"Nexora",audience:"NexoraWeb",claims:claims,
            notBefore:DateTime.UtcNow,expires:expires.UtcDateTime,
            signingCredentials:new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),SecurityAlgorithms.HmacSha256));
        return new AuthResponse(new JwtSecurityTokenHandler().WriteToken(jwt),expires,user.DisplayName,user.Role);
    }
}
