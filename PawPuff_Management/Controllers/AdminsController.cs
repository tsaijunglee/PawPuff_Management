using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PawPuff_Management.Models.DTOs;
using PawPuff_Management.Models.EfModels;
using PawPuff_Management.Models.Services;
using System.Security.Claims;


namespace PawPuff_Management.Controllers
{
	//不但要登入，還必須有 Account 權限
	//Policy 必須先在 Program.cs 設定
	[Authorize(Policy = "Account")]
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
	
			var model = await _service.GetAdminsWithPermissionsAsync();

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
		[ValidateAntiForgeryToken]// 執行方法前先驗證防偽 Token。
								  // Token 不存在或不正確時，ASP.NET Core 會直接回傳 400，
								  // 方法裡面的程式碼完全不會執行。
		//從 HTTP request body 的 JSON 讀取資料，轉成 SaveAdminPermissionsRequestDto
		public async Task<IActionResult> SavePermissions([FromBody]SaveAdminPermissionsRequestDto request)
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
		public async Task<IActionResult> Create([FromBody] CreateAdminDto request)
		{


			if (!ModelState.IsValid)
			{
				var message = ModelState.Values
					.SelectMany(value => value.Errors)
					.Select(error => error.ErrorMessage)
					.FirstOrDefault()
					?? "新增資料格式不正確。";

				return BadRequest(new
				{
					success = false,
					message
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
						.ToString("yyyy-MM-dd HH:mm:ss")
				}
			});
		}



		[HttpPost]
		[ValidateAntiForgeryToken]
		public async Task<IActionResult> UpdateStatus(
	[FromBody] UpdateAdminStatusDto request)
		{


			if (!ModelState.IsValid)
			{
				var message = ModelState.Values
					.SelectMany(value => value.Errors)
					.Select(error => error.ErrorMessage)
					.FirstOrDefault() ?? "狀態資料格式不正確。";

				return BadRequest(new
				{
					success = false,
					message
				});
			}



			//擁有帳號管理權限的人登入後 => 停用會員或者管理員後 => 會相當於 modified_by_admin_id
			// 暫時測試使用，登入完成後要改由 Claim 取得。
			//int operatorAdminId = 1;

			var operatorAdminIdText = User.FindFirstValue(ClaimTypes.NameIdentifier);

			if (!int.TryParse(operatorAdminIdText,out var operatorAdminId) ||operatorAdminId <= 0)
			{
				return Unauthorized(new
				{
					success = false,
					message ="無法識別目前登入的管理員。"
				});
			}


			// 不允許目前登入的管理員停用自己
			if (request.AdminId == operatorAdminId && !request.IsActive)
			{
				return BadRequest(new
				{
					success = false,
					message =
						"不能停用目前登入的管理員帳號。"
				});
			}

			// 通過檢查後，才交給 Service 修改資料庫
			var result =await _service.UpdateStatusAsync(request,operatorAdminId);



			if (!result.IsSuccess)
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
				isActive = request.IsActive
			});
		}



	}
}
