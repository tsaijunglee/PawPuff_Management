using PawPuff_Management.Models.EfModels;
using PawPuff_Management.Models.Repositories;

namespace PawPuff_Management.Models.Services;
#nullable enable

public interface IArticleReactionService
{
    /// <summary>切換「目前使用者」對某篇文章的讚。回傳切換後是否為已按讚。</summary>
    Task<ServiceResult<bool>> ToggleLikeAsync(int articleId);

    /// <summary>切換「目前使用者」對某篇文章的收藏。回傳切換後是否為已收藏。</summary>
    Task<ServiceResult<bool>> ToggleSaveAsync(int articleId);

    /// <summary>查目前使用者對某篇文章的讚 / 收藏狀態(給明細面板顯示)。</summary>
    Task<(bool liked, bool saved)> GetStatusAsync(int articleId);
}

public class ArticleReactionService : IArticleReactionService
{
    private readonly IArticleReactionRepository _repository;
    private readonly ICurrentUserService _currentUser;

    public ArticleReactionService(IArticleReactionRepository repository, ICurrentUserService currentUser)
    {
        _repository = repository;
        _currentUser = currentUser;
    }

    public async Task<ServiceResult<bool>> ToggleLikeAsync(int articleId)
    {
        if (!await _repository.ArticleExistsAsync(articleId))
            return ServiceResult<bool>.Fail("找不到文章。");

        var userId = _currentUser.GetCurrentUserId();
        var existing = await _repository.GetLikeAsync(articleId, userId);

        bool nowActive;
        if (existing is null)
        {
            // (article_id, user_id) 有唯一鍵,所以第一次按讚就新增一列。
            await _repository.AddLikeAsync(new ArticleLike
            {
                ArticleId = articleId,
                UserId = userId,
                IsActive = true,
                CreatedAt = DateTime.Now,
            });
            nowActive = true;
        }
        else
        {
            // 之後就切換 IsActive,而不是刪掉重加(才不會撞唯一鍵)。
            existing.IsActive = !existing.IsActive;
            nowActive = existing.IsActive;
        }

        await _repository.SaveChangesAsync();
        return ServiceResult<bool>.Ok(nowActive);
    }

    public async Task<ServiceResult<bool>> ToggleSaveAsync(int articleId)
    {
        if (!await _repository.ArticleExistsAsync(articleId))
            return ServiceResult<bool>.Fail("找不到文章。");

        var userId = _currentUser.GetCurrentUserId();
        var existing = await _repository.GetSaveAsync(articleId, userId);

        bool nowActive;
        if (existing is null)
        {
            await _repository.AddSaveAsync(new ArticleSafe
            {
                ArticleId = articleId,
                UserId = userId,
                IsActive = true,
                CreatedAt = DateTime.Now,
            });
            nowActive = true;
        }
        else
        {
            existing.IsActive = !existing.IsActive;
            nowActive = existing.IsActive;
        }

        await _repository.SaveChangesAsync();
        return ServiceResult<bool>.Ok(nowActive);
    }

    public async Task<(bool liked, bool saved)> GetStatusAsync(int articleId)
    {
        var userId = _currentUser.GetCurrentUserId();
        var like = await _repository.GetLikeAsync(articleId, userId);
        var save = await _repository.GetSaveAsync(articleId, userId);
        return (like is { IsActive: true }, save is { IsActive: true });
    }
}
