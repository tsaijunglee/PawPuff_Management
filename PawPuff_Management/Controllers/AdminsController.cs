using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PawPuff_Management.Models.DTOs;
using PawPuff_Management.Models.EfModels;
using PawPuff_Management.Models.Services;


namespace PawPuff_Management.Controllers
{

	public class AdminsController : Controller
	{
		private readonly AdminService _service;

		public AdminsController(AdminService service)
		{
			_service = service;
		}



		/// <summary>
		/// 顯示管理員及權限
		/// </summary>
		/// <returns></returns>
		public async Task<IActionResult> Index()
		{
			var model = await _service
					.GetAdminsWithPermissionsAsync();
			return View(model);
		}


		///
		///[HttpGet] : 取得資料、開啟頁面
		///Action:Index、Details、Create
		///
		///[HttpPost] :用來接收表單資料，並新增、修改或刪除資料
		///Action:Create、Edit、Delete、登入
		///









		/// <summary>
		/// 儲存管理員權限。
		/// </summary>
		[HttpPost]
		// 執行方法前先驗證防偽 Token。
		// Token 不存在或不正確時，ASP.NET Core 會直接回傳 400，
		// 方法裡面的程式碼完全不會執行。
		[ValidateAntiForgeryToken]
		public async Task<IActionResult> SavePermissions(

		//從 HTTP request body 的 JSON 讀取資料，轉成 SaveAdminPermissionsRequestDto
		[FromBody]
		SaveAdminPermissionsRequestDto request)
		{
			// 將前端傳來的 request 交給 AdminService。
			// await 表示等待 Service 完成驗證與資料庫儲存。
			var result = await _service.SavePermissionsAsync(request);

			if (!result.IsSuccess) //如果儲存失敗
			{
				return BadRequest(new
				{
					success = false,
					message = result.Message
				});
			}

			//否則儲存成功
			return Ok(new
			{
				success = true,
				message = result.Message
			});
		}



		[HttpPost]
		[ValidateAntiForgeryToken]
		public async Task<IActionResult> Create(
	    [FromBody] 
		CreateAdminDto request)
		{
			if (!ModelState.IsValid)
			{
				var message = ModelState.Values
					.SelectMany(value => value.Errors)
					.Select(error => error.ErrorMessage)
					.FirstOrDefault();

				return BadRequest(new
				{
					success = false,
					message = message ?? "新增資料格式不正確。"
				});
			}

			var result = await _service.CreateAdminAsync(request);

			if (!result.IsSuccess || result.Admin is null)
			{
				return BadRequest(new
				{
					success = false,
					message = result.Message
				});
			}

			return Ok(new
			{
				success = true,
				message = result.Message,
				admin = new
				{
					id = result.Admin.Id,
					account = result.Admin.Account,
					nickname = result.Admin.Nickname,
					email = result.Admin.Email,
					isActive = result.Admin.IsActive,
					createdAt = result.Admin.CreatedAt
				}
			});
		}




	}
}
