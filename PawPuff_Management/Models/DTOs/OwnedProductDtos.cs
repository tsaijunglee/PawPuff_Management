namespace PawPuff_Management.Models.DTOs
{
	public class OwnedProductDto
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

		public string? DollBodyImageName { get; set; }

		public string? DollAccessoryLineImageName { get; set; }

		public string? DollFrameImageName { get; set; }

		public string? DollColorHexCode { get; set; }

		public DateTime BoughtAt { get; set; }

		public int PriceSnapshot { get; set; }
	}
}
