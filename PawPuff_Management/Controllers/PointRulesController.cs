using Microsoft.AspNetCore.Mvc;
using PawPuff_Management.Models.DTOs;
using PawPuff_Management.Models.Services;

namespace PawPuff_Management.Controllers
{
	public class PointRulesController : Controller
	{
		private readonly IPointRuleService _service;

		public PointRulesController(IPointRuleService service)
		{
			_service = service;
		}

		[HttpGet]
		public async Task<IActionResult> Index(
			CancellationToken cancellationToken)
		{
			var viewModel = await _service.GetIndexViewModelAsync(
				cancellationToken);

			return View(viewModel);
		}

		[HttpPost]
		[ValidateAntiForgeryToken]
		public async Task<IActionResult> Update(
			[FromBody] UpdatePointRuleDto request,
			CancellationToken cancellationToken)
		{
			if (!ModelState.IsValid)
			{
				var message = ModelState.Values
					.SelectMany(value => value.Errors)
					.Select(error => error.ErrorMessage)
					.FirstOrDefault(error => !string.IsNullOrWhiteSpace(error))
					?? "輸入資料不正確。";

				return BadRequest(new
				{
					success = false,
					message
				});
			}

			var result = await _service.UpdateAsync(
				request,
				cancellationToken);

			var response = new
			{
				success = result.Status == PointRuleUpdateStatus.Success,
				message = result.Message,
				rule = result.Rule
			};

			return result.Status switch
			{
				PointRuleUpdateStatus.Success => Ok(response),
				PointRuleUpdateStatus.NotFound => NotFound(response),
				PointRuleUpdateStatus.NotEditable =>
					StatusCode(StatusCodes.Status403Forbidden, response),
				PointRuleUpdateStatus.ValidationFailed =>
					BadRequest(response),
				PointRuleUpdateStatus.UpdateConflict =>
					Conflict(response),
				_ => StatusCode(
					StatusCodes.Status500InternalServerError,
					new
					{
						success = false,
						message = "更新點數規則時發生未預期的錯誤。"
					})
			};
		}
	}
}
