using PawPuff_Management.Models.DTOs;

namespace PawPuff_Management.Models.Repositories
{
	public interface ICombinationPreviewRepository
	{
		Task<CombinationPreviewOptionsDto> GetOptionsAsync(
			CancellationToken cancellationToken = default);
	}

}
