using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PawPuff_Management.Models.DTOs;
using PawPuff_Management.Models.Services;
using System.Security.Claims;

namespace PawPuff_Management.Controllers
{
	[Authorize]
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
		[Authorize(Policy = "Notification")]
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
		[Authorize(Policy = "Notification")]
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

		[HttpPost]
		[ValidateAntiForgeryToken]
		public async Task<IActionResult> MarkAsRead(
			[FromBody] MarkNotificationReadDto? request,
			CancellationToken cancellationToken)
		{
			if (request is null)
			{
				return BadRequest(new
				{
					success = false,
					message = "未收到通知編號。"
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
					message = firstError ?? "通知編號格式不正確。"
				});
			}

			var currentAdminId = ResolveCurrentAdminId();

			if (!currentAdminId.HasValue)
			{
				return Unauthorized(new
				{
					success = false,
					message = "無法辨識目前登入的管理員。"
				});
			}

			try
			{
				var result = await _notificationService.MarkAsReadAsync(
					request.NotificationId,
					currentAdminId.Value,
					cancellationToken);

				return ToReadActionResult(result);
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
					"An error occurred while marking notification {NotificationId} " +
					"as read for admin {AdminId}.",
					request.NotificationId,
					currentAdminId.Value);

				return StatusCode(
					StatusCodes.Status500InternalServerError,
					new
					{
						success = false,
						message = "更新通知狀態失敗，請稍後再試。"
					});
			}
		}

		[HttpPost]
		[ValidateAntiForgeryToken]
		public async Task<IActionResult> MarkAllAsRead(
			CancellationToken cancellationToken)
		{
			var currentAdminId = ResolveCurrentAdminId();

			if (!currentAdminId.HasValue)
			{
				return Unauthorized(new
				{
					success = false,
					message = "無法辨識目前登入的管理員。"
				});
			}

			try
			{
				var result = await _notificationService.MarkAllAsReadAsync(
					currentAdminId.Value,
					cancellationToken);

				return ToReadActionResult(result);
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
					"An error occurred while marking all notifications " +
					"as read for admin {AdminId}.",
					currentAdminId.Value);

				return StatusCode(
					StatusCodes.Status500InternalServerError,
					new
					{
						success = false,
						message = "更新通知狀態失敗，請稍後再試。"
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

		private IActionResult ToReadActionResult(
			NotificationReadResultDto result)
		{
			var errorBody = new
			{
				success = false,
				message = result.Message
			};

			return result.Status switch
			{
				NotificationReadStatus.Success => Ok(new
				{
					success = true,
					message = result.Message,
					unreadCount = result.UnreadCount
				}),

				NotificationReadStatus.ValidationFailed =>
					BadRequest(errorBody),

				NotificationReadStatus.NotificationNotFound =>
					NotFound(errorBody),

				_ => StatusCode(
					StatusCodes.Status500InternalServerError,
					errorBody)
			};
		}
	}
}
