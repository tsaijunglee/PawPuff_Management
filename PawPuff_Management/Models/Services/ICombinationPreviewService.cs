using PawPuff_Management.Models.ViewModels;

namespace PawPuff_Management.Models.Services
{
	public interface ICombinationPreviewService
	{
		Task<CombinationPreviewViewModel> GetViewModelAsync(
			CancellationToken cancellationToken = default);
	}
}
