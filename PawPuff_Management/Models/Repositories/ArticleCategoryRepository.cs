using Microsoft.EntityFrameworkCore;
using PawPuff_Management.Models.EfModels;

namespace PawPuff_Management.Models.Repositories;

public class ArticleCategoryRepository : IArticleCategoryRepository
{
    private readonly PawPuffContext _context;

    public ArticleCategoryRepository(PawPuffContext context)
    {
        _context = context;
    }

    public async Task<List<ArticleCategory>> GetAllAsync(bool includeInactive)
    {
        // 讀取用查詢加 AsNoTracking:不需要追蹤變更,效能較好。
        var query = _context.Set<ArticleCategory>().AsNoTracking().AsQueryable();

        if (!includeInactive)
            query = query.Where(c => c.IsActive);

        return await query
            .OrderBy(c => c.Id) // 依編號排序
			.ToListAsync();
    }

    public async Task<ArticleCategory?> GetByIdAsync(int id)
    {
        // 這裡「不加」AsNoTracking,取回的是被追蹤的實體,改完直接 SaveChanges 即可。
        return await _context.Set<ArticleCategory>().FirstOrDefaultAsync(c => c.Id == id);
    }

    public async Task<bool> NameExistsAsync(string name, int? excludeId)
    {
        return await _context.Set<ArticleCategory>()
            .AnyAsync(c => c.Name == name && (excludeId == null || c.Id != excludeId));
    }

    public async Task AddAsync(ArticleCategory entity)
    {
        await _context.Set<ArticleCategory>().AddAsync(entity);
    }

    public async Task SaveChangesAsync()
    {
        await _context.SaveChangesAsync();
    }
}
