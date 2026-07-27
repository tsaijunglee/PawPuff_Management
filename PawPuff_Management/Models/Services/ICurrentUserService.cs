namespace PawPuff_Management.Models.Services;

/// <summary>
/// 提供「目前操作者」的身分。
/// - GetCurrentUserId:用於「以使用者身分」的動作(按讚、收藏、留言),對應 users.id。
/// - GetCurrentAdminId:用於審核留下的管理員足跡(modified_by_admin_id),對應 admins.id。
///
/// 你還沒有登入系統,所以目前是「開發用假身分」:從 appsettings 的 DevSettings 讀取,
/// 讀不到就用 1。等你接上 Cookie 驗證後,只要改這個介面的實作(改成讀 HttpContext.User 的 Claim),
/// 其它所有層都不用動 —— 這就是把身分抽象成介面的用意。
/// </summary>
public interface ICurrentUserService
{
    int GetCurrentUserId();
    int GetCurrentAdminId();
}
