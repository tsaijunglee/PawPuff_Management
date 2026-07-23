using Microsoft.AspNetCore.Mvc;
using PawPuff_Management.Models.Services;

namespace PawPuff_Management.Controllers
{
	public class OwnedProductsController : Controller
	{
		private readonly IOwnedProductService _ownedProductService;

		public OwnedProductsController(
			IOwnedProductService ownedProductService)
		{
			_ownedProductService = ownedProductService;
		}

		[HttpGet]
		public async Task<IActionResult> Index(
			CancellationToken cancellationToken)
		{
			var viewModel =
				await _ownedProductService.GetIndexViewModelAsync(
					cancellationToken);

			return View(viewModel);
		}
	}
}
