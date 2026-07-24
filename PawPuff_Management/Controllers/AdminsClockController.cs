using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PawPuff_Management.Models.Services;
using System.Security.Claims;

namespace PawPuff_Management.Controllers
{
	[Authorize]
	public class AdminsClockController : Controller
	{
		private readonly AdminClockService _clockservice; //處理：打卡紀錄 ,上班打卡 ,下班打卡
		public AdminsClockController(AdminClockService clockservice)
		{
			_clockservice = clockservice;
		}



		/// <summary>
		/// 顯示所有管理員的打卡紀錄。
		/// 只有 Account 權限可以進入。
		/// 已登入但沒有 Account 權限：回傳 403 &有 Account 權限：查詢所有打卡紀錄
		/// </summary>
		[HttpGet]
		public async Task<IActionResult> Index()
		{
			if (!User.HasClaim(
				"Permission",
				"Account"))
			{
				return Forbid();
			}

			var records =await _clockservice.GetAllRecordsAsync();

			return View(records);
		}


		/// <summary>
		/// 取得目前登入管理員的打卡紀錄。
		/// </summary>
		[HttpGet]
		public async Task<IActionResult> MyClockRecords()
		{
			if (!TryGetCurrentAdminId(
				out var adminId))
			{
				return Unauthorized(new
				{
					success = false,
					message =
						"無法識別目前登入的管理員。"
				});
			}
			var records =
			   await _clockservice.GetRecordsAsync(adminId);

			return Ok(new
			{
				success = true,

				records =records.Select(clock =>
						new
						{
							id = clock.Id,
							workDate =clock.WorkDate.ToString("yyyy-MM-dd"),

							clockIn =clock.ClockInTime.ToString("HH:mm"),

							clockOut =clock.ClockOutTime?.ToString("HH:mm")
						})
			});
		}



		/// <summary>
		/// 目前登入管理員執行上班打卡。
		/// </summary>
		[HttpPost]
		[ValidateAntiForgeryToken]
		public async Task<IActionResult> ClockIn()
		{
			if (!TryGetCurrentAdminId(
				out var adminId))
			{
				return Unauthorized(new
				{
					success = false,
					message = "無法識別目前登入的管理員。"
				});
			}

			var result =await _clockservice.ClockInAsync(adminId);

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

				clock = result.Clock is null
					? null
					: new
					{
						id =
							result.Clock.Id,

						workDate =
							result.Clock
								.WorkDate
								.ToString(
									"yyyy-MM-dd"),

						clockIn =
							result.Clock
								.ClockInTime
								.ToString(
									"HH:mm"),

						clockOut =
							result.Clock
								.ClockOutTime
								?.ToString(
									"HH:mm")
					}
			});
		}

		/// <summary>
		/// 目前登入管理員執行下班打卡。
		/// </summary>
		[HttpPost]
		[ValidateAntiForgeryToken]
		public async Task<IActionResult> ClockOut()
		{
			if (!TryGetCurrentAdminId(
				out var adminId))
			{
				return Unauthorized(new
				{
					success = false,
					message =
						"無法識別目前登入的管理員。"
				});
			}

			var result =await _clockservice.ClockOutAsync(adminId);

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

				clock = result.Clock is null
					? null
					: new
					{
						id =
							result.Clock.Id,

						workDate =
							result.Clock
								.WorkDate
								.ToString(
									"yyyy-MM-dd"),

						clockIn =
							result.Clock
								.ClockInTime
								.ToString(
									"HH:mm"),

						clockOut =
							result.Clock
								.ClockOutTime
								?.ToString(
									"HH:mm")
					}
			});
		}


		/// <summary>
		/// 從登入 Cookie 取得目前管理員 ID。
		/// </summary>
		private bool TryGetCurrentAdminId(out int adminId)
		{
			var adminIdText =User.FindFirstValue(ClaimTypes.NameIdentifier);

			return int.TryParse(adminIdText,out adminId) && adminId > 0;
		}
	}
}























		





