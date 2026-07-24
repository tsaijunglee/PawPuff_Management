using Microsoft.EntityFrameworkCore;
using PawPuff_Management.Models.Dtos;
using PawPuff_Management.Models.EfModels;

namespace PawPuff_Management.Models.Repositories;
#nullable enable

public interface ICommentRepository
{
    /// <summary>某篇文章的所有留言(含作者暱稱),依建立時間排序。含停用的,審核頁要看得到。</summary>
    Task<List<Comment>> GetByArticleAsync(int articleId);

    Task<Comment?> GetByIdAsync(int id);

	// 詳情頁用:批次撈這些文章的所有留言(含停用的,含作者帳號與審核欄位)。
	Task<List<CommentRowDto>> GetRowsForArticlesAsync(List<int> articleIds);

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
        => await _context.Set<Comment>().AsTracking().FirstOrDefaultAsync(c => c.Id == id);

	public async Task<List<CommentRowDto>> GetRowsForArticlesAsync(List<int> articleIds)
	 => await _context.Set<Comment>().AsNoTracking()
		 .Where(c => articleIds.Contains(c.ArticleId))
		 .OrderBy(c => c.CreatedAt)
		 .Select(c => new CommentRowDto
		 {
			 Id = c.Id,
			 ArticleId = c.ArticleId,
			 ParentCommentId = c.ParentCommentId,
			 Account = c.User != null ? c.User.Account : null,
			 CommentContent = c.CommentContent,
			 IsActive = c.IsActive,
			 CreatedAt = c.CreatedAt,
			 UpdatedAt = c.UpdatedAt,
			 AdminComment = c.AdminComment,
			 AdminUpdatedAt = c.AdminUpdatedAt,
			 ModifiedByAdminAccount = c.ModifiedByAdmin != null ? c.ModifiedByAdmin.Account : null,
		 })
		 .ToListAsync();


	public async Task AddAsync(Comment entity)
        => await _context.Set<Comment>().AddAsync(entity);

    public async Task SaveChangesAsync()
        => await _context.SaveChangesAsync();
}
