using Microsoft.EntityFrameworkCore;
using PawPuff_Management.Models.Dtos;
using PawPuff_Management.Models.EfModels;

namespace PawPuff_Management.Models.Repositories;
#nullable enable

/// <summary>
/// 按讚與收藏結構完全一樣(article_id + user_id 唯一,靠 IsActive 開關),
/// 所以放在同一個 Repository。
/// </summary>
public interface IArticleReactionRepository
{
    Task<ArticleLike?> GetLikeAsync(int articleId, int userId);
    Task AddLikeAsync(ArticleLike entity);

    Task<ArticleSafe?> GetSaveAsync(int articleId, int userId);
    Task AddSaveAsync(ArticleSafe entity);

    Task<bool> ArticleExistsAsync(int articleId);

	// 詳情頁用:批次撈這些文章的「有效」讚 / 收藏(含帳號),給前端隱藏節點渲染。
	Task<List<ArticleReactionRowDto>> GetLikeRowsAsync(List<int> articleIds);
	Task<List<ArticleReactionRowDto>> GetSaveRowsAsync(List<int> articleIds);

	Task SaveChangesAsync();
}

public class ArticleReactionRepository : IArticleReactionRepository
{
    private readonly PawPuffContext _context;

    public ArticleReactionRepository(PawPuffContext context)
    {
        _context = context;
    }

    public async Task<ArticleLike?> GetLikeAsync(int articleId, int userId)
        => await _context.Set<ArticleLike>()
            .FirstOrDefaultAsync(l => l.ArticleId == articleId && l.UserId == userId);

    public async Task AddLikeAsync(ArticleLike entity)
        => await _context.Set<ArticleLike>().AddAsync(entity);

    public async Task<ArticleSafe?> GetSaveAsync(int articleId, int userId)
        => await _context.Set<ArticleSafe>()
            .FirstOrDefaultAsync(s => s.ArticleId == articleId && s.UserId == userId);

    public async Task AddSaveAsync(ArticleSafe entity)
        => await _context.Set<ArticleSafe>().AddAsync(entity);

    public async Task<bool> ArticleExistsAsync(int articleId)
        => await _context.Set<Article>().AnyAsync(a => a.Id == articleId);

	public async Task<List<ArticleReactionRowDto>> GetLikeRowsAsync(List<int> articleIds)
	   => await _context.Set<ArticleLike>().AsNoTracking()
		   .Where(l => l.IsActive && articleIds.Contains(l.ArticleId))
		   .OrderBy(l => l.CreatedAt)
		   .Select(l => new ArticleReactionRowDto
		   {
			   ArticleId = l.ArticleId,
			   Type = "like",
			   Account = l.User.Account,
			   CreatedAt = l.CreatedAt,
		   })
		   .ToListAsync();

	public async Task<List<ArticleReactionRowDto>> GetSaveRowsAsync(List<int> articleIds)
		=> await _context.Set<ArticleSafe>().AsNoTracking()
			.Where(s => s.IsActive && articleIds.Contains(s.ArticleId))
			.OrderBy(s => s.CreatedAt)
			.Select(s => new ArticleReactionRowDto
			{
				ArticleId = s.ArticleId,
				Type = "favorite",
				Account = s.User.Account,
				CreatedAt = s.CreatedAt,
			})
			.ToListAsync();


	public async Task SaveChangesAsync()
        => await _context.SaveChangesAsync();
}
