using PawPuff_Management.Models.Dtos;

namespace PawPuff_Management.Models.Services;

/// <summary>
/// Service 負責「商業邏輯 + 驗證」,吃 DTO、吐 DTO / ServiceResult。
/// Controller 只跟這一層對話,不直接碰 Repository 或 DbContext。
/// </summary>
public interface IArticleCategoryService
{
    Task<List<ArticleCategoryDto>> GetAllAsync(bool includeInactive = false);

    Task<ArticleCategoryDto?> GetByIdAsync(int id);

    Task<ServiceResult<int>> CreateAsync(ArticleCategoryCreateDto dto);

    Task<ServiceResult> UpdateAsync(ArticleCategoryEditDto dto);

    /// <summary>啟用 / 停用(軟刪除)。分類被文章參考,不做實體刪除。</summary>
    Task<ServiceResult> SetActiveAsync(int id, bool isActive);
}
