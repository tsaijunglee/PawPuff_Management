using Microsoft.EntityFrameworkCore;
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

    public async Task SaveChangesAsync()
        => await _context.SaveChangesAsync();
}
