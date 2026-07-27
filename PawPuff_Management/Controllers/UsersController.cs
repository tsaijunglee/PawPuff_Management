using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PawPuff_Management.Models.DTOs;
using PawPuff_Management.Models.Services;
using System.Security.Claims;

namespace PawPuff_Management.Controllers
{
	//不但要登入，還必須有 Account 權限
	//Policy 必須先在 Program.cs 設定
	[Authorize(Policy = "Account")]
	public class UsersController : Controller
	{
		private readonly UserService _service;
		public UsersController(UserService service)
		{
			_service = service;
		}


		//取得所有會員
		public async Task<IActionResult> Index()
		{
			var users = await _service.GetAllAsync();

			return View(users);
		}





		////權限跳轉
		////  進入 AdminsController.Index()
		////→ 呼叫 HasAccountPermission()
		////→ 有 Account Claim：繼續顯示頁面
		////→ 沒有 Account Claim：return Forbid()
		////→ 導向 AccessDeniedPath

		////例如 AdminsController 的管理員管理需要 Account 權限：
		////檢查 Account 權限
		//private bool HasAccountPermission()
		//{
		//	return User.HasClaim("Permission", "Account");
		//}


		///// <summary>
		///// 顯示管理員及權限
		///// </summary>
		///// <returns></returns>
		//public async Task<IActionResult> Index()
		//{
		//	if (!HasAccountPermission())
		//	{
		//		return Forbid();
		//	}


		//	var model = await _service.GetAdminsWithPermissionsAsync();

		//	return View(model);
		//}










		//[FromBody] 表示從 HTTP Request Body 讀取 JSON，再轉換成 UpdateUserStatusDto
		[HttpPost] //POST /Users/UpdateStatus =>通常用來修改會員的啟用或停用狀態
		[ValidateAntiForgeryToken] //驗證防偽 Token，降低 CSRF 攻擊風險
		public async Task<IActionResult> UpdateStatusAsync(
		   [FromBody] UpdateUserStatusDto request)
		{
			if (!ModelState.IsValid)
			{
				var message = ModelState.Values
					.SelectMany(value => value.Errors)
					.Select(error => error.ErrorMessage)
					.FirstOrDefault()
					?? "會員狀態資料格式不正確。";

				return BadRequest(new
				{
					success = false,
					message
				});
			}
			var adminIdText = User.FindFirstValue(
			   ClaimTypes.NameIdentifier);

			if (!int.TryParse(
				adminIdText,
				out var operatorAdminId))
			{
				return Unauthorized(new
				{
					success = false,
					message = "無法取得目前登入管理員。"
				});
			}
			var result = await _service.UpdateStatusAsync(
				   request,
				   operatorAdminId);

			if (!result.IsSuccess)
			{
				return BadRequest(new
				{
					success = false,
					message = result.Message
				});
			}

			return Json(new
			{
				success = true,
				message = result.Message,
				isActive = request.IsActive
			});
		}



		[HttpPost]
		[ValidateAntiForgeryToken]
		//建立會員
		public async Task<IActionResult> Create(
	[FromBody] CreateUserDto request)
		{
			if (!ModelState.IsValid)
			{
				var message = ModelState.Values
					.SelectMany(value => value.Errors)
					.Select(error => error.ErrorMessage)
					.FirstOrDefault()
					?? "會員資料格式不正確。";

				return BadRequest(new
				{
					success = false,
					message
				});
			}

			var result =
				await _service.CreateUserAsync(request);

			if (!result.IsSuccess ||
				result.User is null)
			{
				return BadRequest(new
				{
					success = false,
					message = result.Message
				});
			}

			var user = result.User;

			return Json(new
			{
				success = true,
				message = result.Message,

				user = new
				{
					id = user.Id,
					account = user.Account,
					nickname = user.Nickname,
					email = user.Email,
					phone = user.Phone,
					pointBalance = user.PointBalance,
					isActive = user.IsActive,
					createdAt = user.CreatedAt
						.ToString("yyyy-MM-dd HH:mm:ss")
				}
			});
		}

	}
}
