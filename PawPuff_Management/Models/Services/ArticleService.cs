using PawPuff_Management.Models.Dtos;
using PawPuff_Management.Models.EfModels;
using PawPuff_Management.Models.Repositories;

namespace PawPuff_Management.Models.Services;
#nullable enable

public class ArticleService : IArticleService
{
    private readonly IArticleRepository _repository;
    private readonly IArticleImageService _imageService;
    private readonly ICommentService _commentService;
    private readonly IArticleReactionService _reactionService;
    private readonly ICurrentUserService _currentUser;

    public ArticleService(
        IArticleRepository repository,
        IArticleImageService imageService,
        ICommentService commentService,
        IArticleReactionService reactionService,
        ICurrentUserService currentUser)
    {
        _repository = repository;
        _imageService = imageService;
        _commentService = commentService;
        _reactionService = reactionService;
        _currentUser = currentUser;
    }

    public Task<List<ArticleListItemDto>> GetListAsync(string? keyword, int? categoryId, bool? isActive)
        => _repository.GetListAsync(keyword, categoryId, isActive);

    public async Task<ArticleDetailDto?> GetDetailAsync(int id)
    {
        var detail = await _repository.GetDetailBaseAsync(id);
        if (detail is null) return null;

        // 由各子服務補齊,ArticleService 只做組裝。
        detail.Images = await _imageService.GetForArticleAsync(id);
        detail.Comments = await _commentService.GetForArticleAsync(id);
        (detail.LikedByCurrentUser, detail.SavedByCurrentUser) = await _reactionService.GetStatusAsync(id);

        return detail;
    }

    public async Task<ServiceResult<int>> CreateAsync(ArticleCreateDto dto)
    {
        var error = Validate(dto.Title, dto.ArticleContent);
        if (error is not null) return ServiceResult<int>.Fail(error);

        if (!await _repository.CategoryExistsAsync(dto.CategoryId))
            return ServiceResult<int>.Fail("指定的分類不存在。");

        var entity = new Article
        {
            Title = dto.Title.Trim(),
            ArticleContent = dto.ArticleContent.Trim(),
            CategoryId = dto.CategoryId,
            IsActive = dto.IsActive,
            UserId = _currentUser.GetCurrentUserId(),  // 後台建立的文章掛在目前使用者名下
            CreatedAt = DateTime.Now,
        };

        await _repository.AddAsync(entity);
        await _repository.SaveChangesAsync();
        return ServiceResult<int>.Ok(entity.Id);
    }

    public async Task<ServiceResult> UpdateAsync(ArticleEditDto dto)
    {
        var entity = await _repository.GetByIdAsync(dto.Id);
        if (entity is null) return ServiceResult.Fail("找不到文章。");

        var error = Validate(dto.Title, dto.ArticleContent);
        if (error is not null) return ServiceResult.Fail(error);

        if (!await _repository.CategoryExistsAsync(dto.CategoryId))
            return ServiceResult.Fail("指定的分類不存在。");

        entity.Title = dto.Title.Trim();
        entity.ArticleContent = dto.ArticleContent.Trim();
        entity.CategoryId = dto.CategoryId;
        entity.IsActive = dto.IsActive;
        entity.UpdatedAt = DateTime.Now;

        await _repository.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    public async Task<ServiceResult> SetActiveAsync(int id, bool isActive)
    {
        var entity = await _repository.GetByIdAsync(id);
        if (entity is null) return ServiceResult.Fail("找不到文章。");

        entity.IsActive = isActive;
        await _repository.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    public async Task<ServiceResult> SetAdminNoteAsync(int id, string? adminComment)
    {
        var entity = await _repository.GetByIdAsync(id);
        if (entity is null) return ServiceResult.Fail("找不到文章。");

        var note = adminComment?.Trim();
        if (note is { Length: > 100 })
            return ServiceResult.Fail("管理員備註不可超過 100 字。");

        entity.AdminComment = note;
        entity.AdminUpdatedAt = DateTime.Now;
        entity.ModifiedByAdminId = _currentUser.GetCurrentAdminId();

        await _repository.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    private static string? Validate(string? title, string? content)
    {
        if (string.IsNullOrWhiteSpace(title)) return "標題不可空白。";
        if (title.Trim().Length > 100) return "標題不可超過 100 字。";
        if (string.IsNullOrWhiteSpace(content)) return "內容不可空白。";
        if (content.Trim().Length > 4000) return "內容不可超過 4000 字。";
        return null;
    }
}
