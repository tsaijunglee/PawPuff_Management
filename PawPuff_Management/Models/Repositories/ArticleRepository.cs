using Microsoft.EntityFrameworkCore;
using PawPuff_Management.Models.Dtos;
using PawPuff_Management.Models.EfModels;

namespace PawPuff_Management.Models.Repositories;
#nullable enable

public class ArticleRepository : IArticleRepository
{
    private readonly PawPuffContext _context;

    public ArticleRepository(PawPuffContext context)
    {
        _context = context;
    }

    // 用 Set<T>() 而不是具名 DbSet(例如 _context.Articles),
    // 這樣不論你 scaffolding 出來的 DbSet 屬性叫什麼名字都不會出錯。

    public async Task<List<ArticleListItemDto>> GetListAsync(string? keyword, int? categoryId, bool? isActive)
    {
        var query = _context.Set<Article>().AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(keyword))
            query = query.Where(a => a.Title.Contains(keyword));

        if (categoryId.HasValue)
            query = query.Where(a => a.CategoryId == categoryId.Value);

        if (isActive.HasValue)
            query = query.Where(a => a.IsActive == isActive.Value);

        // 一次投影查詢把計數一起算出來(在 SQL 端聚合,不會 N+1)。
        return await query
            .OrderByDescending(a => a.CreatedAt)
            .Select(a => new ArticleListItemDto
            {
                Id = a.Id,
                Title = a.Title,
                ArticleContent = a.ArticleContent,
                CategoryId = a.CategoryId,
                CategoryName = a.Category.Name,
                AuthorNickname = a.User != null ? a.User.Nickname : null,
                AuthorAccount = a.User != null ? a.User.Account : null,
                IsActive = a.IsActive,
                CreatedAt = a.CreatedAt,
                UpdatedAt = a.UpdatedAt,
                AdminComment = a.AdminComment,
                AdminUpdatedAt = a.AdminUpdatedAt,
                ModifiedByAdminAccount = a.ModifiedByAdmin != null ? a.ModifiedByAdmin.Account : null,
                LikeCount = a.ArticleLikes.Count(l => l.IsActive),
                SaveCount = a.ArticleSaves.Count(s => s.IsActive),
                CommentCount = a.Comments.Count(c => c.IsActive),
				ImageCount = a.ArticleImages.Count(),
				ImageNames = a.ArticleImages.OrderBy(i => i.ImageOrder).Select(i => i.ImageName).ToList(),
			})
			.ToListAsync();
	} 

    public async Task<Article?> GetByIdAsync(int id)
        => await _context.Set<Article>().FirstOrDefaultAsync(a => a.Id == id);

    public async Task<ArticleDetailDto?> GetDetailBaseAsync(int id)
    {
        return await _context.Set<Article>().AsNoTracking()
            .Where(a => a.Id == id)
            .Select(a => new ArticleDetailDto
            {
                Id = a.Id,
                Title = a.Title,
                ArticleContent = a.ArticleContent,
                CategoryId = a.CategoryId,
                CategoryName = a.Category.Name,
                UserId = a.UserId,
                AuthorNickname = a.User != null ? a.User.Nickname : null,
                IsActive = a.IsActive,
                CreatedAt = a.CreatedAt,
                AdminComment = a.AdminComment,
                AdminUpdatedAt = a.AdminUpdatedAt,
                LikeCount = a.ArticleLikes.Count(l => l.IsActive),
                SaveCount = a.ArticleSaves.Count(s => s.IsActive),
                // Images / Comments / Liked/Saved 由 Service 另外補上
            })
            .FirstOrDefaultAsync();
    }

    public async Task<bool> CategoryExistsAsync(int categoryId)
        => await _context.Set<ArticleCategory>().AnyAsync(c => c.Id == categoryId);

    public async Task AddAsync(Article entity)
        => await _context.Set<Article>().AddAsync(entity);

    public async Task SaveChangesAsync()
        => await _context.SaveChangesAsync();
}
