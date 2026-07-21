using Microsoft.EntityFrameworkCore;
using PawPuff_Management.Models.DTOs;
using PawPuff_Management.Models.EfModels;

namespace PawPuff_Management.Models.Repositories
{
	public class CombinationPreviewRepository : ICombinationPreviewRepository
	{

		private readonly PawPuffContext _context;

		public CombinationPreviewRepository(PawPuffContext context)
		{
			_context = context;
		}

		public async Task<CombinationPreviewOptionsDto> GetOptionsAsync(
			CancellationToken cancellationToken = default)
		{
			var bodies = await _context.DollBodies
				.AsNoTracking()
				.OrderBy(body => body.Name)
				.ThenBy(body => body.Id)
				.Select(body => new DollBodyOptionDto
				{
					Id = body.Id,
					Name = body.Name,
					ImageName = body.ImageName
				})
				.ToListAsync(cancellationToken);

			var colors = await _context.DollColors
				.AsNoTracking()
				.OrderBy(color => color.Id)
				.Select(color => new DollColorOptionDto
				{
					Id = color.Id,
					Name = color.Name,
					HexCode = color.HexCode
				})
				.ToListAsync(cancellationToken);

			var accessories = await _context.DollAccessories
				.AsNoTracking()
				.OrderBy(accessory => accessory.SortOrder)
				.ThenBy(accessory => accessory.Name)
				.ThenBy(accessory => accessory.Id)
				.Select(accessory => new DollAccessoryOptionDto
				{
					Id = accessory.Id,
					Name = accessory.Name,
					LineImageName = accessory.LineImageName,
					MaskImageName = accessory.MaskImageName,
					SortOrder = accessory.SortOrder
				})
				.ToListAsync(cancellationToken);

			return new CombinationPreviewOptionsDto
			{
				Bodies = bodies,
				Colors = colors,
				Accessories = accessories
			};
		}
	}
}
