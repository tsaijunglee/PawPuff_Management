using PawPuff_Management.Models.Dtos;
using PawPuff_Management.Models.EfModels;
using PawPuff_Management.Models.Repositories;

namespace PawPuff_Management.Models.Services;
#nullable enable

public interface ICommentService
{
    /// <summary>組成巢狀(只到一層)的留言樹。</summary>
    Task<List<CommentRowDto>> GetForArticleAsync(int articleId);

	// 詳情頁用:批次撈這些文章的留言列(含帳號、審核欄位),給前端隱藏節點渲染。
	Task<List<CommentRowDto>> GetRowsForArticlesAsync(List<int> articleIds);

	Task<ServiceResult<int>> AddAsync(CommentCreateDto dto);

    /// <summary>審核:停用 / 啟用一則留言。</summary>
    Task<ServiceResult> SetActiveAsync(int commentId, bool isActive);

    /// <summary>審核:填寫管理員備註。</summary>
    Task<ServiceResult> SetAdminNoteAsync(int commentId, string? adminComment);
}

public class CommentService : ICommentService
{
    private readonly ICommentRepository _repository;
    private readonly ICurrentUserService _currentUser;

    public CommentService(ICommentRepository repository, ICurrentUserService currentUser)
    {
        _repository = repository;
        _currentUser = currentUser;
    }

    public async Task<List<CommentRowDto>> GetForArticleAsync(int articleId)
    {
		var all = await _repository.GetByArticleAsync(articleId);

		// 先全部轉成 DTO,再用 ParentCommentId 掛成一層樹。
		var dtos = all.Select(ToDto).ToList();
		var byId = dtos.ToDictionary(d => d.Id);

		var roots = new List<CommentRowDto>();
		foreach (var dto in dtos)
		{
			if (dto.ParentCommentId is int pid && byId.TryGetValue(pid, out var parent))
				parent.Replies.Add(dto);   // 子留言掛到父留言底下
			else
				roots.Add(dto);            // 沒有父的就是主留言
		}
		return roots;
	}


	public Task<List<CommentRowDto>> GetRowsForArticlesAsync(List<int> articleIds)
	=> articleIds.Count == 0
		? Task.FromResult(new List<CommentRowDto>())
		: _repository.GetRowsForArticlesAsync(articleIds);


	public async Task<ServiceResult<int>> AddAsync(CommentCreateDto dto)
    {
        var content = (dto.CommentContent ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(content))
            return ServiceResult<int>.Fail("留言內容不可空白。");
        if (content.Length > 500)
            return ServiceResult<int>.Fail("留言內容不可超過 500 字。");

        // 巢狀只到一層:若是回覆,父留言必須存在、同一篇、且本身不是回覆。
        if (dto.ParentCommentId is int parentId)
        {
            var parent = await _repository.GetByIdAsync(parentId);
            if (parent is null || parent.ArticleId != dto.ArticleId)
                return ServiceResult<int>.Fail("找不到要回覆的留言。");
            if (parent.ParentCommentId is not null)
                return ServiceResult<int>.Fail("留言僅支援一層回覆,不能回覆「回覆」。");
        }

        var entity = new Comment
        {
            ArticleId = dto.ArticleId,
            ParentCommentId = dto.ParentCommentId,
            UserId = _currentUser.GetCurrentUserId(),  // 以目前使用者身分留言(選項 B)
            CommentContent = content,
            IsActive = true,
            CreatedAt = DateTime.Now,
        };

        await _repository.AddAsync(entity);
        await _repository.SaveChangesAsync();
        return ServiceResult<int>.Ok(entity.Id);
    }

    public async Task<ServiceResult> SetActiveAsync(int commentId, bool isActive)
    {
        var entity = await _repository.GetByIdAsync(commentId);
        if (entity is null) return ServiceResult.Fail("找不到留言。");

        entity.IsActive = isActive;
        Stamp(entity);
        await _repository.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    public async Task<ServiceResult> SetAdminNoteAsync(int commentId, string? adminComment)
    {
        var entity = await _repository.GetByIdAsync(commentId);
        if (entity is null) return ServiceResult.Fail("找不到留言。");

        var note = adminComment?.Trim();
        if (note is { Length: > 100 })
            return ServiceResult.Fail("管理員備註不可超過 100 字。");

        entity.AdminComment = note;
        Stamp(entity);
        await _repository.SaveChangesAsync();
        return ServiceResult.Ok();
    }

	// 蓋上管理員審核足跡。
	private void Stamp(Comment entity)
	{
		entity.AdminUpdatedAt = DateTime.Now;
		entity.ModifiedByAdminId = _currentUser.GetCurrentAdminId();
	}

	private static CommentRowDto ToDto(Comment e) => new()
	{
		Id = e.Id,
		ArticleId = e.ArticleId,
		ParentCommentId = e.ParentCommentId,
		UserId = e.UserId,
		UserName = e.User?.Nickname,
		CommentContent = e.CommentContent,
		IsActive = e.IsActive,
		CreatedAt = e.CreatedAt,
		AdminComment = e.AdminComment,
	};
}
