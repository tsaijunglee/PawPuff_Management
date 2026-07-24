using Azure.Core;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PawPuff_Management.Models.DTOs;
using PawPuff_Management.Models.Services;
using System.Net;
using System.Security.Claims;

namespace PawPuff_Management.Controllers
{
	[Authorize]
	public class ProfileController : Controller
	{
		private readonly AdminService _service;

		public ProfileController(AdminService service)
		{
			_service = service;
		}


//		JavaScript fetch()
//→ POST /Profile/Update
//→ 驗證防偽 Token
//→ 從登入 Cookie 取得 AdminId
//→ 驗證暱稱與密碼
//→ 呼叫 Service 更新資料庫
//→ 回傳 JSON



		[HttpGet]
		public async Task<IActionResult> Index()
		{
			var adminIdText =
				User.FindFirstValue(
					ClaimTypes.NameIdentifier);

			if (!int.TryParse(
				adminIdText,
				out var adminId))
			{
				return Unauthorized();
			}

			var model = await _service.GetProfileAsync(adminId);

			if (model is null)
			{
				return NotFound(
					"找不到目前登入的管理員資料。");
			}

			return View(model);

		}

		[HttpPost]
		//用來防止其他網站冒用目前管理員的登入狀態，偷偷送出修改資料請求
		[ValidateAntiForgeryToken]
		//[FromBody] 表示從 HTTP Request Body 讀取 JSON
		public async Task<IActionResult> Update([FromBody] UpdateAdminProfileDto request)
		{
			// 從登入 Cookie 取得目前登入管理員 ID , 例如登入的是管理員 3：NameIdentifier = 3
			var adminIdText = User.FindFirstValue(ClaimTypes.NameIdentifier);

			//將資料庫的 Admin.Id  => 轉成string 
			//失敗可能表示：尚未登入 /Cookie 不完整 /登入時沒有建立 NameIdentifier /Claim 內容不是數字
			if (!int.TryParse(adminIdText,out var adminId))
			{
				return Unauthorized(new{success = false, message ="無法識別目前登入的管理員。"});
				// retrun 401 Unauthorized
			}


			//驗證 DTO
			// 驗證 UpdateAdminProfileDto
			if (!ModelState.IsValid) //驗證沒過
			{
				var message =ModelState.Values
					    .SelectMany(value =>value.Errors)
						.Select(error =>error.ErrorMessage)
						.FirstOrDefault()
					?? "個人資料格式不正確。";

				return BadRequest(new
				{
					success = false,
					message
				});
			}

			// 呼叫 Service 更新資料庫
			var result =
				await _service.UpdateProfileAsync(
					adminId,
					request);

			if (!result.IsSuccess)
			{
				return BadRequest(new
				{
					success = false,
					message = result.Message
				});
			}
			// 保留目前登入者原本的所有 Claims，
			// 但移除舊的 Nickname Claim。
			var claims = User.Claims
				.Where(claim =>
					claim.Type != "Nickname")
				.ToList();

			// 加入修改後的新暱稱。
			claims.Add(
				new Claim(
					"Nickname",
					request.Nickname.Trim()
				)
			);

			// 使用更新後的 Claims 建立新身分。
			var identity =
				new ClaimsIdentity(
					claims,
					CookieAuthenticationDefaults
						.AuthenticationScheme
				);

			var principal = new ClaimsPrincipal(identity);

			// 重新寫入登入 Cookie。
			await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme,principal,
				new AuthenticationProperties
				{
					IsPersistent = false,
					AllowRefresh = true
				}
			);


			return Ok(new
			{
				success = true,
				message = result.Message,

				profile = new
				{
					nickname = request.Nickname.Trim()
				}
			});
		}


	}
}