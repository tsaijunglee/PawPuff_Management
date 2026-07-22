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

	// 測試階段固定身分,不讀 appsettings。
	// ★ CurrentUserId 要填「users 表裡真的存在」的 id ★
	public int GetCurrentUserId() => 1;   //  users id=1
	public int GetCurrentAdminId() => 1;  // admins id=1

}
