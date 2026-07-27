using Microsoft.AspNetCore.Mvc;
using PawPuff_Management.Models.Dtos;
using PawPuff_Management.Models.Services;
using PawPuff_Management.ViewModels.Article;

namespace PawPuff_Management.Controllers;
#nullable enable

/// <summary>
/// 文章後台(全 Ajax):清單 + 詳情面板。Controller 保持薄,只轉呼叫 Service、回 JSON。
/// </summary>
public class ArticlesController : Controller
{
	private readonly IArticleService _articleService;
	private readonly IArticleImageService _imageService;
	private readonly ICommentService _commentService;
	private readonly IArticleReactionService _reactionService;
	private readonly IArticleCategoryService _categoryService;

	public ArticlesController(
		IArticleService articleService,
		IArticleImageService imageService,
		ICommentService commentService,
		IArticleReactionService reactionService,
		IArticleCategoryService categoryService)
	{
		_articleService = articleService;
		_imageService = imageService;
		_commentService = commentService;
		_reactionService = reactionService;
		_categoryService = categoryService;
	}

	// GET: /Articles
	public async Task<IActionResult> Index(
		string? keyword, int? categoryId, bool? isActive, string? mode, int? articleId)
	{
		var vm = await BuildIndexVmAsync(keyword, categoryId, isActive, mode, articleId);
		return View(vm);
	}

	// POST: /Articles/CreateAjax  (新增文章 + 上傳圖片,回傳新文章資料給前端畫列)
	[HttpPost]
	public async Task<IActionResult> CreateAjax(int categoryId, string title, string content, List<IFormFile>? files)
	{
		// 建立文章 + 上傳圖片,一次完成(流程封裝在 Service)
		var createResult = await _articleService.CreateWithImagesAsync(
			new ArticleCreateDto
			{
				Title = title,
				ArticleContent = content,
				CategoryId = categoryId,
				IsActive = true,
			},
			files ?? new List<IFormFile>());

		if (!createResult.Success)
			return JsonFail(createResult.Error);

		var newId = createResult.Data;

		// 撈回新文章的顯示資料(查單筆,不撈全表)回傳給前端
		var created = await _articleService.GetListItemByIdAsync(newId);
		var images = await _imageService.GetForArticleAsync(newId);

		return Json(new
		{
			success = true,
			id = newId,
			account = created?.AuthorAccount,
			categoryName = created?.CategoryName,
			title,
			articleContent = content,
			createdAt = created?.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss"),
			images = images.Select(i => new { name = i.ImageName, src = i.Url }).ToList(),
		});
	}

	// POST: /Articles/EditAjax  (編輯文章欄位 + 圖片對帳)
	[HttpPost]
	public async Task<IActionResult> EditAjax(int id, string categoryName, string title, string content,
		List<string>? keptImageNames, List<IFormFile>? files)
	{
		// 分類名稱 → id
		var categories = await _categoryService.GetAllAsync(includeInactive: true);
		var category = categories.FirstOrDefault(c => c.Name == (categoryName ?? "").Trim());
		if (category is null)
			return JsonFail("找不到分類:" + categoryName);

		// 取目前狀態(編輯不改上下架)
		var detail = await _articleService.GetDetailAsync(id);
		if (detail is null)
			return JsonFail("找不到文章。");

		// 更新欄位
		var update = await _articleService.UpdateAsync(new ArticleEditDto
		{
			Id = id,
			Title = title,
			ArticleContent = content,
			CategoryId = category.Id,
			IsActive = detail.IsActive,
		});
		if (!update.Success)
			return JsonFail(update.Error);

		// 圖片對帳(保留的留、移除的刪、新增的傳)
		var reconcile = await _imageService.ReconcileAsync(id,
			keptImageNames ?? new List<string>(), files ?? new List<IFormFile>());
		if (!reconcile.Success)
			return JsonFail("文章已更新,但圖片處理失敗:" + reconcile.Error);

		// 回傳更新後資料(查單筆)
		var updated = await _articleService.GetListItemByIdAsync(id);
		var images = await _imageService.GetForArticleAsync(id);
		return Json(new
		{
			success = true,
			id,
			categoryName = updated?.CategoryName,
			title,
			articleContent = content,
			updatedAt = updated?.UpdatedAt?.ToString("yyyy-MM-dd HH:mm:ss") ?? "",
			images = images.Select(i => new { name = i.ImageName, src = i.Url }).ToList(),
		});
	}

	private IActionResult JsonOk(object? data = null) => Json(new { success = true, data });
	private IActionResult JsonFail(string? message) => Json(new { success = false, message });

	// POST: /Articles/SetActiveAjax  (停用/啟用文章,reason 寫進 admin_comment)
	[HttpPost]
	public async Task<IActionResult> SetActiveAjax(int id, bool isActive, string? reason)
	{
		var r1 = await _articleService.SetActiveAsync(id, isActive);
		if (!r1.Success) return JsonFail(r1.Error);

		if (!string.IsNullOrWhiteSpace(reason))
		{
			var r2 = await _articleService.SetAdminNoteAsync(id, reason);
			if (!r2.Success) return JsonFail(r2.Error);
		}
		return JsonOk();
	
	}

	// POST: /Articles/SetCommentActiveAjax  (停用/啟用留言,reason 寫進 admin_comment)
	[HttpPost]
	public async Task<IActionResult> SetCommentActiveAjax(int commentId, bool isActive, string? reason)
	{
		var r1 = await _commentService.SetActiveAsync(commentId, isActive);
		if (!r1.Success) return JsonFail(r1.Error);

		if (!string.IsNullOrWhiteSpace(reason))
		{
			var r2 = await _commentService.SetAdminNoteAsync(commentId, reason);
			if (!r2.Success) return JsonFail(r2.Error);
		}
		return JsonOk();
	}

	// ---------------- 私有:組裝 Index 頁 ViewModel ----------------

	private async Task<ArticleIndexVm> BuildIndexVmAsync(
		string? keyword, int? categoryId, bool? isActive, string? mode, int? articleId)
	{
		var categories = await _categoryService.GetAllAsync(includeInactive: false);

		var vm = new ArticleIndexVm
		{
			Keyword = keyword,
			CategoryId = categoryId,
			IsActive = isActive,
			Mode = mode,
			Articles = await _articleService.GetListAsync(keyword, categoryId, isActive),
			Categories = categories
				.Select(c => new CategoryOption { Id = c.Id, Name = c.Name })
				.ToList(),
		};

		// 詳情頁的按讚/收藏/留言隱藏節點:一次撈齊目前清單這些文章的資料,交給前端 JS 依 article-id 取用。
		var articleIds = vm.Articles.Select(a => a.Id).ToList();
		var likeRows = await _reactionService.GetLikeRowsAsync(articleIds);
		var saveRows = await _reactionService.GetSaveRowsAsync(articleIds);
		vm.Reactions = likeRows.Concat(saveRows).ToList();
		vm.CommentRows = await _commentService.GetRowsForArticlesAsync(articleIds);

		if (articleId.HasValue)
		{
			vm.Detail = await _articleService.GetDetailAsync(articleId.Value);
			if (vm.Detail is not null)
			{
				vm.EditForm = new ArticleEditVm
				{
					Id = vm.Detail.Id,
					Title = vm.Detail.Title,
					ArticleContent = vm.Detail.ArticleContent,
					CategoryId = vm.Detail.CategoryId,
					IsActive = vm.Detail.IsActive,
				};
				vm.NewComment = new CommentCreateVm { ArticleId = vm.Detail.Id };
			}
		}

		return vm;
	}
}