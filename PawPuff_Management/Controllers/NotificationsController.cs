using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace PawPuff_Management.Controllers
{
	[Authorize(Policy = "Notification")]
	public class NotificationsController : Controller
	{
		public IActionResult Index()
		{
			return View();
		}
	}
}
