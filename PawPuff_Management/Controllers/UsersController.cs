using Microsoft.AspNetCore.Mvc;

namespace PawPuff_Management.Controllers
{
	public class UsersController : Controller
	{
		public IActionResult Index()
		{
			return View();
		}
	}
}
