using Microsoft.AspNetCore.Mvc;

namespace PawPuff_Management.Controllers
{
	public class ArticlesController : Controller
	{
		public IActionResult Index()
		{
			return View();
		}
	}
}
