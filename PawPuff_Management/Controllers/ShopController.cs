using Microsoft.AspNetCore.Mvc;

namespace PawPuff_Management.Controllers
{
	public class ShopController : Controller
	{
		public IActionResult Index()
		{
			return View();
		}
	}
}
