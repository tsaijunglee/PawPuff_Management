using Microsoft.AspNetCore.Mvc;
using PawPuff_Management.Models.DTOs;
using PawPuff_Management.Models.Services;

namespace PawPuff_Management.Controllers
{
	public class PointsController : Controller
	{
		// TODO [登入串接]
		// 目前已知測試資料為 admins.id = 1、admins.account = admin01，
		// 因此尚未串接登入時，在 Development 環境暫時以 Admin.Id = 1 寫入
		// point_transactions.modified_by_admin_id。
		// 正式登入完成後應移除這個 fallback，改由登入 Cookie / Claims 提供 Admin.Id。
		private const int DevelopmentFallbackAdminId = 1;

		private readonly IPointService _pointService;
		private readonly IWebHostEnvironment _environment;
		private readonly ILogger<PointsController> _logger;

		public PointsController(
			IPointService pointService,
			IWebHostEnvironment environment,
			ILogger<PointsController> logger)
		{
			_pointService = pointService;
			_environment = environment;
			_logger = logger;
		}

		[HttpGet]
		public async Task<IActionResult> Index(
			CancellationToken cancellationToken)
		{
			var viewModel = await _pointService.GetIndexViewModelAsync(
				cancellationToken);

			return View(viewModel);
		}

		[HttpPost]
		[ValidateAntiForgeryToken]
		public async Task<IActionResult> Create(
			[FromBody] CreatePointTransactionDto? request,
			CancellationToken cancellationToken)
		{
			if (request is null)
			{
				return BadRequest(new
				{
					success = false,
					persisted = false,
					message = "未收到新增資料。"
				});
			}

			if (!ModelState.IsValid)
			{
				var firstError = ModelState.Values
					.SelectMany(value => value.Errors)
					.Select(error => error.ErrorMessage)
					.FirstOrDefault(message => !string.IsNullOrWhiteSpace(message));

				return BadRequest(new
				{
					success = false,
					persisted = false,
					message = firstError ?? "輸入資料格式不正確。"
				});
			}

			try
			{
				var result = await _pointService.CreateTransactionAsync(
					request,
					ResolveCurrentAdminId(),
					cancellationToken);

				return ToActionResult(result);
			}
			catch (OperationCanceledException)
				when (cancellationToken.IsCancellationRequested)
			{
				throw;
			}
			catch (Exception exception)
			{
				_logger.LogError(
					exception,
					"An error occurred while creating a point transaction.");

				return StatusCode(StatusCodes.Status500InternalServerError, new
				{
					success = false,
					persisted = false,
					message = "資料庫寫入失敗，請稍後再試。"
				});
			}
		}

		private int? ResolveCurrentAdminId()
		{
			// TODO [登入串接]
			// 建立管理員登入 Cookie 時，建議把 Admin.Id 存進名為 AdminId 的 Claim；
			// 也可使用標準 ClaimTypes.NameIdentifier。不要只依賴可被更名的 account。
			var adminIdText = User.FindFirst("AdminId")?.Value
				?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

			if (int.TryParse(adminIdText, out var adminId) && adminId > 0)
			{
				return adminId;
			}

			if (_environment.IsDevelopment())
			{
				_logger.LogWarning(
					"No authenticated AdminId claim was found. " +
					"Development fallback AdminId {AdminId} is being used. " +
					"The current test-data assumption is that this ID belongs to admin01.",
					DevelopmentFallbackAdminId);

				return DevelopmentFallbackAdminId;
			}

			return null;
		}

		private IActionResult ToActionResult(
			PointTransactionCreateResultDto result)
		{
			var errorBody = new
			{
				success = false,
				persisted = false,
				message = result.Message
			};

			return result.Status switch
			{
				PointTransactionCreateStatus.Success
					when result.Transaction is not null => Ok(new
					{
						success = true,
						persisted = true,
						message = result.Message,
						transaction = result.Transaction
					}),

				PointTransactionCreateStatus.ValidationFailed =>
					BadRequest(errorBody),

				PointTransactionCreateStatus.UserNotFound or
				PointTransactionCreateStatus.ChangeTypeNotFound or
				PointTransactionCreateStatus.AdminNotFound =>
					NotFound(errorBody),

				PointTransactionCreateStatus.InsufficientBalance or
				PointTransactionCreateStatus.BalanceOverflow or
				PointTransactionCreateStatus.PersistenceFailed =>
					Conflict(errorBody),

				_ => StatusCode(
					StatusCodes.Status500InternalServerError,
					errorBody)
			};
		}
	}
}
