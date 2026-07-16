using Microsoft.AspNetCore.Mvc;

namespace PawPuff_Management.Controllers
{
	public class AdminsController : Controller
	{
		public IActionResult Index()
		{
			return View();
		}
	}
}
