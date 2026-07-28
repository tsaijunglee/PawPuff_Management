using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PawPuff_Management.Models.DTOs;
using PawPuff_Management.Models.Services;
using System.Security.Claims;

namespace PawPuff_Management.Controllers
{
	[Authorize(Policy = "Notification")]
	public class NotificationsController : Controller
	{
		private readonly INotificationService _notificationService;
		private readonly ILogger<NotificationsController> _logger;

		public NotificationsController(
			INotificationService notificationService,
			ILogger<NotificationsController> logger)
		{
			_notificationService = notificationService;
			_logger = logger;
		}

		[HttpGet]
		public async Task<IActionResult> Index(
			CancellationToken cancellationToken)
		{
			var currentAdminId = ResolveCurrentAdminId();

			if (!currentAdminId.HasValue)
			{
				return Unauthorized();
			}

			var viewModel = await _notificationService.GetIndexViewModelAsync(
				currentAdminId.Value,
				cancellationToken);

			return View(viewModel);
		}

		[HttpPost]
		[ValidateAntiForgeryToken]
		public async Task<IActionResult> Send(
			[FromBody] CreateAdminNotificationDto? request,
			CancellationToken cancellationToken)
		{
			if (request is null)
			{
				return BadRequest(new
				{
					success = false,
					persisted = false,
					message = "未收到通知資料。"
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
				var result = await _notificationService.SendAsync(
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
					"An error occurred while sending an admin notification.");

				return StatusCode(
					StatusCodes.Status500InternalServerError,
					new
					{
						success = false,
						persisted = false,
						message = "通知寫入失敗，請稍後再試。"
					});
			}
		}

		private int? ResolveCurrentAdminId()
		{
			var adminIdText = User.FindFirstValue(ClaimTypes.NameIdentifier);

			return int.TryParse(adminIdText, out var adminId) && adminId > 0
				? adminId
				: null;
		}

		private IActionResult ToActionResult(
			NotificationSendResultDto result)
		{
			var errorBody = new
			{
				success = false,
				persisted = false,
				message = result.Message
			};

			return result.Status switch
			{
				NotificationSendStatus.Success
					when result.Notification is not null => Ok(new
					{
						success = true,
						persisted = true,
						message = result.Message,
						notification = result.Notification
					}),

				NotificationSendStatus.ValidationFailed =>
					BadRequest(errorBody),

				NotificationSendStatus.RecipientNotFound =>
					NotFound(errorBody),

				NotificationSendStatus.SenderAdminNotFound =>
					Unauthorized(errorBody),

				NotificationSendStatus.PersistenceFailed =>
					StatusCode(
						StatusCodes.Status500InternalServerError,
						errorBody),

				_ => StatusCode(
					StatusCodes.Status500InternalServerError,
					errorBody)
			};
		}
	}
}
