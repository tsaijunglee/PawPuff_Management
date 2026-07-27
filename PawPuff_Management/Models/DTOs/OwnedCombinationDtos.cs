namespace PawPuff_Management.Models.DTOs
{
	public class OwnedCombinationDto
	{
		public int Id { get; set; }

		public int UserId { get; set; }

		public string UserAccount { get; set; } = string.Empty;

		public int DollBodyId { get; set; }

		public string DollBodyName { get; set; } = string.Empty;

		public string DollBodyImageName { get; set; } = string.Empty;

		public int? DollBodyColorId { get; set; }

		public string? DollBodyColorName { get; set; }

		public string? DollBodyColorHexCode { get; set; }

		public int? DollAccessory1Id { get; set; }

		public string? DollAccessory1Name { get; set; }

		public string? DollAccessory1LineImageName { get; set; }

		public string? DollAccessory1MaskImageName { get; set; }

		public int? DollAccessory1SortOrder { get; set; }

		public int? DollAccessory1ColorId { get; set; }

		public string? DollAccessory1ColorName { get; set; }

		public string? DollAccessory1ColorHexCode { get; set; }

		public int? DollAccessory2Id { get; set; }

		public string? DollAccessory2Name { get; set; }

		public string? DollAccessory2LineImageName { get; set; }

		public string? DollAccessory2MaskImageName { get; set; }

		public int? DollAccessory2SortOrder { get; set; }

		public int? DollAccessory2ColorId { get; set; }

		public string? DollAccessory2ColorName { get; set; }

		public string? DollAccessory2ColorHexCode { get; set; }

		public int? DollAccessory3Id { get; set; }

		public string? DollAccessory3Name { get; set; }

		public string? DollAccessory3LineImageName { get; set; }

		public string? DollAccessory3MaskImageName { get; set; }

		public int? DollAccessory3SortOrder { get; set; }

		public int? DollAccessory3ColorId { get; set; }

		public string? DollAccessory3ColorName { get; set; }

		public string? DollAccessory3ColorHexCode { get; set; }
	}
}
