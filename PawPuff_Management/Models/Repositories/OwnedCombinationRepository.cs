using Microsoft.EntityFrameworkCore;
using PawPuff_Management.Models.DTOs;
using PawPuff_Management.Models.EfModels;

namespace PawPuff_Management.Models.Repositories
{
	public interface IOwnedCombinationRepository
	{
		Task<List<OwnedCombinationDto>> GetAllAsync(
			CancellationToken cancellationToken = default);
	}

	public class OwnedCombinationRepository : IOwnedCombinationRepository
	{
		private readonly PawPuffContext _context;

		public OwnedCombinationRepository(PawPuffContext context)
		{
			_context = context;
		}

		public async Task<List<OwnedCombinationDto>> GetAllAsync(
			CancellationToken cancellationToken = default)
		{
			// Select 投影會讓 EF Core 產生所需 JOIN，不需開啟 lazy loading，
			// 也不需先 Include 所有完整實體。
			return await _context.UserDollConfigs
				.AsNoTracking()
				.OrderBy(config => config.Id)
				.Select(config => new OwnedCombinationDto
				{
					Id = config.Id,
					UserId = config.UserId,
					UserAccount = config.User.Account,

					DollBodyId = config.DollBodyId,
					DollBodyName = config.DollBody.Name,
					DollBodyImageName = config.DollBody.ImageName,

					DollBodyColorId = config.DollBodyColorId,
					DollBodyColorName =
						config.DollBodyColorId.HasValue
							? config.DollBodyColor.Name
							: null,
					DollBodyColorHexCode =
						config.DollBodyColorId.HasValue
							? config.DollBodyColor.HexCode
							: null,

					DollAccessory1Id = config.DollAccessory1Id,
					DollAccessory1Name =
						config.DollAccessory1Id.HasValue
							? config.DollAccessory1.Name
							: null,
					DollAccessory1LineImageName =
						config.DollAccessory1Id.HasValue
							? config.DollAccessory1.LineImageName
							: null,
					DollAccessory1MaskImageName =
						config.DollAccessory1Id.HasValue
							? config.DollAccessory1.MaskImageName
							: null,
					DollAccessory1SortOrder =
						config.DollAccessory1Id.HasValue
							? config.DollAccessory1.SortOrder
							: null,
					DollAccessory1ColorId =
						config.DollAccessory1ColorId,
					DollAccessory1ColorName =
						config.DollAccessory1ColorId.HasValue
							? config.DollAccessory1Color.Name
							: null,
					DollAccessory1ColorHexCode =
						config.DollAccessory1ColorId.HasValue
							? config.DollAccessory1Color.HexCode
							: null,

					DollAccessory2Id = config.DollAccessory2Id,
					DollAccessory2Name =
						config.DollAccessory2Id.HasValue
							? config.DollAccessory2.Name
							: null,
					DollAccessory2LineImageName =
						config.DollAccessory2Id.HasValue
							? config.DollAccessory2.LineImageName
							: null,
					DollAccessory2MaskImageName =
						config.DollAccessory2Id.HasValue
							? config.DollAccessory2.MaskImageName
							: null,
					DollAccessory2SortOrder =
						config.DollAccessory2Id.HasValue
							? config.DollAccessory2.SortOrder
							: null,
					DollAccessory2ColorId =
						config.DollAccessory2ColorId,
					DollAccessory2ColorName =
						config.DollAccessory2ColorId.HasValue
							? config.DollAccessory2Color.Name
							: null,
					DollAccessory2ColorHexCode =
						config.DollAccessory2ColorId.HasValue
							? config.DollAccessory2Color.HexCode
							: null,

					DollAccessory3Id = config.DollAccessory3Id,
					DollAccessory3Name =
						config.DollAccessory3Id.HasValue
							? config.DollAccessory3.Name
							: null,
					DollAccessory3LineImageName =
						config.DollAccessory3Id.HasValue
							? config.DollAccessory3.LineImageName
							: null,
					DollAccessory3MaskImageName =
						config.DollAccessory3Id.HasValue
							? config.DollAccessory3.MaskImageName
							: null,
					DollAccessory3SortOrder =
						config.DollAccessory3Id.HasValue
							? config.DollAccessory3.SortOrder
							: null,
					DollAccessory3ColorId =
						config.DollAccessory3ColorId,
					DollAccessory3ColorName =
						config.DollAccessory3ColorId.HasValue
							? config.DollAccessory3Color.Name
							: null,
					DollAccessory3ColorHexCode =
						config.DollAccessory3ColorId.HasValue
							? config.DollAccessory3Color.HexCode
							: null
				})
				.ToListAsync(cancellationToken);
		}
	}
}
