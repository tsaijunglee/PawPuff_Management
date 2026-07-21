using Microsoft.EntityFrameworkCore;
using PawPuff_Management.Models.EfModels;

namespace PawPuff_Management.Models.Repositories;
#nullable enable

public interface IArticleImageRepository
{
    Task<List<ArticleImage>> GetByArticleAsync(int articleId);
    Task<ArticleImage?> GetByIdAsync(int id);
    Task<int> GetMaxOrderAsync(int articleId);
    Task AddAsync(ArticleImage entity);
    void Remove(ArticleImage entity);
    Task SaveChangesAsync();
}

public class ArticleImageRepository : IArticleImageRepository
{
    private readonly PawPuffContext _context;

    public ArticleImageRepository(PawPuffContext context)
    {
        _context = context;
    }

    public async Task<List<ArticleImage>> GetByArticleAsync(int articleId)
        => await _context.Set<ArticleImage>().AsNoTracking()
            .Where(i => i.ArticleId == articleId)
            .OrderBy(i => i.ImageOrder)
            .ToListAsync();

    public async Task<ArticleImage?> GetByIdAsync(int id)
        => await _context.Set<ArticleImage>().FirstOrDefaultAsync(i => i.Id == id);

    public async Task<int> GetMaxOrderAsync(int articleId)
    {
        var any = await _context.Set<ArticleImage>().AnyAsync(i => i.ArticleId == articleId);
        if (!any) return 0;
        return await _context.Set<ArticleImage>()
            .Where(i => i.ArticleId == articleId)
            .MaxAsync(i => i.ImageOrder);
    }

    public async Task AddAsync(ArticleImage entity)
        => await _context.Set<ArticleImage>().AddAsync(entity);

    public void Remove(ArticleImage entity)
        => _context.Set<ArticleImage>().Remove(entity);

    public async Task SaveChangesAsync()
        => await _context.SaveChangesAsync();
}
