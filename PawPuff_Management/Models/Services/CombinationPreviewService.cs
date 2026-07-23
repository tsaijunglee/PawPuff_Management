using PawPuff_Management.Models.Repositories;
using PawPuff_Management.Models.ViewModels;

namespace PawPuff_Management.Models.Services
{
	public interface ICombinationPreviewService
	{
		Task<CombinationPreviewViewModel> GetViewModelAsync(
			CancellationToken cancellationToken = default);
	}

	public class CombinationPreviewService : ICombinationPreviewService
	{
		private const int BodySortOrder = 4;
		private const string BodyFolder = "tmp/body";
		private const string AccessoryLineFolder = "tmp/accessory/line";
		private const string AccessoryMaskFolder = "tmp/accessory/mask";

		private readonly ICombinationPreviewRepository _repository;
		private readonly string _publicUrl;

		public CombinationPreviewService(
			ICombinationPreviewRepository repository,
			IConfiguration configuration)
		{
			_repository = repository;

			_publicUrl = configuration["CloudflareR2:PublicUrl"]
				?? throw new InvalidOperationException(
					"尚未設定 CloudflareR2:PublicUrl。");

			if (string.IsNullOrWhiteSpace(_publicUrl))
			{
				throw new InvalidOperationException(
					"CloudflareR2:PublicUrl 不可為空白。");
			}
		}

		public async Task<CombinationPreviewViewModel> GetViewModelAsync(
			CancellationToken cancellationToken = default)
		{
			var data = await _repository.GetOptionsAsync(cancellationToken);

			return new CombinationPreviewViewModel
			{
				BodySortOrder = BodySortOrder,

				Bodies = data.Bodies
					.Select(body => new DollBodyOptionViewModel
					{
						Id = body.Id,
						Name = body.Name,
						ImageName = body.ImageName,
						ImageUrl = BuildImageUrl(BodyFolder, body.ImageName)
					})
					.ToList(),

				Colors = data.Colors
					.Select(color => new DollColorOptionViewModel
					{
						Id = color.Id,
						Name = color.Name,
						HexCode = color.HexCode
					})
					.ToList(),

				Accessories = data.Accessories
					.Select(accessory => new DollAccessoryOptionViewModel
					{
						Id = accessory.Id,
						Name = accessory.Name,
						LineImageName = accessory.LineImageName,
						LineImageUrl = BuildImageUrl(
							AccessoryLineFolder,
							accessory.LineImageName),
						MaskImageName = accessory.MaskImageName,
						MaskImageUrl = BuildImageUrl(
							AccessoryMaskFolder,
							accessory.MaskImageName),
						SortOrder = accessory.SortOrder
					})
					.ToList()
			};
		}

		private string BuildImageUrl(string folder, string imageName)
		{
			if (string.IsNullOrWhiteSpace(imageName))
			{
				return string.Empty;
			}

			if (Uri.TryCreate(imageName, UriKind.Absolute, out var absoluteUrl))
			{
				return absoluteUrl.AbsoluteUri;
			}

			var escapedImagePath = string.Join(
				"/",
				imageName
					.Replace('\\', '/')
					.Split('/', StringSplitOptions.RemoveEmptyEntries)
					.Select(Uri.EscapeDataString));

			return $"{_publicUrl.TrimEnd('/')}/{folder.Trim('/')}/{escapedImagePath}";
		}
	}
}
