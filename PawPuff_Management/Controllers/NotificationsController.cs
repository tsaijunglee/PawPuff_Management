using Microsoft.AspNetCore.Mvc;

namespace PawPuff_Management.Controllers
{
	public class NotificationsController : Controller
	{
		public IActionResult Index()
		{
			return View();
		}
	}
}
