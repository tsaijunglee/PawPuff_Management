using Microsoft.AspNetCore.Mvc;

namespace PawPuff_Management.Controllers
{
	public class ErrorController : Controller
	{
		public IActionResult AccessDenied()
		{
			return View();
		}
	}
}
