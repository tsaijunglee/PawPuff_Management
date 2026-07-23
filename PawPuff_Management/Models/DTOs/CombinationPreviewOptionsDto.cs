namespace PawPuff_Management.Models.DTOs
{
	public class DollBodyOptionDto
	{
		public int Id { get; set; }

		public string Name { get; set; } = string.Empty;

		public string ImageName { get; set; } = string.Empty;
	}

	public class DollColorOptionDto
	{
		public int Id { get; set; }

		public string Name { get; set; } = string.Empty;

		public string HexCode { get; set; } = string.Empty;
	}

	public class DollAccessoryOptionDto
	{
		public int Id { get; set; }

		public string Name { get; set; } = string.Empty;

		public string LineImageName { get; set; } = string.Empty;

		public string MaskImageName { get; set; } = string.Empty;

		public int SortOrder { get; set; }
	}

	public class CombinationPreviewOptionsDto
	{
		public List<DollBodyOptionDto> Bodies { get; set; } = new();

		public List<DollColorOptionDto> Colors { get; set; } = new();

		public List<DollAccessoryOptionDto> Accessories { get; set; } = new();
	}

}
