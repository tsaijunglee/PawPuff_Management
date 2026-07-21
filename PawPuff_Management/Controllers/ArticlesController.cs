using Microsoft.AspNetCore.Mvc;
using PawPuff_Management.Models.Dtos;
using PawPuff_Management.Models.DTOs;
using PawPuff_Management.Models.Services;
using PawPuff_Management.ViewModels.Article;

namespace PawPuff_Management.Controllers;
#nullable enable

/// <summary>
/// 文章後台:所有功能(文章 CRUD、圖片、留言、按讚、收藏)都在這一個 Controller、
/// 一個 Index 頁上完成。頁面採「清單 + 明細面板」:選一篇文章(?articleId=)就在同頁
/// 展開它的編輯 / 圖片 / 留言 / 讚收藏管理。所有動作都是表單 post 後導回同頁(PRG)。
/// Controller 保持薄:轉呼叫 Service、依 ServiceResult 給訊息、導頁。
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

	// ---------------- 文章 CRUD ----------------

	// POST: /Articles/Create
	[HttpPost]
	[ValidateAntiForgeryToken]
	public async Task<IActionResult> Create(ArticleCreateVm createForm)
	{
		if (!ModelState.IsValid)
		{
			var vm = await BuildIndexVmAsync(null, null, null, mode: "create", articleId: null);
			vm.CreateForm = createForm;
			return View(nameof(Index), vm);
		}

		var result = await _articleService.CreateAsync(new ArticleCreateDto
		{
			Title = createForm.Title,
			ArticleContent = createForm.ArticleContent,
			CategoryId = createForm.CategoryId,
			IsActive = createForm.IsActive,
		});

		if (!result.Success)
		{
			ModelState.AddModelError(string.Empty, result.Error!);
			var vm = await BuildIndexVmAsync(null, null, null, mode: "create", articleId: null);
			vm.CreateForm = createForm;
			return View(nameof(Index), vm);
		}

		TempData["Success"] = "文章已新增。可在下方面板繼續上傳圖片。";
		// 導到新文章的明細面板,方便馬上加圖片 / 看留言。
		return RedirectToAction(nameof(Index), new { articleId = result.Data });
	}

	// POST: /Articles/Edit
	[HttpPost]
	[ValidateAntiForgeryToken]
	public async Task<IActionResult> Edit(ArticleEditVm editForm)
	{
		if (!ModelState.IsValid)
		{
			var vm = await BuildIndexVmAsync(null, null, null, mode: null, articleId: editForm.Id);
			vm.EditForm = editForm;
			return View(nameof(Index), vm);
		}

		var result = await _articleService.UpdateAsync(new ArticleEditDto
		{
			Id = editForm.Id,
			Title = editForm.Title,
			ArticleContent = editForm.ArticleContent,
			CategoryId = editForm.CategoryId,
			IsActive = editForm.IsActive,
		});

		if (!result.Success)
		{
			ModelState.AddModelError(string.Empty, result.Error!);
			var vm = await BuildIndexVmAsync(null, null, null, mode: null, articleId: editForm.Id);
			vm.EditForm = editForm;
			return View(nameof(Index), vm);
		}

		TempData["Success"] = "文章已更新。";
		return RedirectToAction(nameof(Index), new { articleId = editForm.Id });
	}

	// POST: /Articles/SetActive
	[HttpPost]
	[ValidateAntiForgeryToken]
	public async Task<IActionResult> SetActive(int id, bool isActive)
	{
		var result = await _articleService.SetActiveAsync(id, isActive);
		SetFlash(result.Success, result.Success ? (isActive ? "文章已上架。" : "文章已下架。") : result.Error);
		return RedirectToAction(nameof(Index), new { articleId = id });
	}

	// POST: /Articles/SetAdminNote
	[HttpPost]
	[ValidateAntiForgeryToken]
	public async Task<IActionResult> SetAdminNote(int id, string? adminComment)
	{
		var result = await _articleService.SetAdminNoteAsync(id, adminComment);
		SetFlash(result.Success, result.Success ? "已更新管理員備註。" : result.Error);
		return RedirectToAction(nameof(Index), new { articleId = id });
	}

	// ---------------- 圖片 ----------------

	// POST: /Articles/UploadImages
	[HttpPost]
	[ValidateAntiForgeryToken]
	public async Task<IActionResult> UploadImages(int articleId, List<IFormFile> files)
	{
		var result = await _imageService.UploadAsync(articleId, files);
		SetFlash(result.Success, result.Success ? "圖片已上傳。" : result.Error);
		return RedirectToAction(nameof(Index), new { articleId });
	}

	// POST: /Articles/DeleteImage
	[HttpPost]
	[ValidateAntiForgeryToken]
	public async Task<IActionResult> DeleteImage(int imageId, int articleId)
	{
		var result = await _imageService.DeleteAsync(imageId);
		SetFlash(result.Success, result.Success ? "圖片已刪除(R2 檔案保留)。" : result.Error);
		return RedirectToAction(nameof(Index), new { articleId });
	}

	// ---------------- 留言 ----------------

	// POST: /Articles/AddComment
	[HttpPost]
	[ValidateAntiForgeryToken]
	public async Task<IActionResult> AddComment(int articleId, int? parentCommentId, string commentContent)
	{
		var result = await _commentService.AddAsync(new CommentCreateDto
		{
			ArticleId = articleId,
			ParentCommentId = parentCommentId,
			CommentContent = commentContent,
		});
		SetFlash(result.Success, result.Success ? "留言已送出。" : result.Error);
		return RedirectToAction(nameof(Index), new { articleId });
	}

	// POST: /Articles/SetCommentActive
	[HttpPost]
	[ValidateAntiForgeryToken]
	public async Task<IActionResult> SetCommentActive(int commentId, bool isActive, int articleId)
	{
		var result = await _commentService.SetActiveAsync(commentId, isActive);
		SetFlash(result.Success, result.Success ? (isActive ? "留言已顯示。" : "留言已隱藏。") : result.Error);
		return RedirectToAction(nameof(Index), new { articleId });
	}

	// POST: /Articles/SetCommentAdminNote
	[HttpPost]
	[ValidateAntiForgeryToken]
	public async Task<IActionResult> SetCommentAdminNote(int commentId, string? adminComment, int articleId)
	{
		var result = await _commentService.SetAdminNoteAsync(commentId, adminComment);
		SetFlash(result.Success, result.Success ? "已更新留言的管理員備註。" : result.Error);
		return RedirectToAction(nameof(Index), new { articleId });
	}

	// ---------------- 按讚 / 收藏(以目前使用者身分)----------------

	// POST: /Articles/ToggleLike
	[HttpPost]
	[ValidateAntiForgeryToken]
	public async Task<IActionResult> ToggleLike(int articleId)
	{
		var result = await _reactionService.ToggleLikeAsync(articleId);
		SetFlash(result.Success, result.Success ? (result.Data ? "已按讚。" : "已取消讚。") : result.Error);
		return RedirectToAction(nameof(Index), new { articleId });
	}

	// POST: /Articles/ToggleSave
	[HttpPost]
	[ValidateAntiForgeryToken]
	public async Task<IActionResult> ToggleSave(int articleId)
	{
		var result = await _reactionService.ToggleSaveAsync(articleId);
		SetFlash(result.Success, result.Success ? (result.Data ? "已收藏。" : "已取消收藏。") : result.Error);
		return RedirectToAction(nameof(Index), new { articleId });
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

	private void SetFlash(bool success, string? message)
	{
		if (string.IsNullOrEmpty(message)) return;
		TempData[success ? "Success" : "Error"] = message;
	}
}
