namespace PawPuff_Management.Models.ViewModels
{
	public class CombinationPreviewViewModel
	{
		public int BodySortOrder { get; set; } = 4;

		public List<DollBodyOptionViewModel> Bodies { get; set; } = new();

		public List<DollColorOptionViewModel> Colors { get; set; } = new();

		public List<DollAccessoryOptionViewModel> Accessories { get; set; } = new();
	}

	public class DollBodyOptionViewModel
	{
		public int Id { get; set; }

		public string Name { get; set; } = string.Empty;

		public string ImageName { get; set; } = string.Empty;

		public string ImageUrl { get; set; } = string.Empty;
	}

	public class DollColorOptionViewModel
	{
		public int Id { get; set; }

		public string Name { get; set; } = string.Empty;

		public string HexCode { get; set; } = string.Empty;
	}

	public class DollAccessoryOptionViewModel
	{
		public int Id { get; set; }

		public string Name { get; set; } = string.Empty;

		public string LineImageName { get; set; } = string.Empty;

		public string LineImageUrl { get; set; } = string.Empty;

		public string MaskImageName { get; set; } = string.Empty;

		public string MaskImageUrl { get; set; } = string.Empty;

		public int SortOrder { get; set; }
	}
}
