namespace PawPuff_Management.Models.Services;

/// <summary>
/// 開發用實作:回傳固定的假身分。
/// 之後要接真正的登入,新增一個實作(例如 CookieCurrentUserService)去讀 HttpContext.User 的 Claim,
/// 然後在 Program.cs 把註冊換掉即可。
/// </summary>
public class DevCurrentUserService : ICurrentUserService
{
    private readonly IConfiguration _configuration;

    public DevCurrentUserService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    // appsettings.json → "DevSettings": { "CurrentUserId": 1, "CurrentAdminId": 1 }
    // 請把這兩個值設成你假資料裡「真的存在」的 users.id / admins.id,否則外鍵會對不到。
    public int GetCurrentUserId()
        => _configuration.GetValue<int?>("DevSettings:CurrentUserId") ?? 1;

    public int GetCurrentAdminId()
        => _configuration.GetValue<int?>("DevSettings:CurrentAdminId") ?? 1;
}
