namespace PawPuff_Management.Models.ViewModels
{
	public class OwnedProductsIndexViewModel
	{
		public List<OwnedProductItemViewModel> Items { get; set; } = new();

		public List<OwnedProductTypeOptionViewModel> ProductTypes { get; set; } = new();

		public int TotalCount => Items.Count;
	}

	public class OwnedProductItemViewModel
	{
		public int Id { get; set; }

		public int UserId { get; set; }

		public string UserAccount { get; set; } = string.Empty;

		public int ProductId { get; set; }

		public string ProductName { get; set; } = string.Empty;

		public int? DollBodyId { get; set; }

		public int? DollAccessoryId { get; set; }

		public int? DollFramesId { get; set; }

		public int? DollColorsId { get; set; }

		public string ProductType { get; set; } = string.Empty;

		public string PreviewKind { get; set; } = "none";

		public string? AssetFileName { get; set; }

		public string? ImageUrl { get; set; }

		public string? HexCode { get; set; }

		public DateTime BoughtAt { get; set; }

		public int PriceSnapshot { get; set; }

		public string BoughtAtDisplay => BoughtAt.ToString("yyyy-MM-dd HH:mm");

		public string AssetLabel =>
			PreviewKind == "color"
				? HexCode ?? "色碼異常"
				: AssetFileName ?? "無可用圖片";
	}

	public class OwnedProductTypeOptionViewModel
	{
		public string Value { get; set; } = string.Empty;

		public string Text { get; set; } = string.Empty;
	}
}
