using PawPuff_Management.Models.Dtos;
using PawPuff_Management.Models.EfModels;

namespace PawPuff_Management.Models.Repositories;
#nullable enable

public interface IArticleRepository
{
	/// <summary>清單(含各項計數)。keyword 比對標題;categoryId / isActive 為 null 表示不篩。</summary>
	Task<List<ArticleListItemDto>> GetListAsync(string? keyword, int? categoryId, bool? isActive);
	Task<ArticleListItemDto?> GetListItemByIdAsync(int id);

	/// <summary>取單筆 Article 實體(追蹤中,供編輯 / 審核用)。</summary>
	Task<Article?> GetByIdAsync(int id);

    /// <summary>取單筆的基本明細(含分類名、作者暱稱、讚/收藏數),不含圖片與留言。</summary>
    Task<ArticleDetailDto?> GetDetailBaseAsync(int id);

	Task<bool> ExistsRecentDuplicateAsync(int userId, string title, string content, DateTime since);

	Task<bool> CategoryExistsAsync(int categoryId);

	Task AddAsync(Article entity);

    Task SaveChangesAsync();
}
