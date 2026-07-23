using PawPuff_Management.Models.DTOs;
using PawPuff_Management.Models.Repositories;
using PawPuff_Management.Models.ViewModels;

namespace PawPuff_Management.Models.Services
{
	public interface IOwnedProductService
	{
		Task<OwnedProductsIndexViewModel> GetIndexViewModelAsync(
			CancellationToken cancellationToken = default);
	}

	public class OwnedProductService : IOwnedProductService
	{
		// 依需求直接封裝在本頁自己的 Service，不修改 appsettings 或既有 Service。
		private const string BodyImageBaseUrl =
			"https://pub-934f327ae0484cf6a6beb8efb5112015.r2.dev/tmp/body/";

		private const string AccessoryLineImageBaseUrl =
			"https://pub-934f327ae0484cf6a6beb8efb5112015.r2.dev/tmp/accessory/line/";

		private const string FrameImageBaseUrl =
			"https://pub-934f327ae0484cf6a6beb8efb5112015.r2.dev/tmp/frame/";

		private const string BodyType = "底圖";
		private const string AccessoryType = "配件";
		private const string FrameType = "頭像框";
		private const string ColorType = "染劑";
		private const string InvalidType = "資料異常";

		private readonly IOwnedProductRepository _repository;

		public OwnedProductService(IOwnedProductRepository repository)
		{
			_repository = repository;
		}

		public async Task<OwnedProductsIndexViewModel> GetIndexViewModelAsync(
			CancellationToken cancellationToken = default)
		{
			var dtos = await _repository.GetAllAsync(cancellationToken);

			return new OwnedProductsIndexViewModel
			{
				Items = dtos
					.Select(CreateItemViewModel)
					.ToList(),
				ProductTypes = CreateProductTypeOptions()
			};
		}

		private static OwnedProductItemViewModel CreateItemViewModel(
			OwnedProductDto dto)
		{
			var productType = ResolveProductType(dto);
			var assetFileName = ResolveAssetFileName(dto, productType);
			var hexCode = productType == ColorType
				? NormalizeHexCode(dto.DollColorHexCode)
				: null;

			var imageUrl = productType switch
			{
				BodyType => BuildImageUrl(BodyImageBaseUrl, assetFileName),
				AccessoryType => BuildImageUrl(
					AccessoryLineImageBaseUrl,
					assetFileName),
				FrameType => BuildImageUrl(FrameImageBaseUrl, assetFileName),
				_ => null
			};

			var previewKind = productType switch
			{
				ColorType when hexCode is not null => "color",
				BodyType or AccessoryType or FrameType
					when imageUrl is not null => "image",
				_ => "none"
			};

			return new OwnedProductItemViewModel
			{
				Id = dto.Id,
				UserId = dto.UserId,
				UserAccount = dto.UserAccount,
				ProductId = dto.ProductId,
				ProductName = dto.ProductName,
				DollBodyId = dto.DollBodyId,
				DollAccessoryId = dto.DollAccessoryId,
				DollFramesId = dto.DollFramesId,
				DollColorsId = dto.DollColorsId,
				ProductType = productType,
				PreviewKind = previewKind,
				AssetFileName = assetFileName,
				ImageUrl = imageUrl,
				HexCode = hexCode,
				BoughtAt = dto.BoughtAt,
				PriceSnapshot = dto.PriceSnapshot
			};
		}

		private static string ResolveProductType(OwnedProductDto dto)
		{
			var referenceCount =
				(dto.DollBodyId.HasValue ? 1 : 0) +
				(dto.DollAccessoryId.HasValue ? 1 : 0) +
				(dto.DollFramesId.HasValue ? 1 : 0) +
				(dto.DollColorsId.HasValue ? 1 : 0);

			// 正常資料應剛好只有一個商品明細外鍵。
			if (referenceCount != 1)
			{
				return InvalidType;
			}

			if (dto.DollBodyId.HasValue) return BodyType;
			if (dto.DollAccessoryId.HasValue) return AccessoryType;
			if (dto.DollFramesId.HasValue) return FrameType;
			return ColorType;
		}

		private static string? ResolveAssetFileName(OwnedProductDto dto, string productType)
		{
			return productType switch
			{
				BodyType => NormalizeFileName(dto.DollBodyImageName),
				AccessoryType => NormalizeFileName(
					dto.DollAccessoryLineImageName),
				FrameType => NormalizeFileName(dto.DollFrameImageName),
				_ => null
			};
		}

		private static string? NormalizeFileName(string? fileName)
		{
			return string.IsNullOrWhiteSpace(fileName)
				? null
				: fileName.Trim();
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

		private static string? BuildImageUrl(string baseUrl, string? fileName)
		{
			return fileName is null
				? null
				: baseUrl + Uri.EscapeDataString(fileName);
		}

		private static List<OwnedProductTypeOptionViewModel> CreateProductTypeOptions()
		{
			return new List<OwnedProductTypeOptionViewModel>
			{
				new() { Value = BodyType, Text = BodyType },
				new() { Value = AccessoryType, Text = AccessoryType },
				new() { Value = FrameType, Text = FrameType },
				new() { Value = ColorType, Text = ColorType }
			};
		}
	}
}
