using Microsoft.AspNetCore.Mvc;

namespace PawPuff_Management.Controllers
{
	public class ArticleCategoriesController : Controller
	{
		public IActionResult Index()
		{
			return View();
		}
	}
}
