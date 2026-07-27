using Microsoft.AspNetCore.Mvc;
using PawPuff_Management.Models.Dtos;
using PawPuff_Management.Models.Services;
using PawPuff_Management.ViewModels.ArticleCategory;

namespace PawPuff_Management.Controllers;
#nullable enable

/// <summary>
/// 分類管理:全部收在一個 Index 頁。新增用頁面上方的表單;編輯用 ?editId= 帶出編輯卡片。
/// 注意:換成「單一 Index」只動了這個 Controller 與 Index.cshtml,
/// 下面的 Service / Repository / DTO / ViewModel 完全沒改 —— 這就是分層的好處。
/// </summary>
public class ArticleCategoriesController : Controller
{
	private readonly IArticleCategoryService _categoryService;

	public ArticleCategoriesController(IArticleCategoryService categoryService)
	{
		_categoryService = categoryService;
	}

	// GET: /ArticleCategories  (editId 有值時,一併帶出該筆的編輯表單)
	public async Task<IActionResult> Index(int? editId)
	{
		var vm = await BuildIndexVmAsync(editId);
		return View(vm);
	}

	// POST: /ArticleCategories/Create
	[HttpPost]
	[ValidateAntiForgeryToken]
	public async Task<IActionResult> Create(ArticleCategoryCreateVm createForm)
	{
		if (!ModelState.IsValid)
		{
			var vm = await BuildIndexVmAsync(null);
			vm.CreateForm = createForm;
			return View(nameof(Index), vm);
		}

		var result = await _categoryService.CreateAsync(createForm.ToDto());
		if (!result.Success)
		{
			ModelState.AddModelError("CreateForm.Name", result.Error!);
			var vm = await BuildIndexVmAsync(null);
			vm.CreateForm = createForm;
			return View(nameof(Index), vm);
		}

		TempData["Success"] = "分類已新增。";
		return RedirectToAction(nameof(Index));
	}

	// POST: /ArticleCategories/Edit
	[HttpPost]
	[ValidateAntiForgeryToken]
	public async Task<IActionResult> Edit(ArticleCategoryEditVm editForm)
	{
		if (!ModelState.IsValid)
		{
			var vm = await BuildIndexVmAsync(editForm.Id);
			vm.EditForm = editForm;
			return View(nameof(Index), vm);
		}

		var result = await _categoryService.UpdateAsync(editForm.ToDto());
		if (!result.Success)
		{
			ModelState.AddModelError("EditForm.Name", result.Error!);
			var vm = await BuildIndexVmAsync(editForm.Id);
			vm.EditForm = editForm;
			return View(nameof(Index), vm);
		}

		TempData["Success"] = "分類已更新。";
		return RedirectToAction(nameof(Index));
	}

	// POST: /ArticleCategories/SetActive
	[HttpPost]
	[ValidateAntiForgeryToken]
	public async Task<IActionResult> SetActive(int id, bool isActive)
	{
		var result = await _categoryService.SetActiveAsync(id, isActive);
		TempData[result.Success ? "Success" : "Error"] =
			result.Success ? (isActive ? "分類已啟用。" : "分類已停用。") : result.Error;
		return RedirectToAction(nameof(Index));
	}

	private async Task<ArticleCategoryIndexVm> BuildIndexVmAsync(int? editId)
	{
		var dtos = await _categoryService.GetAllAsync(includeInactive: true);

		var vm = new ArticleCategoryIndexVm
		{
			Items = dtos.Select(d => d.ToIndexItemVm()).ToList(),
		};

		if (editId.HasValue)
		{
			var target = await _categoryService.GetByIdAsync(editId.Value);
			if (target is not null)
				vm.EditForm = target.ToEditVm();
		}

		return vm;
	}

	// POST: /ArticleCategories/CreateAjax
	[HttpPost]
	public async Task<IActionResult> CreateAjax(string name)
	{
		var result = await _categoryService.CreateAsync(new ArticleCategoryCreateDto { Name = name, IsActive = true });
		if (!result.Success) return Json(new { success = false, message = result.Error });
		return Json(new { success = true, id = result.Data, name = (name ?? "").Trim() });
	}

	// POST: /ArticleCategories/SetActiveAjax
	[HttpPost]
	public async Task<IActionResult> SetActiveAjax(int id, bool isActive)
	{
		var result = await _categoryService.SetActiveAsync(id, isActive);
		return Json(new { success = result.Success, message = result.Success ? null : result.Error });
	}
}
