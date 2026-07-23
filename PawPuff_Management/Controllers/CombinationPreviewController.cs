using Microsoft.AspNetCore.Mvc;
using PawPuff_Management.Models.Services;

namespace PawPuff_Management.Controllers
{
	public class CombinationPreviewController : Controller
	{
		private readonly ICombinationPreviewService _service;

		public CombinationPreviewController(ICombinationPreviewService service)
		{
			_service = service;
		}

		public async Task<IActionResult> Index(
			CancellationToken cancellationToken)
		{
			var viewModel = await _service.GetViewModelAsync(cancellationToken);

			return View(viewModel);
		}
	}
}
