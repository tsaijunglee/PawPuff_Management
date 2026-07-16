using Microsoft.AspNetCore.Mvc;

namespace PawPuff_Management.Controllers
{
	public class OwnedProductsController : Controller
	{
		public IActionResult Index()
		{
			return View();
		}
	}
}
