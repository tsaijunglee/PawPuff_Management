using PawPuff_Management.Models.DTOs;
using PawPuff_Management.Models.Repositories;
using PawPuff_Management.Models.ViewModels;

namespace PawPuff_Management.Models.Services
{
	public interface IOwnedCombinationService
	{
		Task<OwnedCombinationsIndexViewModel> GetIndexViewModelAsync(
			CancellationToken cancellationToken = default);
	}


	public class OwnedCombinationService : IOwnedCombinationService
	{
		private const int BodySortOrder = 4;
		private const string BodyFolder = "tmp/body";
		private const string AccessoryLineFolder =
			"tmp/accessory/line";
		private const string AccessoryMaskFolder =
			"tmp/accessory/mask";

		private readonly IOwnedCombinationRepository _repository;
		private readonly string _publicUrl;

		public OwnedCombinationService(
			IOwnedCombinationRepository repository,
			IConfiguration configuration)
		{
			_repository = repository;

			_publicUrl = configuration["CloudflareR2:PublicUrl"]
				?? throw new InvalidOperationException(
					"尚未設定既有的 CloudflareR2:PublicUrl。");

			if (string.IsNullOrWhiteSpace(_publicUrl))
			{
				throw new InvalidOperationException(
					"既有的 CloudflareR2:PublicUrl 不可為空白。");
			}
		}

		public async Task<OwnedCombinationsIndexViewModel>
			GetIndexViewModelAsync(
				CancellationToken cancellationToken = default)
		{
			var dtos = await _repository.GetAllAsync(cancellationToken);

			return new OwnedCombinationsIndexViewModel
			{
				BodySortOrder = BodySortOrder,
				Items = dtos.Select(CreateItemViewModel).ToList()
			};
		}

		private OwnedCombinationItemViewModel CreateItemViewModel(
			OwnedCombinationDto dto)
		{
			return new OwnedCombinationItemViewModel
			{
				Id = dto.Id,
				UserId = dto.UserId,
				UserAccount = dto.UserAccount,
				Body = new OwnedCombinationBodyViewModel
				{
					Id = dto.DollBodyId,
					Name = dto.DollBodyName,
					ImageName = dto.DollBodyImageName,
					ImageUrl = BuildImageUrl(
						BodyFolder,
						dto.DollBodyImageName)
				},
				BodyColor = CreateColor(
					dto.DollBodyColorId,
					dto.DollBodyColorName,
					dto.DollBodyColorHexCode),
				Accessory1 = CreateAccessory(
					dto.DollAccessory1Id,
					dto.DollAccessory1Name,
					dto.DollAccessory1LineImageName,
					dto.DollAccessory1MaskImageName,
					dto.DollAccessory1SortOrder,
					dto.DollAccessory1ColorId,
					dto.DollAccessory1ColorName,
					dto.DollAccessory1ColorHexCode),
				Accessory2 = CreateAccessory(
					dto.DollAccessory2Id,
					dto.DollAccessory2Name,
					dto.DollAccessory2LineImageName,
					dto.DollAccessory2MaskImageName,
					dto.DollAccessory2SortOrder,
					dto.DollAccessory2ColorId,
					dto.DollAccessory2ColorName,
					dto.DollAccessory2ColorHexCode),
				Accessory3 = CreateAccessory(
					dto.DollAccessory3Id,
					dto.DollAccessory3Name,
					dto.DollAccessory3LineImageName,
					dto.DollAccessory3MaskImageName,
					dto.DollAccessory3SortOrder,
					dto.DollAccessory3ColorId,
					dto.DollAccessory3ColorName,
					dto.DollAccessory3ColorHexCode)
			};
		}

		private OwnedCombinationAccessoryViewModel? CreateAccessory(
			int? id,
			string? name,
			string? lineImageName,
			string? maskImageName,
			int? sortOrder,
			int? colorId,
			string? colorName,
			string? colorHexCode)
		{
			if (!id.HasValue)
			{
				return null;
			}

			var normalizedLineImageName =
				lineImageName?.Trim() ?? string.Empty;
			var normalizedMaskImageName =
				maskImageName?.Trim() ?? string.Empty;

			return new OwnedCombinationAccessoryViewModel
			{
				Id = id.Value,
				Name = name?.Trim() ?? "未命名配件",
				LineImageName = normalizedLineImageName,
				LineImageUrl = BuildImageUrl(
					AccessoryLineFolder,
					normalizedLineImageName),
				MaskImageName = normalizedMaskImageName,
				MaskImageUrl = BuildImageUrl(
					AccessoryMaskFolder,
					normalizedMaskImageName),
				SortOrder = sortOrder ?? 0,
				Color = CreateColor(
					colorId,
					colorName,
					colorHexCode)
			};
		}

		private static OwnedCombinationColorViewModel? CreateColor(
			int? id,
			string? name,
			string? hexCode)
		{
			if (!id.HasValue)
			{
				return null;
			}

			return new OwnedCombinationColorViewModel
			{
				Id = id.Value,
				Name = name?.Trim() ?? "未命名染劑",
				HexCode = NormalizeHexCode(hexCode)
			};
		}

		private static string? NormalizeHexCode(string? hexCode)
		{
			var value = hexCode?.Trim();

			if (value is null ||
				value.Length != 7 ||
				value[0] != '#' ||
				!value.Skip(1).All(Uri.IsHexDigit))
			{
				return null;
			}

			return value.ToUpperInvariant();
		}

		private string BuildImageUrl(
			string folder,
			string imageName)
		{
			if (string.IsNullOrWhiteSpace(imageName))
			{
				return string.Empty;
			}

			if (Uri.TryCreate(
				imageName,
				UriKind.Absolute,
				out var absoluteUrl))
			{
				return absoluteUrl.AbsoluteUri;
			}

			var escapedImagePath = string.Join(
				"/",
				imageName
					.Replace('\\', '/')
					.Split(
						'/',
						StringSplitOptions.RemoveEmptyEntries)
					.Select(Uri.EscapeDataString));

			return
				$"{_publicUrl.TrimEnd('/')}/" +
				$"{folder.Trim('/')}/" +
				escapedImagePath;
		}
	}
}
