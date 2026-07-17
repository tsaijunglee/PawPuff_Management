using Microsoft.AspNetCore.Mvc;

namespace PawPuff_Management.Controllers
{
	public class AuthController : Controller
	{
		public IActionResult Index()
		{
			return View();
		}
	}
}
