using PawPuff_Management.Models.Dtos;

namespace PawPuff_Management.Models.Services;
#nullable enable

public interface IArticleService
{
    Task<List<ArticleListItemDto>> GetListAsync(string? keyword, int? categoryId, bool? isActive);

    /// <summary>取得完整明細:基本欄位 + 圖片 + 巢狀留言 + 目前使用者的讚/收藏狀態。</summary>
    Task<ArticleDetailDto?> GetDetailAsync(int id);

    Task<ServiceResult<int>> CreateAsync(ArticleCreateDto dto);
    Task<ServiceResult> UpdateAsync(ArticleEditDto dto);
    Task<ServiceResult> SetActiveAsync(int id, bool isActive);
    Task<ServiceResult> SetAdminNoteAsync(int id, string? adminComment);
}
