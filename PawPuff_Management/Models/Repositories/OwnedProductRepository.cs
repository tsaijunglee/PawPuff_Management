using Microsoft.EntityFrameworkCore;
using PawPuff_Management.Models.DTOs;
using PawPuff_Management.Models.EfModels;

namespace PawPuff_Management.Models.Repositories
{
	public interface IOwnedProductRepository
	{
		Task<List<OwnedProductDto>> GetAllAsync(
			CancellationToken cancellationToken = default);
	}

	public class OwnedProductRepository : IOwnedProductRepository
	{
		private readonly PawPuffContext _context;

		public OwnedProductRepository(PawPuffContext context)
		{
			_context = context;
		}

		public async Task<List<OwnedProductDto>> GetAllAsync(
			CancellationToken cancellationToken = default)
		{
			// 使用 Select 投影即可讓 EF Core 產生所需的 JOIN；
			// 不必先 Include 全部實體，也不會啟用 lazy loading。
			return await _context.UserProducts
				.AsNoTracking()
				.OrderBy(userProduct => userProduct.Id)
				.Select(userProduct => new OwnedProductDto
				{
					Id = userProduct.Id,
					UserId = userProduct.UserId,
					UserAccount = userProduct.User.Account,
					ProductId = userProduct.ProductId,
					ProductName = userProduct.Product.Name,

					DollBodyId = userProduct.Product.DollBodyId,
					DollAccessoryId = userProduct.Product.DollAccessoryId,
					DollFramesId = userProduct.Product.DollFramesId,
					DollColorsId = userProduct.Product.DollColorsId,

					DollBodyImageName =
						userProduct.Product.DollBodyId.HasValue
							? userProduct.Product.DollBody.ImageName
							: null,

					DollAccessoryLineImageName =
						userProduct.Product.DollAccessoryId.HasValue
							? userProduct.Product.DollAccessory.LineImageName
							: null,

					DollFrameImageName =
						userProduct.Product.DollFramesId.HasValue
							? userProduct.Product.DollFrames.ImageName
							: null,

					DollColorHexCode =
						userProduct.Product.DollColorsId.HasValue
							? userProduct.Product.DollColors.HexCode
							: null,

					BoughtAt = userProduct.BoughtAt,
					PriceSnapshot = userProduct.PriceSnapshot
				})
				.ToListAsync(cancellationToken);
		}
	}
}
