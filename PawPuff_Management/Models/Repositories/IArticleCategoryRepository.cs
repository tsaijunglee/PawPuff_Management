using PawPuff_Management.Models.EfModels;

namespace PawPuff_Management.Models.Repositories;

/// <summary>
/// Repository 只負責「資料存取」,回傳 Entity,不含商業邏輯。
/// </summary>
public interface IArticleCategoryRepository
{
    /// <param name="includeInactive">true 時連停用的分類一起帶出(後台用)。</param>
    Task<List<ArticleCategory>> GetAllAsync(bool includeInactive);

    /// <summary>取單筆(追蹤中,供編輯用)。</summary>
    Task<ArticleCategory?> GetByIdAsync(int id);

    /// <summary>檢查名稱是否已存在;editId 傳入時會排除自己(編輯情境)。</summary>
    Task<bool> NameExistsAsync(string name, int? excludeId);

    Task AddAsync(ArticleCategory entity);

    Task SaveChangesAsync();
}
