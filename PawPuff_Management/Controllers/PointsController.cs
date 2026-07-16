using Microsoft.AspNetCore.Mvc;

namespace PawPuff_Management.Controllers
{
	public class PointsController : Controller
	{
		public IActionResult Index()
		{
			return View();
		}
	}
}
