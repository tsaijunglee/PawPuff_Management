using Microsoft.AspNetCore.Mvc;
using PawPuff_Management.Models.Services;
using System.Security.Claims;

namespace PawPuff_Management.Models.ViewComponents
{
	public class AdminNotificationViewComponent : ViewComponent
	{
		private readonly INotificationService _notificationService;

		public AdminNotificationViewComponent(
			INotificationService notificationService)
		{
			_notificationService = notificationService;
		}

		public async Task<IViewComponentResult> InvokeAsync()
		{
			if (HttpContext.User.Identity?.IsAuthenticated != true)
			{
				return Content(string.Empty);
			}

			var adminIdText = HttpContext.User.FindFirstValue(
				ClaimTypes.NameIdentifier);

			if (!int.TryParse(adminIdText, out var adminId) || adminId <= 0)
			{
				return Content(string.Empty);
			}

			var viewModel =
				await _notificationService.GetAdminNotificationCenterAsync(
					adminId,
					HttpContext.RequestAborted);

			return View("~/Views/Shared/Notification.cshtml", viewModel);
		}
	}
}
