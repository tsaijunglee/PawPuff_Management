using Microsoft.AspNetCore.Mvc;

namespace PawPuff_Management.Controllers
{
	public class ProfileController : Controller
	{
		public IActionResult Index()
		{
			return View();
		}
	}
}
