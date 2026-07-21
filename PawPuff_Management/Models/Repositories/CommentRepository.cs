using Microsoft.EntityFrameworkCore;
using PawPuff_Management.Models.EfModels;

namespace PawPuff_Management.Models.Repositories;
#nullable enable

public interface ICommentRepository
{
    /// <summary>某篇文章的所有留言(含作者暱稱),依建立時間排序。含停用的,審核頁要看得到。</summary>
    Task<List<Comment>> GetByArticleAsync(int articleId);

    Task<Comment?> GetByIdAsync(int id);

    Task AddAsync(Comment entity);

    Task SaveChangesAsync();
}

public class CommentRepository : ICommentRepository
{
    private readonly PawPuffContext _context;

    public CommentRepository(PawPuffContext context)
    {
        _context = context;
    }

    public async Task<List<Comment>> GetByArticleAsync(int articleId)
        => await _context.Set<Comment>().AsNoTracking()
            .Include(c => c.User)
            .Where(c => c.ArticleId == articleId)
            .OrderBy(c => c.CreatedAt)
            .ToListAsync();

    public async Task<Comment?> GetByIdAsync(int id)
        => await _context.Set<Comment>().FirstOrDefaultAsync(c => c.Id == id);

    public async Task AddAsync(Comment entity)
        => await _context.Set<Comment>().AddAsync(entity);

    public async Task SaveChangesAsync()
        => await _context.SaveChangesAsync();
}
