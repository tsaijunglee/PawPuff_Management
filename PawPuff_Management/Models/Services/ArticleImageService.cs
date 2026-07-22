using PawPuff_Management.Models.Dtos;
using PawPuff_Management.Models.EfModels;
using PawPuff_Management.Models.Repositories;

namespace PawPuff_Management.Models.Services;
#nullable enable

public interface IArticleImageService
{
    Task<List<ArticleImageDto>> GetForArticleAsync(int articleId);
    Task<ServiceResult> UploadAsync(int articleId, IReadOnlyList<IFormFile> files);
    Task<ServiceResult> DeleteAsync(int imageId);

	// 介面 IArticleImageService 裡加:
	Task<ServiceResult> ReconcileAsync(int articleId, List<string> keptNames, IReadOnlyList<IFormFile> newFiles);
}

public class ArticleImageService : IArticleImageService
{
    private readonly IArticleImageRepository _repository;
    private readonly R2Service _r2Service;
    private readonly string _publicBaseUrl;

    // 圖片都上傳到 R2 的這個「資料夾」底下,顯示網址也用它重建。
    private const string Folder = "articles";

    private static readonly string[] AllowedExtensions = { ".jpg", ".jpeg", ".png", ".gif", ".webp" };
    private const long MaxFileBytes = 5 * 1024 * 1024; // 5 MB

    public ArticleImageService(
        IArticleImageRepository repository,
        R2Service r2Service,
        IConfiguration configuration)
    {
        _repository = repository;
        _r2Service = r2Service;
        _publicBaseUrl = (configuration["CloudflareR2:PublicUrl"] ?? string.Empty).TrimEnd('/');
    }

    public async Task<List<ArticleImageDto>> GetForArticleAsync(int articleId)
    {
        var images = await _repository.GetByArticleAsync(articleId);
        return images.Select(ToDto).ToList();
    }

    public async Task<ServiceResult> UploadAsync(int articleId, IReadOnlyList<IFormFile> files)
    {
        var valid = (files ?? new List<IFormFile>()).Where(f => f is { Length: > 0 }).ToList();
        if (valid.Count == 0)
            return ServiceResult.Fail("請選擇至少一個檔案。");

        foreach (var file in valid)
        {
            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!AllowedExtensions.Contains(ext))
                return ServiceResult.Fail($"不支援的檔案格式:{file.FileName}");
            if (file.Length > MaxFileBytes)
                return ServiceResult.Fail($"檔案過大(上限 5MB):{file.FileName}");
        }

        // 接續目前最大的排序值往後編號。
        var order = await _repository.GetMaxOrderAsync(articleId);

        foreach (var file in valid)
        {
            // R2Service 回傳的是「完整網址」,但 image_name 欄位只有 50 字,
            // 所以只截取最後的檔名(GUID.副檔名)存起來,顯示時再重組網址。
            var fullUrl = await _r2Service.UploadImageAsync(file, Folder);
            var fileName = fullUrl[(fullUrl.LastIndexOf('/') + 1)..];

            order++;
            await _repository.AddAsync(new ArticleImage
            {
                ArticleId = articleId,
                ImageName = fileName,
                ImageOrder = order,
            });
        }

        await _repository.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    public async Task<ServiceResult> DeleteAsync(int imageId)
    {
        var image = await _repository.GetByIdAsync(imageId);
        if (image is null)
            return ServiceResult.Fail("找不到圖片。");

        // 注意:R2Service 目前沒有刪除方法,這裡只移除資料庫紀錄,
        // R2 上的實體檔案會變成孤兒。要真正刪除,請在 R2Service 加 DeleteAsync(key) 再於此呼叫。
        _repository.Remove(image);
        await _repository.SaveChangesAsync();
        return ServiceResult.Ok();
    }

	// 類別 ArticleImageService 裡加(放在 DeleteAsync 後面):
	public async Task<ServiceResult> ReconcileAsync(int articleId, List<string> keptNames, IReadOnlyList<IFormFile> newFiles)
	{
		keptNames ??= new List<string>();

		// 1. 既有圖片中,不在「保留清單」的就刪掉(含 R2)。
		var existing = await _repository.GetByArticleAsync(articleId);
		foreach (var img in existing.Where(i => !keptNames.Contains(i.ImageName)))
		{
			var del = await DeleteAsync(img.Id);
			if (!del.Success) return del;
		}

		// 2. 有新檔就上傳(接在目前最大排序後面)。
		var valid = (newFiles ?? new List<IFormFile>()).Where(f => f is { Length: > 0 }).ToList();
		if (valid.Count > 0)
		{
			var up = await UploadAsync(articleId, valid);
			if (!up.Success) return up;
		}

		return ServiceResult.Ok();
	}

	private ArticleImageDto ToDto(ArticleImage e) => new()
    {
        Id = e.Id,
        ArticleId = e.ArticleId,
        ImageName = e.ImageName,
        ImageOrder = e.ImageOrder,
        Url = $"{_publicBaseUrl}/{Folder}/{e.ImageName}",
    };
}
