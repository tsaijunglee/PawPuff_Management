using Microsoft.AspNetCore.Mvc;
using PawPuff_Management.Models.Services;

namespace PawPuff_Management.Controllers
{
	public class OwnedCombinationsController : Controller
	{
		private readonly IOwnedCombinationService
			_ownedCombinationService;

		public OwnedCombinationsController(
			IOwnedCombinationService ownedCombinationService)
		{
			_ownedCombinationService = ownedCombinationService;
		}

		[HttpGet]
		public async Task<IActionResult> Index(
			CancellationToken cancellationToken)
		{
			var viewModel =
				await _ownedCombinationService.GetIndexViewModelAsync(
					cancellationToken);

			return View(viewModel);
		}
	}
}
